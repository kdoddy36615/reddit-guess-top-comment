import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { findDailyRunTotal, upsertDailyRunTotal } from '@/db/daily_run_totals';
import { getPlayerDailyProgress } from '@/db/sessions';
import { getCurrentPlayer } from '@/lib/auth/current-player';
import { createServiceRoleClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const Body = z.object({
  sessionId: z.string().uuid(),
});

/**
 * Daily completion hook. Called once a player finishes round 5 and clicks
 * [finish →] on the reveal layout. Idempotent — `daily_run_totals` is
 * upserted on `(player_id, daily_room_id)`, so a duplicate POST returns the
 * same row.
 *
 * Daily mode shares a `game_sessions` row across all players for the day, so
 * we never flip the session's `current_round_state` to `session_complete` from
 * here — that flag would leak across players. Per-player completion is
 * tracked by the existence of the player's `daily_run_totals` row.
 */
export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
  const { sessionId } = parsed.data;

  const player = await getCurrentPlayer();
  if (!player) {
    return NextResponse.json({ error: 'No player — onboard first' }, { status: 401 });
  }

  const db = createServiceRoleClient();

  const session = await db
    .from('game_sessions')
    .select('id, mode, room_id')
    .eq('id', sessionId)
    .maybeSingle();
  if (session.error) throw session.error;
  if (!session.data) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }
  if (session.data.mode !== 'daily' || !session.data.room_id) {
    return NextResponse.json({ error: 'Not a daily session' }, { status: 400 });
  }
  const dailyRoomId = session.data.room_id;

  // Idempotency: a duplicate completion POST after the row already exists is
  // a no-op redirect. We re-read so the `totalScore` we return matches what
  // the player saw the first time around.
  const existing = await findDailyRunTotal(db, { playerId: player.id, dailyRoomId });
  if (existing) {
    return NextResponse.json({ done: true, totalScore: existing.totalScore });
  }

  const progress = await getPlayerDailyProgress(db, { sessionId, playerId: player.id });
  if (!progress.isComplete) {
    return NextResponse.json(
      { error: 'Daily is not complete', guessedCount: progress.guessedCount },
      { status: 400 },
    );
  }

  const result = await upsertDailyRunTotal(db, {
    playerId: player.id,
    dailyRoomId,
    totalScore: progress.totalScore,
  });

  return NextResponse.json({ done: true, totalScore: result.totalScore });
}
