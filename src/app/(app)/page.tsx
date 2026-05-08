import type { Metadata } from 'next';
import { countPlayersForDailyRoom } from '@/db/daily_run_totals';
import { getCurrentAuthStatus } from '@/lib/auth/current-player';
import { dailyRoomId } from '@/lib/daily';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { LandingContent } from './landing-content';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: { absolute: 'Guess the Top Comment — a Reddit guessing game' },
  description:
    'Read a Reddit post title. Guess what the top comment said. See how close you got. New rounds every day.',
  alternates: { canonical: '/' },
};

export default async function LandingPage() {
  const now = new Date();
  const [authStatus, playersToday] = await Promise.all([
    getCurrentAuthStatus(),
    countPlayersForDailyRoom(createServiceRoleClient(), { dailyRoomId: dailyRoomId(now) }),
  ]);

  // Signed-in == permanent (linkIdentity'd). Anonymous-auth users still see
  // the three-CTA marketing layout — their cohort doesn't survive sign-out,
  // so "your stats" wouldn't be a meaningful entry point yet.
  const authState = authStatus && !authStatus.isAnonymous ? 'permanent' : 'anonymous';

  return (
    <LandingContent authState={authState} nowIso={now.toISOString()} playersToday={playersToday} />
  );
}
