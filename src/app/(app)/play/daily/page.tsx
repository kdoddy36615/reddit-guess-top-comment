import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { findDailyRunTotal } from '@/db/daily_run_totals';
import { findGuess } from '@/db/guesses';
import { getPlayerByAuthId } from '@/db/players';
import { getRoundForPlay, getRoundReveal } from '@/db/rounds';
import { findOrCreateDailySession, getPlayerDailyProgress } from '@/db/sessions';
import { dailyRoomId, InsufficientRoundsError } from '@/lib/daily';
import { formatPostAge, formatUpvotes } from '@/lib/format/reddit-meta';
import { generateNickname } from '@/lib/nickname/generate';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { createSsrClient } from '@/lib/supabase/ssr';
import { reactionFor } from '@/scoring/reaction';
import { AnonBootstrap } from '../solo/anon-bootstrap';
import { DailyPlayClient } from './play-client';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Today's daily · Reddit Guess Top Comment",
  description: "Today's five Reddit posts. Guess each top comment.",
};

const TOTAL_ROUNDS = 5;

export default async function DailyPlayPage() {
  const ssr = await createSsrClient();
  const {
    data: { user },
  } = await ssr.auth.getUser();

  // First-visit path mirrors /play/solo: no anon auth user yet, delegate to a
  // tiny client island that calls signInAnonymously() and refreshes.
  if (!user) {
    return <AnonBootstrap />;
  }

  const player = await getPlayerByAuthId(ssr, user.id);
  const db = createServiceRoleClient();

  // Resolve today's daily session. If the catalogue has fewer than 5
  // published rounds, surface that explicitly rather than 500-ing.
  let session: { id: string; roomId: string };
  try {
    session = await findOrCreateDailySession(db, { date: new Date(), roundCount: TOTAL_ROUNDS });
  } catch (err) {
    if (err instanceof InsufficientRoundsError) {
      return (
        <main className="py-12 text-center font-mono text-sm text-text-muted">
          today's daily isn't ready yet — check back soon.
        </main>
      );
    }
    throw err;
  }

  // Without a player (post-anon-signin, pre-onboard) we can't compute
  // per-player progress yet. Show round 1 with the inline NicknamePrompt;
  // submitting the nickname triggers a refresh that re-enters the full flow.
  if (!player) {
    const sr = await db
      .from('session_rounds')
      .select('round_id, round_index')
      .eq('session_id', session.id)
      .order('round_index', { ascending: true })
      .limit(1);
    if (sr.error) throw sr.error;
    const firstRoundId = (sr.data ?? [])[0]?.round_id ?? null;
    if (!firstRoundId) {
      return (
        <main className="py-12 text-center font-mono text-sm text-text-muted">
          today's daily isn't ready yet — check back soon.
        </main>
      );
    }
    const round = await getRoundForPlay(db, firstRoundId);
    if (!round) {
      return (
        <main className="py-12 text-center font-mono text-sm text-text-muted">
          round unavailable.
        </main>
      );
    }
    return (
      <DailyPlayClient
        sessionId={session.id}
        roundId={round.id}
        hasPlayer={false}
        autoNickname={generateNickname()}
        roundNumber={1}
        totalRounds={TOTAL_ROUNDS}
        round={{
          subreddit: round.subreddit,
          title: round.title,
          upvotes: formatUpvotes(round.postScore),
          age: formatPostAge(round.createdUtcSeconds),
          body: round.body,
        }}
      />
    );
  }

  // Per-player completion is tracked by `daily_run_totals` row existence —
  // daily sessions are shared across players, so we never flip the session's
  // `current_round_state` to `session_complete` for daily mode.
  const todayRoomId = dailyRoomId(new Date());
  const finished = await findDailyRunTotal(db, {
    playerId: player.id,
    dailyRoomId: todayRoomId,
  });
  if (finished) {
    redirect('/play/daily/end');
  }

  const progress = await getPlayerDailyProgress(db, {
    sessionId: session.id,
    playerId: player.id,
  });

  // Order session_rounds so we can show the player the right reveal of the
  // last round while they decide to click [finish →].
  const sessionRounds = await db
    .from('session_rounds')
    .select('round_index, round_id')
    .eq('session_id', session.id)
    .order('round_index', { ascending: true });
  if (sessionRounds.error) throw sessionRounds.error;
  const ordered = (sessionRounds.data ?? []) as { round_index: number; round_id: string }[];

  // Final-round reveal path: all 5 guesses recorded but no daily_run_totals
  // row yet — render the round-5 reveal with the persisted guess so the
  // player can click [finish →] (which calls /api/play/daily/complete).
  if (progress.isComplete) {
    const lastRoundId = ordered[ordered.length - 1]?.round_id;
    if (!lastRoundId) {
      // Defensive — session_rounds should always have 5 rows here.
      throw new Error('Daily session has no rounds');
    }
    const [round, prior, reveal] = await Promise.all([
      getRoundForPlay(db, lastRoundId),
      findGuess(db, { sessionId: session.id, roundId: lastRoundId, playerId: player.id }),
      getRoundReveal(db, lastRoundId),
    ]);
    if (!round || !prior || !reveal) {
      throw new Error('Final daily round payload missing');
    }
    return (
      <DailyPlayClient
        sessionId={session.id}
        roundId={round.id}
        hasPlayer
        autoNickname={generateNickname()}
        roundNumber={TOTAL_ROUNDS}
        totalRounds={TOTAL_ROUNDS}
        round={{
          subreddit: round.subreddit,
          title: round.title,
          upvotes: formatUpvotes(round.postScore),
          age: formatPostAge(round.createdUtcSeconds),
          body: round.body,
        }}
        revealInitial={{
          guess: prior.guessText,
          score: prior.score,
          band: reactionFor(prior.score).band,
          topComment: {
            text: reveal.topCommentText,
            upvotes: formatUpvotes(reveal.topCommentScore),
          },
        }}
      />
    );
  }

  if (!progress.currentRoundId) {
    throw new Error('Daily session has no current round');
  }

  const round = await getRoundForPlay(db, progress.currentRoundId);
  if (!round) {
    throw new Error(`Daily round ${progress.currentRoundId} not found or not published`);
  }

  const roundNumber = progress.guessedCount + 1;

  return (
    <DailyPlayClient
      sessionId={session.id}
      roundId={round.id}
      hasPlayer
      autoNickname={generateNickname()}
      roundNumber={roundNumber}
      totalRounds={TOTAL_ROUNDS}
      round={{
        subreddit: round.subreddit,
        title: round.title,
        upvotes: formatUpvotes(round.postScore),
        age: formatPostAge(round.createdUtcSeconds),
        body: round.body,
      }}
    />
  );
}
