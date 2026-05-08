import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { Toaster } from '@/components/ui/toast';
import { findGuess } from '@/db/guesses';
import { getRoom, getRoomPlayers, isRoomMember } from '@/db/rooms';
import { getRoundForPlay, getRoundReveal } from '@/db/rounds';
import { findOrCreateRoomSession } from '@/db/sessions';
import { ensureCurrentPlayer } from '@/lib/auth/ensure-player';
import { formatPostAge, formatUpvotes } from '@/lib/format/reddit-meta';
import { isValidRoomCode } from '@/lib/rooms/code';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { createSsrClient } from '@/lib/supabase/ssr';
import { AnonBootstrap } from '../../../play/solo/anon-bootstrap';
import { MidMatchMessage } from '../mid-match-message';
import { RoomPlayClient } from './play-client';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Match · Reddit Guess Top Comment',
  description: 'Live multiplayer round — guess the top comment.',
  robots: { index: false, follow: false },
};

interface PlayPageProps {
  params: Promise<{ code: string }>;
}

/**
 * /r/[code]/play — live synchronous round.
 *
 * SSR responsibilities:
 *   - Validate code; 404 on garbage URLs.
 *   - Anonymous bootstrap if no auth user.
 *   - Read room status:
 *     - `lobby`  → redirect to /r/[code] (the lobby will auto-forward
 *       existing members back here once status flips to `live`).
 *     - `ended` → redirect to /r/[code]/end.
 *     - `live` (the happy path) → continue.
 *   - Verify the player is an active room member; if not, render the
 *     mid-match message (mid-match-join is disallowed). This also covers
 *     the "kicked" case.
 *   - Resolve / lazily create the room's `game_sessions` row + per-round
 *     order via `findOrCreateRoomSession`. The first SSR hit creates the
 *     session; subsequent hits race-safely return the existing one.
 *   - Snapshot: current round (RoundCard fields), all room players, the
 *     viewer's prior guess for this round (for reconnection mid-reveal),
 *     plus reveal data when the round has flipped to `revealed`.
 */
export default async function RoomPlayPage({ params }: PlayPageProps) {
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
  if (room.status === 'ended') {
    redirect(`/r/${code}/end`);
  }

  const isMember = await isRoomMember(db, { code, playerId: player.id });
  if (!isMember) {
    return (
      <>
        <MidMatchMessage status="live" code={code} />
        <Toaster />
      </>
    );
  }

  // First SSR hit may create the session; subsequent hits return the same row.
  const session = await findOrCreateRoomSession(db, {
    code,
    roundCount: room.round_count,
  });
  if (!session.currentRoundId) {
    // Should not happen post-creation, but guard so we don't render with null.
    throw new Error(`Room session ${session.id} has no current round`);
  }

  const [round, players, sessionRoundsRows] = await Promise.all([
    getRoundForPlay(db, session.currentRoundId),
    getRoomPlayers(db, code),
    db
      .from('session_rounds')
      .select('round_index, round_id')
      .eq('session_id', session.id)
      .order('round_index', { ascending: true })
      .then((res) => {
        if (res.error) throw res.error;
        return (res.data ?? []) as { round_index: number; round_id: string }[];
      }),
  ]);
  if (!round) {
    throw new Error(`Room round ${session.currentRoundId} not found or not published`);
  }

  const totalRounds = sessionRoundsRows.length || room.round_count;
  const currentRow = sessionRoundsRows.find((r) => r.round_id === session.currentRoundId);
  const roundIndex = currentRow?.round_index ?? 0;

  // Who has submitted for this round (across all players, for chip rendering)?
  const submittedRows = await db
    .from('guesses')
    .select('player_id, score')
    .eq('session_id', session.id)
    .eq('round_id', session.currentRoundId);
  if (submittedRows.error) throw submittedRows.error;
  const submitted = (submittedRows.data ?? []) as { player_id: string; score: number }[];
  const submittedIds = submitted.map((s) => s.player_id);
  const viewerPriorGuess = await findGuess(db, {
    sessionId: session.id,
    roundId: session.currentRoundId,
    playerId: player.id,
  });

  // Reveal data when the session is already revealed (reconnection during reveal).
  let revealInitial: {
    topComment: { text: string; upvotes: string };
    revealedAt: string;
    submitted: { playerId: string; score: number }[];
  } | null = null;
  if (session.currentRoundState === 'revealed' && session.currentRoundRevealedAt) {
    const reveal = await getRoundReveal(db, session.currentRoundId);
    if (!reveal) {
      throw new Error(`Round ${session.currentRoundId} reveal payload missing`);
    }
    revealInitial = {
      topComment: {
        text: reveal.topCommentText,
        upvotes: formatUpvotes(reveal.topCommentScore),
      },
      revealedAt: session.currentRoundRevealedAt,
      submitted: submitted.map((s) => ({ playerId: s.player_id, score: s.score })),
    };
  }

  return (
    <>
      <RoomPlayClient
        code={code}
        sessionId={session.id}
        viewerId={player.id}
        viewerNickname={player.nickname}
        timerSeconds={room.timer_seconds}
        totalRounds={totalRounds}
        roundIndex={roundIndex}
        roundId={session.currentRoundId}
        round={{
          subreddit: round.subreddit,
          title: round.title,
          upvotes: formatUpvotes(round.postScore),
          age: formatPostAge(round.createdUtcSeconds),
          body: round.body,
        }}
        roundState={session.currentRoundState}
        roundStartedAt={session.currentRoundStartedAt}
        revealedAt={session.currentRoundRevealedAt}
        initialPlayers={players}
        initialSubmittedIds={submittedIds}
        viewerPriorGuess={
          viewerPriorGuess
            ? {
                text: viewerPriorGuess.guessText,
                score: viewerPriorGuess.score,
              }
            : null
        }
        revealInitial={revealInitial}
      />
      <Toaster />
    </>
  );
}
