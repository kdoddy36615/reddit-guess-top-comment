import type { SupabaseClient } from '@supabase/supabase-js';
import { createRoom, joinRoom, RANDOM_MAX_PLAYERS, type Room } from '@/db/rooms';
import type { Database } from '@/lib/supabase/database.types';
import type { Rng } from './code';

type Db = SupabaseClient<Database>;

/**
 * Find the first random-mode `lobby` room with capacity, or create one. Joins
 * the player and returns the room they're now in.
 *
 * This is the v1 matchmaker — it does the find-or-create algorithm from the
 * PRD but does NOT implement the 90-second start timer or min-3 cancel/re-queue
 * behavior. Slice 44 wires those onto a server-side timer (edge function or
 * cron). Until then a freshly created random room sits in `lobby` until a
 * later flow advances it.
 *
 * If the chosen room turns out to be full at the moment of join (race with
 * another concurrent matchmaker), we treat that as "create a fresh room" and
 * retry once. Locked / not-in-lobby rooms can't appear here because the query
 * filters them out, but the same fallback handles the unlikely race.
 */
export async function findOrCreateRandomRoom(
  db: Db,
  args: { playerId: string; rng?: Rng },
): Promise<Room> {
  const { data: candidates, error } = await db
    .from('room_metadata')
    .select('code')
    .eq('mode', 'random')
    .eq('status', 'lobby')
    .eq('locked', false)
    .order('created_at', { ascending: true });
  if (error) throw error;

  // Try each candidate from oldest → newest; bail out the moment we find one
  // with capacity (joinRoom enforces capacity atomically).
  for (const row of candidates ?? []) {
    const join = await joinRoom(db, { code: row.code, playerId: args.playerId });
    if (join.ok) {
      const fresh = await db.from('room_metadata').select('*').eq('code', row.code).maybeSingle();
      if (fresh.error) throw fresh.error;
      if (fresh.data) {
        return rowToRoom(fresh.data);
      }
    }
    // `full` / `locked` / `not_in_lobby` / `kicked` → keep looking. Anything
    // else bubbles up.
  }

  // No joinable room — create a fresh one with random-mode defaults and
  // join the caller as the first player.
  const room = await createRoom(db, {
    mode: 'random',
    maxPlayers: RANDOM_MAX_PLAYERS,
    rng: args.rng,
  });
  const join = await joinRoom(db, { code: room.code, playerId: args.playerId });
  if (!join.ok) {
    throw new Error(`findOrCreateRandomRoom: failed to join newly created room: ${join.reason}`);
  }
  return room;
}

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
