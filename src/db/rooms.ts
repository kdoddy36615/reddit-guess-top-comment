import type { SupabaseClient } from '@supabase/supabase-js';
import { generateUniqueRoomCode, type Rng } from '@/lib/rooms/code';
import type { Database } from '@/lib/supabase/database.types';

type Db = SupabaseClient<Database>;

type RoomRow = Database['public']['Tables']['room_metadata']['Row'];

export type RoomMode = 'random' | 'host';
export type RoomStatus = 'lobby' | 'live' | 'ended';

export interface Room {
  code: string;
  host_id: string | null;
  mode: RoomMode;
  max_players: number;
  round_count: number;
  timer_seconds: number;
  status: RoomStatus;
  locked: boolean;
  created_at: string;
  started_at: string | null;
  ended_at: string | null;
}

function toRoom(row: RoomRow): Room {
  return {
    code: row.code,
    host_id: row.host_id,
    mode: row.mode as RoomMode,
    max_players: row.max_players,
    round_count: row.round_count,
    timer_seconds: row.timer_seconds,
    status: row.status as RoomStatus,
    locked: row.locked,
    created_at: row.created_at,
    started_at: row.started_at,
    ended_at: row.ended_at,
  };
}

// ---------------------------------------------------------------------------
// Defaults — `host` rooms can be reconfigured pre-match; `random` rooms are
// locked at these. Centralized so /rooms/create and the matchmaking edge
// function read the same numbers.
// ---------------------------------------------------------------------------
export const DEFAULT_ROUND_COUNT = 8;
export const DEFAULT_TIMER_SECONDS = 30;
export const RANDOM_MAX_PLAYERS = 8;
export const HOST_MAX_PLAYERS = 32;

export interface CreateRoomArgs {
  /** Required for `host` mode; ignored for `random` (server-managed). */
  hostPlayerId?: string | null;
  mode: RoomMode;
  maxPlayers: number;
  /** Defaults respect the mode: `random` is always locked at 8/30. */
  roundCount?: number;
  timerSeconds?: number;
  rng?: Rng;
}

/**
 * Generate a unique 6-char code, insert the room, and (for `host` mode)
 * insert the host as the first `room_players` row.
 */
export async function createRoom(db: Db, args: CreateRoomArgs): Promise<Room> {
  const code = await generateUniqueRoomCode(db, { rng: args.rng });

  const isHostMode = args.mode === 'host';
  const roundCount = isHostMode ? (args.roundCount ?? DEFAULT_ROUND_COUNT) : DEFAULT_ROUND_COUNT;
  const timerSeconds = isHostMode
    ? (args.timerSeconds ?? DEFAULT_TIMER_SECONDS)
    : DEFAULT_TIMER_SECONDS;

  const { data, error } = await db
    .from('room_metadata')
    .insert({
      code,
      host_id: isHostMode ? (args.hostPlayerId ?? null) : null,
      mode: args.mode,
      max_players: args.maxPlayers,
      round_count: roundCount,
      timer_seconds: timerSeconds,
      status: 'lobby',
      locked: false,
    })
    .select()
    .single();
  if (error) throw error;
  if (!data) throw new Error('createRoom: insert returned no row');

  if (isHostMode && args.hostPlayerId) {
    const hp = await db
      .from('room_players')
      .insert({ room_code: code, player_id: args.hostPlayerId });
    if (hp.error && hp.error.code !== '23505') throw hp.error;
  }

  return toRoom(data);
}

export async function getRoom(db: Db, code: string): Promise<Room | null> {
  const { data, error } = await db.from('room_metadata').select('*').eq('code', code).maybeSingle();
  if (error) throw error;
  return data ? toRoom(data) : null;
}

export interface RoomPlayer {
  player_id: string;
  is_kicked: boolean;
  joined_at: string;
  nickname: string | null;
}

/**
 * Fetch the players in a room (including kicked rows so callers can render the
 * 'kicked' chip state). The lobby UI renders one chip per row in `joined_at`
 * order so chips appear in arrival order; presence sync overlays online state.
 */
export async function getRoomPlayers(db: Db, code: string): Promise<RoomPlayer[]> {
  const { data, error } = await db
    .from('room_players')
    .select('player_id, is_kicked, joined_at, players(nickname)')
    .eq('room_code', code)
    .order('joined_at', { ascending: true });
  if (error) throw error;
  if (!data) return [];
  return data.map((row) => {
    const players = row.players as
      | { nickname: string | null }
      | { nickname: string | null }[]
      | null;
    const nickname = Array.isArray(players)
      ? (players[0]?.nickname ?? null)
      : (players?.nickname ?? null);
    return {
      player_id: row.player_id,
      is_kicked: row.is_kicked,
      joined_at: row.joined_at,
      nickname,
    };
  });
}

