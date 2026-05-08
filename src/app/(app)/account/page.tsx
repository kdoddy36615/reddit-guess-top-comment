import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { selectAllDailyRunsForPlayer } from '@/db/daily_run_totals';
import { countGuessesForPlayer, selectGuessSubredditsForPlayer } from '@/db/guesses';
import { getPlayerByAuthId } from '@/db/players';
import {
  computeBestDailyRun,
  computeTopSubreddits,
  computeWeeklyDailyCompletion,
  type SubredditStat,
} from '@/lib/account/stats';
import { dailyRoomId } from '@/lib/daily';
import { computeStreak } from '@/lib/leaderboard';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { createSsrClient } from '@/lib/supabase/ssr';
import { AccountClient, type AccountStats } from './account-client';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Account · Reddit Guess Top Comment',
  description: 'Your stats, settings, and account controls.',
  robots: { index: false, follow: true },
};

const TOP_SUBS_LIMIT = 3;

/**
 * /account — stats grid + settings.
 *
 * Permanent (linkIdentity'd) users see the full stats grid above the settings
 * section. Anonymous (signInAnonymously'd) users see the upgrade card replacing
 * the stats grid; their settings section becomes the upgrade form alone, since
 * "change password" / "delete account" don't make sense before there's a
 * permanent identity to manage.
 *
 * No-auth visitors are bounced to /login — there's no "save scores" path that
 * starts here cold. Anon bootstrap happens on play routes.
 */
export default async function AccountPage() {
  const ssr = await createSsrClient();
  const {
    data: { user },
  } = await ssr.auth.getUser();
  if (!user) {
    redirect('/login?next=/account');
  }

  const isAnonymous = user.is_anonymous === true;
  const player = await getPlayerByAuthId(ssr, user.id);

  if (isAnonymous) {
    return (
      <AccountClient isAnonymous email={null} nickname={player?.nickname ?? null} stats={null} />
    );
  }

  if (!player) {
    // Permanent user without a players row — shouldn't happen post-onboard,
    // but redirect home rather than render an empty stats grid.
    redirect('/');
  }

  const db = createServiceRoleClient();
  const today = new Date();
  const todayLabel = dailyRoomId(today).replace(/^daily-/, '');

  const [dailyRuns, lifetimeGuessCount, guessSubs] = await Promise.all([
    selectAllDailyRunsForPlayer(db, { playerId: player.id }),
    countGuessesForPlayer(db, { playerId: player.id }),
    selectGuessSubredditsForPlayer(db, { playerId: player.id }),
  ]);

  const completedRoomIds = dailyRuns.map((r) => r.dailyRoomId);
  const best = computeBestDailyRun(dailyRuns);
  const streak = computeStreak({ completedRoomIds, today: todayLabel });
  const weekly = computeWeeklyDailyCompletion({ completedRoomIds, today: todayLabel });
  const topSubs: SubredditStat[] = computeTopSubreddits({
    guesses: guessSubs,
    limit: TOP_SUBS_LIMIT,
  });

  const stats: AccountStats = {
    bestDailyRun: best ? { totalScore: best.totalScore, dailyRoomId: best.dailyRoomId } : null,
    streak,
    weekly,
    lifetimeGuesses: lifetimeGuessCount,
    topSubs,
  };

  return (
    <AccountClient
      isAnonymous={false}
      email={user.email ?? null}
      nickname={player.nickname}
      stats={stats}
    />
  );
}
