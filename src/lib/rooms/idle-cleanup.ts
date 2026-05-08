import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';

type Db = SupabaseClient<Database>;

export const ROOM_IDLE_CLEANUP_MS = 10 * 60 * 1000;

export interface ShouldCleanupArgs {
  status: 'lobby' | 'live' | 'ended';
  endedAt: string | null;
  now: Date;
}

/**
 * Pure decision: a room is "idle-closed" 10 minutes after its match ended.
 * Once true, the next access lazily wipes `room_players` so the room can no
 * longer be replayed and existing members lose their seat. The host's
 * `[Play again]` route re-checks this so a stale tab can't sneak in past the
 * window.
 */
export function shouldCleanupIdleRoom(args: ShouldCleanupArgs): boolean {
  if (args.status !== 'ended') return false;
  if (!args.endedAt) return false;
  const elapsed = args.now.getTime() - Date.parse(args.endedAt);
  return elapsed >= ROOM_IDLE_CLEANUP_MS;
}

/**
 * Lazy idle cleanup. Called from any page/route that handles an "ended" room
 * to enforce the 10-minute auto-close rule. Service-role caller; deletes all
 * `room_players` rows for the code so non-host visits drop into the
 * mid-match-message flow and the replay route refuses (no longer host).
 *
 * Idempotent — calling twice is a no-op once the rows are gone.
 */
export async function cleanupIfIdle(
  db: Db,
  args: { code: string; status: 'lobby' | 'live' | 'ended'; endedAt: string | null; now?: Date },
): Promise<boolean> {
  const now = args.now ?? new Date();
  if (!shouldCleanupIdleRoom({ status: args.status, endedAt: args.endedAt, now })) {
    return false;
  }
  const { error } = await db.from('room_players').delete().eq('room_code', args.code);
  if (error) throw error;
  return true;
}
