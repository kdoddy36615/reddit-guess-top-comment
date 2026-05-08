import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { findDailyRunTotal } from '@/db/daily_run_totals';
import { getPlayerByAuthId } from '@/db/players';
import { dailyRoomId } from '@/lib/daily';
import { computeStreak, rankBoard } from '@/lib/leaderboard';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { createSsrClient } from '@/lib/supabase/ssr';
import { reactionFor } from '@/scoring/reaction';
import { EndClient, type EndClientRound } from './end-client';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Daily complete · Reddit Guess Top Comment',
  description: "You finished today's daily.",
};

/**
 * Daily summary screen — hero (date + total + rank), round-by-round breakdown,
 * streak card with countdown, and the two CTAs back into the loop.
 *
 * Just-finished vs revisit: the play-client redirects with `?just=1` after a
 * fresh finalize. That toggles the score-up + staggered fade-up animations.
 * Any direct visit (bookmark, refresh) renders without animations per
 * DESIGN.md §5 "revisit state does not play animations".
 */
export default async function DailyEndPage({
  searchParams,
}: {
  searchParams: Promise<{ just?: string }>;
}) {
  const ssr = await createSsrClient();
  const {
    data: { user },
  } = await ssr.auth.getUser();
  if (!user) {
    redirect('/play/daily');
  }
  const player = await getPlayerByAuthId(ssr, user.id);
  if (!player) {
    redirect('/play/daily');
  }

  const db = createServiceRoleClient();
  const today = new Date();
  const todayRoomId = dailyRoomId(today);
  const dateLabel = todayRoomId.replace(/^daily-/, '');

  const total = await findDailyRunTotal(db, { playerId: player.id, dailyRoomId: todayRoomId });
  if (!total) {
    redirect('/play/daily');
  }

  const sessionRow = await db
    .from('game_sessions')
    .select('id')
    .eq('mode', 'daily')
    .eq('room_id', todayRoomId)
    .maybeSingle();
  if (sessionRow.error) throw sessionRow.error;
  if (!sessionRow.data) {
    // No daily session row — should be impossible since the player has a
    // daily_run_totals row, but bail to /play/daily rather than 500 if it
    // happens (e.g., schema reset between finalize and revisit).
    redirect('/play/daily');
  }
  const sessionId = sessionRow.data.id;

  // Today's full board → rank via the pure `rankBoard` (slice 33). The cohort
  // is small enough today (low thousands) that loading + ranking in JS beats a
  // windowed-rank SQL query in clarity.
  const todayTotalsResp = await db
    .from('daily_run_totals')
    .select('player_id, total_score, completed_at, daily_room_id')
    .eq('daily_room_id', todayRoomId);
  if (todayTotalsResp.error) throw todayTotalsResp.error;
  const ranked = rankBoard({
    totals: (todayTotalsResp.data ?? []).map((r) => ({
      playerId: r.player_id,
      totalScore: r.total_score,
      completedAt: r.completed_at,
      dailyRoomId: r.daily_room_id,
    })),
  });
  const me = ranked.find((r) => r.playerId === player.id);
  const rank = me?.rank ?? 1;
  const totalPlayers = ranked.length;

  const sessionRoundsResp = await db
    .from('session_rounds')
    .select('round_index, round_id')
    .eq('session_id', sessionId)
    .order('round_index', { ascending: true });
  if (sessionRoundsResp.error) throw sessionRoundsResp.error;
  const sessionRounds = (sessionRoundsResp.data ?? []) as {
    round_index: number;
    round_id: string;
  }[];
  const roundIds = sessionRounds.map((r) => r.round_id);

  const [roundsResp, guessesResp, allTotalsResp] = await Promise.all([
    db.from('rounds').select('id, subreddit').in('id', roundIds),
    db
      .from('guesses')
      .select('round_id, guess_text, score')
      .eq('session_id', sessionId)
      .eq('player_id', player.id),
    db.from('daily_run_totals').select('daily_room_id').eq('player_id', player.id),
  ]);
  if (roundsResp.error) throw roundsResp.error;
  if (guessesResp.error) throw guessesResp.error;
  if (allTotalsResp.error) throw allTotalsResp.error;

  const roundsById = new Map((roundsResp.data ?? []).map((r) => [r.id, r] as const));
  const guessesByRound = new Map((guessesResp.data ?? []).map((g) => [g.round_id, g] as const));

  const rounds: EndClientRound[] = sessionRounds.map((r, i) => {
    const round = roundsById.get(r.round_id);
    const guess = guessesByRound.get(r.round_id);
    const score = guess?.score ?? 0;
    return {
      index: i + 1,
      subreddit: round?.subreddit ?? '?',
      guess: guess?.guess_text ?? '',
      score,
      band: reactionFor(score).band,
    };
  });

  const streak = computeStreak({
    completedRoomIds: (allTotalsResp.data ?? []).map((r) => r.daily_room_id),
    today: dateLabel,
  });

  const params = await searchParams;
  const justFinished = params.just === '1';

  return (
    <EndClient
      dateLabel={dateLabel}
      totalScore={total.totalScore}
      rank={rank}
      totalPlayers={totalPlayers}
      rounds={rounds}
      streak={streak}
      initialNow={today.toISOString()}
      justFinished={justFinished}
    />
  );
}
