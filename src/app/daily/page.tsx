import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { GuessClient } from '@/app/round/[id]/guess-client';
import { getPublicRound } from '@/db/rounds';
import { findOrCreateDailySession, getPlayerDailyProgress } from '@/db/sessions';
import { getCurrentAuthStatus, getCurrentPlayer } from '@/lib/auth/current-player';
import { InsufficientRoundsError } from '@/lib/daily';
import { createServiceRoleClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Daily challenge',
  description:
    "Today's five Reddit posts — guess each top comment and compare your score. New rounds every day at midnight UTC.",
  alternates: { canonical: '/daily' },
};

export default async function DailyPage() {
  const player = await getCurrentPlayer();
  if (!player) {
    redirect(`/welcome?next=${encodeURIComponent('/daily')}`);
  }
  const authStatus = await getCurrentAuthStatus();

  const db = createServiceRoleClient();
  let session: { id: string; roomId: string };
  try {
    session = await findOrCreateDailySession(db, { date: new Date() });
  } catch (err) {
    if (err instanceof InsufficientRoundsError) {
      return (
        <main className="mx-auto max-w-2xl p-6" data-testid="daily-unavailable">
          <header className="mb-6">
            <p className="text-sm uppercase tracking-wide text-zinc-500">Daily challenge</p>
          </header>
          <h1 className="text-3xl font-semibold leading-tight">Today's daily isn't ready yet</h1>
          <p className="mt-3 text-zinc-600">
            We need at least {err.requested} published rounds to run the daily, and only{' '}
            {err.available} are available right now. Check back soon.
          </p>
          <p className="mt-4 text-sm text-zinc-500">
            In the meantime, you can play freeplay rounds from the home page.
          </p>
        </main>
      );
    }
    throw err;
  }
  const progress = await getPlayerDailyProgress(db, {
    sessionId: session.id,
    playerId: player.id,
  });

  if (progress.isComplete) {
    return (
      <main className="mx-auto max-w-2xl p-6" data-testid="daily-complete">
        <header className="mb-6 flex items-center justify-between">
          <p className="text-sm uppercase tracking-wide text-zinc-500">Daily challenge</p>
          <p className="text-sm text-zinc-600">{player.nickname}</p>
        </header>
        <h1 className="text-3xl font-semibold leading-tight">
          You finished today's daily — {progress.guessedCount}/{progress.totalRounds}
        </h1>
        <p className="mt-2 text-zinc-600">
          Total score: <span className="font-semibold tabular-nums">{progress.totalScore}</span>
        </p>
        <p className="mt-4 text-sm text-zinc-500">Come back tomorrow for the next one.</p>
      </main>
    );
  }

  if (!progress.currentRoundId) {
    // Shouldn't happen — find-or-create ensures rounds exist. Defensive.
    throw new Error('Daily session has no current round');
  }

  const round = await getPublicRound(db, progress.currentRoundId);
  if (!round) {
    throw new Error(`Daily round ${progress.currentRoundId} not found or not published`);
  }

  const roundNumber = progress.guessedCount + 1;

  return (
    <main className="mx-auto max-w-2xl p-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-wide text-zinc-500">
            Daily — Round {roundNumber}/{progress.totalRounds}
          </p>
          <p className="text-xs text-zinc-500" data-testid="daily-running-total">
            Total so far: <span className="tabular-nums">{progress.totalScore}</span>
          </p>
        </div>
        <p className="text-sm text-zinc-600" data-testid="player-nickname">
          {player.nickname}
        </p>
      </header>
      <p className="text-sm uppercase tracking-wide text-zinc-500">r/{round.subreddit}</p>
      <h1 className="mt-2 text-3xl font-semibold leading-tight">{round.title}</h1>
      <p className="mt-4 text-zinc-600">Guess what the top comment said. One sentence is enough.</p>
      <GuessClient
        key={round.id}
        roundId={round.id}
        sessionId={session.id}
        variant="daily"
        advanceHref="/daily"
        isAnonymous={authStatus?.isAnonymous ?? false}
        finalSummary={
          roundNumber === progress.totalRounds
            ? { totalRounds: progress.totalRounds, priorTotalScore: progress.totalScore }
            : undefined
        }
      />
    </main>
  );
}
