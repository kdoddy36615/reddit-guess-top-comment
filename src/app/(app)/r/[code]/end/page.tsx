import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { Toaster } from '@/components/ui/toast';
import { getRoom, getRoomPlayers, isRoomMember } from '@/db/rooms';
import { ensureCurrentPlayer } from '@/lib/auth/ensure-player';
import { isValidRoomCode } from '@/lib/rooms/code';
import { computeMatchSummary, type MatchGuess } from '@/lib/rooms/end-screen';
import { cleanupIfIdle } from '@/lib/rooms/idle-cleanup';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { createSsrClient } from '@/lib/supabase/ssr';
import { AnonBootstrap } from '../../../play/solo/anon-bootstrap';
import { MidMatchMessage } from '../mid-match-message';
import { EndClient } from './end-client';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Match over · Reddit Guess Top Comment',
  description: 'Final standings + per-round highlights for the multiplayer match.',
  robots: { index: false, follow: false },
};

interface EndPageProps {
  params: Promise<{ code: string }>;
}

/**
 * /r/[code]/end — multiplayer match-end summary.
 *
 * SSR responsibilities:
 *   - Validate the code; 404 on garbage URLs.
 *   - Anonymous bootstrap if no auth user.
 *   - Read room status:
 *     - `lobby` (host clicked [Play again]) → redirect back to /r/[code].
 *     - `live` (a fresh match is underway) → redirect to /r/[code]/play.
 *     - `ended` (the happy path) → continue.
 *   - Lazily run the 10-minute idle-cleanup; past the window, the room
 *     `room_players` rows are wiped and visitors fall through to the
 *     mid-match message ("match over").
 *   - Pull the most-recent completed `game_sessions` row (the match that
 *     just ended), all its guesses, all session_rounds, and the room's
 *     players, then hand off to `EndClient` with the computed summary.
 */
export default async function RoomEndPage({ params }: EndPageProps) {
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

  const player = await ensureCurrentPlayer();
  if (!player) {
    return <AnonBootstrap />;
  }

  const db = createServiceRoleClient();
  const room = await getRoom(db, code);
  if (!room) notFound();

  if (room.status === 'lobby') {
    redirect(`/r/${code}`);
  }
  if (room.status === 'live') {
    redirect(`/r/${code}/play`);
  }

  // 10-minute idle close. Past this window the room is effectively dead —
  // wipe the player roster so the replay route refuses and visitors land on
  // the static "match over" card instead of the standings.
  const cleanedUp = await cleanupIfIdle(db, {
    code,
    status: room.status,
    endedAt: room.ended_at,
  });
  if (cleanedUp) {
    return (
      <>
        <MidMatchMessage status="ended" code={code} />
        <Toaster />
      </>
    );
  }

  // Visitors who weren't in the match get the static "match over" card.
  const isMember = await isRoomMember(db, { code, playerId: player.id });
  if (!isMember) {
    return (
      <>
        <MidMatchMessage status="ended" code={code} />
        <Toaster />
      </>
    );
  }

  // Pull the completed match that just ended. After replay there can be
  // multiple `session_complete` rows for the same code; we want the most-
  // recently-completed one (the match the host just finished).
  const completedSession = await db
    .from('game_sessions')
    .select('id, completed_at')
    .eq('mode', 'room')
    .eq('room_id', code)
    .eq('current_round_state', 'session_complete')
    .order('completed_at', { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();
  if (completedSession.error) throw completedSession.error;
  if (!completedSession.data) {
    // Defensive: room is `ended` but no completed session — render the static
    // "match over" card instead of throwing.
    return (
      <>
        <MidMatchMessage status="ended" code={code} />
        <Toaster />
      </>
    );
  }
  const sessionId = completedSession.data.id;

  const [players, sessionRoundsResp, guessesResp] = await Promise.all([
    getRoomPlayers(db, code),
    db
      .from('session_rounds')
      .select('round_index, round_id, rounds(subreddit)')
      .eq('session_id', sessionId)
      .order('round_index', { ascending: true }),
    db
      .from('guesses')
      .select('player_id, round_id, score, submitted_at')
      .eq('session_id', sessionId),
  ]);
  if (sessionRoundsResp.error) throw sessionRoundsResp.error;
  if (guessesResp.error) throw guessesResp.error;

  const activePlayers = players.filter((p) => !p.is_kicked);
  const summaryPlayers = activePlayers.map((p) => ({ id: p.player_id, nickname: p.nickname }));
  const summaryRounds = (sessionRoundsResp.data ?? []).map((row) => {
    const r = row as {
      round_index: number;
      round_id: string;
      rounds: { subreddit: string } | { subreddit: string }[] | null;
    };
    const rounds = Array.isArray(r.rounds) ? r.rounds[0] : r.rounds;
    return {
      id: r.round_id,
      index: r.round_index,
      subreddit: rounds?.subreddit ?? '?',
    };
  });
  const summaryGuesses: MatchGuess[] = (guessesResp.data ?? []).map((g) => ({
    playerId: g.player_id as string,
    roundId: g.round_id as string,
    score: g.score as number,
    submittedAt: g.submitted_at as string,
  }));

  const summary = computeMatchSummary({
    players: summaryPlayers,
    rounds: summaryRounds,
    guesses: summaryGuesses,
  });

  const isHost = room.mode === 'host' && room.host_id === player.id;

  return (
    <>
      <EndClient
        code={code}
        viewerId={player.id}
        viewerNickname={player.nickname}
        summary={summary}
        isHost={isHost}
        mode={room.mode}
      />
      <Toaster />
    </>
  );
}
