import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { buttonVariants } from '@/components/ui/button';
import { findDailyRunTotal } from '@/db/daily_run_totals';
import { getPlayerByAuthId } from '@/db/players';
import { dailyRoomId } from '@/lib/daily';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { createSsrClient } from '@/lib/supabase/ssr';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Daily complete · Reddit Guess Top Comment',
  description: "You finished today's daily.",
};

/**
 * Placeholder summary screen — slice 20 will replace this with the full
 * round-by-round breakdown + streak + leaderboard CTAs from DESIGN.md.
 *
 * For now: confirms the run finalized, shows the total score from
 * `daily_run_totals`, and offers a hop back to /play/solo.
 */
export default async function DailyEndPage() {
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
  const todayRoomId = dailyRoomId(new Date());
  const total = await findDailyRunTotal(db, { playerId: player.id, dailyRoomId: todayRoomId });
  if (!total) {
    // No row yet — bounce back into the play flow rather than render a stale
    // summary. Hitting /end without a finalized run is nearly always a stale
    // bookmark or mid-session refresh.
    redirect('/play/daily');
  }

  const dateLabel = todayRoomId.replace(/^daily-/, '');

  return (
    <main className="space-y-6 py-10 text-center" data-testid="daily-end">
      <p className="font-mono text-xs uppercase tracking-wider text-text-faint">
        daily complete · {dateLabel}
      </p>
      <p className="font-display text-lg italic text-text-muted">nice run.</p>
      <p
        className="font-display text-7xl font-bold leading-none text-accent tabular-nums md:text-8xl"
        data-testid="daily-total-score"
      >
        {total.totalScore}
      </p>
      <p className="font-mono text-xs uppercase tracking-wider text-text-faint">total</p>
      <div className="flex justify-center pt-4">
        <Link href="/play/solo" className={buttonVariants({ variant: 'primary', size: 'md' })}>
          play solo →
        </Link>
      </div>
    </main>
  );
}
