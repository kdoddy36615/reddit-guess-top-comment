import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { Toaster } from '@/components/ui/toast';
import { getRoom, getRoomPlayers, isRoomMember } from '@/db/rooms';
import { ensureCurrentPlayer } from '@/lib/auth/ensure-player';
import { isValidRoomCode } from '@/lib/rooms/code';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { createSsrClient } from '@/lib/supabase/ssr';
import { AnonBootstrap } from '../../play/solo/anon-bootstrap';
import { LobbyClient } from './lobby-client';
import { MidMatchMessage } from './mid-match-message';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Room · Reddit Guess Top Comment',
  description: 'Multiplayer lobby — wait for players and start the match.',
  robots: { index: false, follow: false },
};

interface LobbyPageProps {
  params: Promise<{ code: string }>;
}

/**
 * /r/[code] — multiplayer lobby.
 *
 * SSR responsibilities:
 *   - Validate the code shape; 404 on garbage URLs.
 *   - Establish an anonymous Supabase session if absent (delegates to
 *     `AnonBootstrap`, same pattern as `/rooms`).
 *   - Read the room status; if `live` or `ended`, render the mid-match
 *     message instead of the lobby (mid-match-join handling).
 *   - For lobby state, hand off to `LobbyClient` with the initial room +
 *     players snapshot. The client wires Realtime presence + broadcast
 *     subscriptions and re-fetches via `router.refresh()` on state events.
 */
export default async function LobbyPage({ params }: LobbyPageProps) {
  const { code: rawCode } = await params;
  const code = rawCode.toUpperCase();
  if (!isValidRoomCode(code)) notFound();

  const ssr = await createSsrClient();
  const {
    data: { user },
  } = await ssr.auth.getUser();
  if (!user) {
    return <AnonBootstrap />;
  }

  // Service role for the SSR read — RLS allows members only, but the player
  // may be hitting this URL before the join API ran (e.g. an invitee using a
  // copy-pasted link). The page itself reveals nothing sensitive; gameplay
  // state is gated by the room status.
  const db = createServiceRoleClient();
  const room = await getRoom(db, code);
  if (!room) notFound();

  // Reconnection: existing room members are forwarded to the live screen
  // (or end screen) instead of seeing the mid-match message. Non-members
  // hitting a live URL still get the gate.
  if (room.status === 'live' || room.status === 'ended') {
    const player = await ensureCurrentPlayer();
    if (player) {
      const member = await isRoomMember(db, { code, playerId: player.id });
      if (member) {
        if (room.status === 'live') redirect(`/r/${code}/play`);
        if (room.status === 'ended') redirect(`/r/${code}/end`);
      }
    }
    return (
      <>
        <MidMatchMessage status={room.status} code={code} />
        <Toaster />
      </>
    );
  }

  const player = await ensureCurrentPlayer();
  if (!player) {
    return <AnonBootstrap />;
  }

  const players = await getRoomPlayers(db, code);

  return (
    <>
      <LobbyClient
        code={code}
        initialRoom={room}
        initialPlayers={players}
        viewerId={player.id}
        viewerNickname={player.nickname}
      />
      <Toaster />
    </>
  );
}
