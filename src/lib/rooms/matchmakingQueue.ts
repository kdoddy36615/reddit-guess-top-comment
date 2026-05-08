import type { SupabaseClient } from '@supabase/supabase-js';
import { createRoom, joinRoom, RANDOM_MAX_PLAYERS, type Room } from '@/db/rooms';
import type { Database } from '@/lib/supabase/database.types';
import type { Rng } from './code';

type Db = SupabaseClient<Database>;

export const RANDOM_QUEUE_TIMEOUT_MS = 90_000;
export const RANDOM_MIN_PLAYERS_TO_START = 3;

type RoomRow = Database['public']['Tables']['room_metadata']['Row'];

function rowToRoom(row: RoomRow): Room {
  return {
    code: row.code,
    host_id: row.host_id,
    mode: row.mode as Room['mode'],
    max_players: row.max_players,
    round_count: row.round_count,
    timer_seconds: row.timer_seconds,
    status: row.status as Room['status'],
    locked: row.locked,
    created_at: row.created_at,
    started_at: row.started_at,
    ended_at: row.ended_at,
  };
}

export interface AssignOrCreateArgs {
  playerId: string;
  rng?: Rng;
}

export interface AssignOrCreateResult {
  room: Room;
  created: boolean;
}

/**
 * Pick the random-mode lobby that this player should land in, creating a
 * fresh one if none has capacity. Algorithm (from issue #44):
 *
 *   1. If the player is already in a `random`/`lobby`/non-kicked room,
 *      return it (idempotent for repeat clicks from the same player).
 *   2. Otherwise pick the oldest random+lobby+!locked room and try to join.
 *      `joinRoom` enforces capacity atomically; on `full`/`locked` we move
 *      to the next candidate.
 *   3. If no candidate is joinable, create a new random room with locked
 *      defaults (8 max / 8 rounds / 30s timer) and add the caller as the
 *      first player.
 *
 * Concurrency notes: a race between two different players can result in
 * each creating a separate room (both saw "no rooms" before either insert
 * completed). That's not catastrophic — `processExpiredRandomRooms` will
 * cancel any room that fails to reach `RANDOM_MIN_PLAYERS_TO_START` at the
 * 90s mark and re-queue its players, which converges the queue.
 */
export async function assignOrCreate(
  db: Db,
  args: AssignOrCreateArgs,
): Promise<AssignOrCreateResult> {
  const existing = await findActiveRandomMembership(db, args.playerId);
  if (existing) return { room: existing, created: false };

  const { data: candidates, error } = await db
    .from('room_metadata')
    .select('*')
    .eq('mode', 'random')
    .eq('status', 'lobby')
    .eq('locked', false)
    .order('created_at', { ascending: true });
  if (error) throw error;

  for (const row of candidates ?? []) {
    const join = await joinRoom(db, { code: row.code, playerId: args.playerId });
    if (join.ok) {
      const fresh = await db.from('room_metadata').select('*').eq('code', row.code).maybeSingle();
      if (fresh.error) throw fresh.error;
      if (fresh.data) return { room: rowToRoom(fresh.data), created: false };
    }
    // `full` / `locked` / `not_in_lobby` / `kicked` → keep looking.
  }

  const room = await createRoom(db, {
    mode: 'random',
    maxPlayers: RANDOM_MAX_PLAYERS,
    rng: args.rng,
  });
  const join = await joinRoom(db, { code: room.code, playerId: args.playerId });
  if (!join.ok) {
    throw new Error(`assignOrCreate: failed to join newly created room: ${join.reason}`);
  }
  return { room, created: true };
}

/**
 * Backwards-compatible alias — keeps the slice-42 import path working until
 * the route handler is updated. Prefer `assignOrCreate` in new code.
 */
export async function findOrCreateRandomRoom(db: Db, args: AssignOrCreateArgs): Promise<Room> {
  const r = await assignOrCreate(db, args);
  return r.room;
}

