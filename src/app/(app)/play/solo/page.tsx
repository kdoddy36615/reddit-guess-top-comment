import type { Metadata } from 'next';
import { findGuess } from '@/db/guesses';
import { getPlayerByAuthId } from '@/db/players';
import { getRoundForPlay, getRoundReveal } from '@/db/rounds';
import { advanceSession, getOrCreateActiveSoloSession } from '@/db/sessions';
import { formatPostAge, formatUpvotes } from '@/lib/format/reddit-meta';
import { generateNickname } from '@/lib/nickname/generate';
import { pickRound } from '@/lib/round-selection';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { createSsrClient } from '@/lib/supabase/ssr';
import { reactionFor } from '@/scoring/reaction';
import { AnonBootstrap } from './anon-bootstrap';
import { SoloPlayClient } from './play-client';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Play solo · Reddit Guess Top Comment',
  description: 'Guess what Reddit said. One round at a time.',
};

export default async function SoloPlayPage() {
  const ssr = await createSsrClient();
  const {
    data: { user },
  } = await ssr.auth.getUser();

  // First-visit path: no anon auth user yet. Delegate to a tiny client island
  // that calls signInAnonymously() and refreshes — server components can't
  // write auth cookies. Honors AC: "Anonymous Supabase session created on first
  // visit if absent."
  if (!user) {
    return <AnonBootstrap />;
  }

  const player = await getPlayerByAuthId(ssr, user.id);
  const db = createServiceRoleClient();

  // Server-authoritative round selection (architectural commitment #1).
  // With a player: reuse their active solo session's current round, advancing
  // if needed. Without a player (post-anon-signin, pre-onboard): pick a
  // uniform-random eligible round to display alongside the inline
  // NicknamePrompt. The session row gets created on first guess submit
  // (`/api/guess` resolves it via `findOrCreateSoloSession`).
  let roundId: string | null = null;
  let activeSessionId: string | null = null;
  let sessionState: 'guessing' | 'revealed' | 'session_complete' = 'guessing';

  if (player) {
    const sessionId = await getOrCreateActiveSoloSession(db, player.id);
    activeSessionId = sessionId;
    const sessionRow = await db
      .from('game_sessions')
      .select('current_round_id, current_round_state')
      .eq('id', sessionId)
      .maybeSingle();
    if (sessionRow.error) throw sessionRow.error;

    const current = sessionRow.data;
    if (current?.current_round_id && current.current_round_state === 'revealed') {
      roundId = current.current_round_id;
      sessionState = 'revealed';
    } else if (current?.current_round_state === 'guessing' && current.current_round_id) {
      roundId = current.current_round_id;
    } else {
      const next = await advanceSession(db, { sessionId });
      roundId = next?.roundId ?? null;
    }
  } else {
    const eligible = await db.from('rounds').select('id').eq('status', 'auto_published');
    if (eligible.error) throw eligible.error;
    const picked = pickRound((eligible.data ?? []) as { id: string }[], Math.random);
    roundId = picked?.id ?? null;
  }

  if (!roundId) {
    return (
      <div className="py-12 text-center font-mono text-sm text-text-muted">
        no rounds available right now. check back soon.
      </div>
    );
  }

  const round = await getRoundForPlay(db, roundId);
  if (!round) {
    return (
      <div className="py-12 text-center font-mono text-sm text-text-muted">round unavailable.</div>
    );
  }

  // Resolve the reveal payload when the session is currently in `revealed`
  // state — this is the post-submit reload path. We pull the player's prior
  // guess + the (now-allowed) top comment, and ship them to the client so it
  // can render the inline reveal layout without a /api/guess round-trip.
  let revealInitial:
    | {
        guess: string;
        score: number;
        topComment: { text: string; upvotes: string };
      }
    | undefined;
  if (sessionState === 'revealed' && player && activeSessionId) {
    const prior = await findGuess(db, {
      sessionId: activeSessionId,
      roundId: round.id,
      playerId: player.id,
    });
    const reveal = await getRoundReveal(db, round.id);
    if (prior && reveal) {
      revealInitial = {
        guess: prior.guessText,
        score: prior.score,
        topComment: {
          text: reveal.topCommentText,
          upvotes: formatUpvotes(reveal.topCommentScore),
        },
      };
    }
  }

  // sessionId stays server-side except in the reveal path, where the client
  // needs it to call `/api/session/next`. `/api/guess` resolves the session
  // via `findOrCreateSoloSession({ playerId, roundId })` when no sessionId is
  // supplied, which sidesteps the `isRoundInSession` check (orphan sessions
  // created by `getOrCreateActiveSoloSession` lack the `session_rounds` linkage
  // until they're advanced). The round itself is still server-authoritative.
  return (
    <SoloPlayClient
      roundId={round.id}
      sessionId={revealInitial ? activeSessionId : null}
      hasPlayer={Boolean(player)}
      autoNickname={generateNickname()}
      round={{
        subreddit: round.subreddit,
        title: round.title,
        upvotes: formatUpvotes(round.postScore),
        age: formatPostAge(round.createdUtcSeconds),
        body: round.body,
      }}
      revealInitial={
        revealInitial
          ? {
              guess: revealInitial.guess,
              score: revealInitial.score,
              band: reactionFor(revealInitial.score).band,
              topComment: revealInitial.topComment,
            }
          : undefined
      }
    />
  );
}
