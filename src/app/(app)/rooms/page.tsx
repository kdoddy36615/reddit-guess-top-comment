import type { Metadata } from 'next';
import { Toaster } from '@/components/ui/toast';
import { createSsrClient } from '@/lib/supabase/ssr';
import { AnonBootstrap } from '../play/solo/anon-bootstrap';
import { RoomsClient } from './rooms-client';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Play with others · Reddit Guess Top Comment',
  description: 'Drop into a random match, host a private room, or take an invite by code.',
  robots: { index: false, follow: true },
};

/**
 * /rooms — multiplayer entry hub.
 *
 * Anonymous players are welcome. If there's no auth user yet (first visit), we
 * delegate to the same `AnonBootstrap` island /play/solo uses; it calls
 * `signInAnonymously()` and triggers a refresh so the SSR render below runs
 * with a real session. The actual `players` row + room membership are created
 * server-side by the action API routes (`/api/rooms/{random,create,join}`),
 * which is why this page itself doesn't need a player; the cards just need
 * something to POST to.
 */
export default async function RoomsPage() {
  const ssr = await createSsrClient();
  const {
    data: { user },
  } = await ssr.auth.getUser();
  if (!user) {
    return <AnonBootstrap />;
  }

  return (
    <>
      <RoomsClient />
      <Toaster />
    </>
  );
}