async function findActiveRandomMembership(db: Db, playerId: string): Promise<Room | null> {
  const { data: memberships, error } = await db
    .from('room_players')
    .select('room_code')
    .eq('player_id', playerId)
    .eq('is_kicked', false);
  if (error) throw error;
  if (!memberships || memberships.length === 0) return null;

  for (const m of memberships) {
    const { data: room, error: rErr } = await db
      .from('room_metadata')
      .select('*')
      .eq('code', m.room_code)
      .maybeSingle();
    if (rErr) throw rErr;
    if (room && room.mode === 'random' && room.status === 'lobby') {
      return rowToRoom(room);
    }
  }
  return null;
}

export interface ProcessExpiredArgs {
  /** Injectable clock for tests. Defaults to `Date.now`. */
  now?: () => Date;
  /** Injectable rng — passed to `assignOrCreate` for re-queue room creation. */
  rng?: Rng;
}

export interface ProcessExpiredResult {
  /** Codes of rooms that transitioned `lobby → live`. */
  started: string[];
  /** Cancelled rooms with the player ids that were re-queued. */
  cancelled: { code: string; reQueuedPlayers: string[] }[];
}

/**
 * Server-side timer tick. For each random+lobby room older than
 * `RANDOM_QUEUE_TIMEOUT_MS`, either:
 *   - **Start** (≥ `RANDOM_MIN_PLAYERS_TO_START` active players): flip
 *     status to `live` (slice 45's `/r/[code]/play` picks it up from there).
 *   - **Cancel** (< min): collect the player ids, delete the room (cascade
 *     wipes `room_players`), and re-queue each player via `assignOrCreate`.
 *
 * Triggered by the `/api/cron/matchmaking-tick` route handler — wired to
 * an external scheduler (Supabase pg_cron / Vercel cron / cron-job.org) at
 * a cadence of ~5–15s in production. The "or equivalent" of the Edge
 * Function called for in issue #44; the algorithm here doesn't depend on
 * the trigger mechanism.
 */
export async function processExpiredRandomRooms(
  db: Db,
  args: ProcessExpiredArgs = {},
): Promise<ProcessExpiredResult> {
  const now = args.now ? args.now() : new Date();
  const cutoff = new Date(now.getTime() - RANDOM_QUEUE_TIMEOUT_MS).toISOString();

  const { data: rooms, error } = await db
    .from('room_metadata')
    .select('*')
    .eq('mode', 'random')
    .eq('status', 'lobby');
  if (error) throw error;

  const expired = (rooms ?? []).filter((r) => r.created_at <= cutoff);

  const started: string[] = [];
  const cancelled: { code: string; reQueuedPlayers: string[] }[] = [];
  const playersToReQueue: string[] = [];

  for (const room of expired) {
    const { data: members, error: mErr } = await db
      .from('room_players')
      .select('player_id, is_kicked')
      .eq('room_code', room.code)
      .eq('is_kicked', false);
    if (mErr) throw mErr;
    const active = (members ?? []).map((m) => m.player_id);

    if (active.length >= RANDOM_MIN_PLAYERS_TO_START) {
      const upd = await db
        .from('room_metadata')
        .update({ status: 'live', started_at: now.toISOString() })
        .eq('code', room.code);
      if (upd.error) throw upd.error;
      started.push(room.code);
    } else {
      const del = await db.from('room_metadata').delete().eq('code', room.code);
      if (del.error) throw del.error;
      cancelled.push({ code: room.code, reQueuedPlayers: active });
      playersToReQueue.push(...active);
    }
  }

  // Re-queue *after* all expired rooms are processed so a re-queued player
  // can't accidentally land in a sibling room that's about to be cancelled.
  for (const playerId of playersToReQueue) {
    await assignOrCreate(db, { playerId, rng: args.rng });
  }

  return { started, cancelled };
}