export type JoinResult =
  | { ok: true }
  | { ok: false; reason: 'not_found' | 'not_in_lobby' | 'locked' | 'full' | 'kicked' };

/**
 * Add a player to a room. Returns a structured result instead of throwing on
 * the expected rejection cases (lock / capacity / kicked) so callers can
 * surface them as 4xx responses without catching exceptions.
 */
export async function joinRoom(
  db: Db,
  args: { code: string; playerId: string },
): Promise<JoinResult> {
  const room = await getRoom(db, args.code);
  if (!room) return { ok: false, reason: 'not_found' };
  if (room.status !== 'lobby') return { ok: false, reason: 'not_in_lobby' };
  if (room.locked) return { ok: false, reason: 'locked' };

  // Has this player already been in the room?
  const { data: existing, error: exErr } = await db
    .from('room_players')
    .select('is_kicked')
    .eq('room_code', args.code)
    .eq('player_id', args.playerId)
    .maybeSingle();
  if (exErr) throw exErr;
  if (existing?.is_kicked) return { ok: false, reason: 'kicked' };
  if (existing) return { ok: true }; // already in, idempotent

  // Capacity check — count active (non-kicked) players.
  const { data: active, error: actErr } = await db
    .from('room_players')
    .select('player_id')
    .eq('room_code', args.code)
    .eq('is_kicked', false);
  if (actErr) throw actErr;
  const activeCount = (active ?? []).length;
  if (activeCount >= room.max_players) return { ok: false, reason: 'full' };

  const { error: insErr } = await db
    .from('room_players')
    .insert({ room_code: args.code, player_id: args.playerId });
  if (insErr) {
    // Concurrent insert is fine — same effect.
    if (insErr.code === '23505') return { ok: true };
    throw insErr;
  }
  return { ok: true };
}

/**
 * Check whether a player is currently a (non-kicked) member of a room. Used
 * by `/r/[code]/play` to gate reconnection — only existing members may
 * re-enter a live match; everyone else lands on the mid-match message.
 */
export async function isRoomMember(
  db: Db,
  args: { code: string; playerId: string },
): Promise<boolean> {
  const { data, error } = await db
    .from('room_players')
    .select('is_kicked')
    .eq('room_code', args.code)
    .eq('player_id', args.playerId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return false;
  return !data.is_kicked;
}

/** Mark a player as kicked. Doesn't delete — keeps the row so they can't rejoin. */
export async function kickPlayer(db: Db, args: { code: string; playerId: string }): Promise<void> {
  const { error } = await db
    .from('room_players')
    .update({ is_kicked: true })
    .eq('room_code', args.code)
    .eq('player_id', args.playerId);
  if (error) throw error;
}

export async function lockRoom(db: Db, args: { code: string; locked: boolean }): Promise<void> {
  const { error } = await db
    .from('room_metadata')
    .update({ locked: args.locked })
    .eq('code', args.code);
  if (error) throw error;
}

export interface UpdateSettingsArgs {
  code: string;
  roundCount?: number;
  timerSeconds?: number;
}

export async function updateSettings(db: Db, args: UpdateSettingsArgs): Promise<void> {
  const patch: { round_count?: number; timer_seconds?: number } = {};
  if (args.roundCount !== undefined) patch.round_count = args.roundCount;
  if (args.timerSeconds !== undefined) patch.timer_seconds = args.timerSeconds;
  if (Object.keys(patch).length === 0) return;
  const { error } = await db.from('room_metadata').update(patch).eq('code', args.code);
  if (error) throw error;
}

/**
 * Lifecycle transitions. Side-effects:
 *   - lobby → live: sets `started_at = now()`.
 *   - live → ended: sets `ended_at = now()`.
 *   - ended → lobby (replay): clears started_at + ended_at.
 * The valid-transition matrix isn't enforced here — that's the route handler's
 * job. This function just writes the state and the corresponding timestamp.
 */
export async function transitionStatus(
  db: Db,
  args: { code: string; status: RoomStatus },
): Promise<void> {
  const patch: Partial<RoomRow> = { status: args.status };
  const now = new Date().toISOString();
  if (args.status === 'live') patch.started_at = now;
  else if (args.status === 'ended') patch.ended_at = now;
  else if (args.status === 'lobby') {
    patch.started_at = null;
    patch.ended_at = null;
  }
  const { error } = await db.from('room_metadata').update(patch).eq('code', args.code);
  if (error) throw error;
}
