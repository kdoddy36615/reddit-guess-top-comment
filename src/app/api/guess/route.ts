import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { findGuess, insertGuess } from '@/db/guesses';
import { getRoundForScoring } from '@/db/rounds';
import {
  findOrCreateSoloSession,
  getSessionMode,
  isRoundInSession,
  setSessionState,
} from '@/db/sessions';
import { getCurrentPlayer } from '@/lib/auth/current-player';
import { formatUpvotes } from '@/lib/format/reddit-meta';
import { embedText } from '@/lib/gemini/embed';
import { shareToken } from '@/lib/share-token';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { scoreGuess } from '@/scoring';
import { reactionFor } from '@/scoring/reaction';

export const runtime = 'nodejs';

const Body = z.object({
  roundId: z.string().uuid(),
  guess: z.string().trim().min(1).max(500),
  sessionId: z.string().uuid().optional(),
});

export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
  const { roundId, guess, sessionId: explicitSessionId } = parsed.data;

  const player = await getCurrentPlayer();
  if (!player) {
    return NextResponse.json({ error: 'No player — onboard first' }, { status: 401 });
  }

  const db = createServiceRoleClient();
  const round = await getRoundForScoring(db, roundId);
  if (!round) {
    return NextResponse.json({ error: 'Round not found' }, { status: 404 });
  }

  const playerId = player.id;
  let session: { id: string };
  if (explicitSessionId) {
    const ok = await isRoundInSession(db, { sessionId: explicitSessionId, roundId });
    if (!ok) {
      return NextResponse.json({ error: 'Round is not part of this session' }, { status: 400 });
    }
    session = { id: explicitSessionId };
  } else {
    session = await findOrCreateSoloSession(db, { playerId, roundId });
  }

  // Idempotency: if this player already guessed for this session+round,
  // return the prior result instead of double-scoring.
  const prior = await findGuess(db, {
    sessionId: session.id,
    roundId,
    playerId,
  });
  if (prior) {
    const reaction = reactionFor(prior.score);
    return NextResponse.json({
      sessionId: session.id,
      score: prior.score,
      reaction,
      shareToken: shareToken(playerId, roundId),
      alreadyGuessed: true,
      topComment: {
        text: round.topCommentText,
        upvotes: formatUpvotes(round.topCommentScore),
      },
    });
  }

  const guessEmbedding = await embedText(guess);
  const breakdown = scoreGuess(
    { text: guess, embedding: guessEmbedding },
    {
      topComment: {
        text: round.topCommentText,
        embedding: round.commentEmbedding,
        tags: {
          punchlineWord: round.punchlineWord ?? undefined,
          keyNouns: round.keyNoun ? [round.keyNoun] : undefined,
          jokeStructure: round.jokeStructure
            ? { kind: round.jokeStructure, markers: [] }
            : undefined,
        },
      },
    },
  );

  await insertGuess(db, {
    sessionId: session.id,
    roundId,
    playerId,
    guessText: guess,
    score: Math.round(breakdown.finalScore),
    breakdown,
  });
  // Room sessions manage their own state machine (server-authoritative
  // all-submit / timer expiry); flipping per-submit would leak the reveal
  // to the submitter's client before peers were ready. Solo and daily
  // continue to auto-flip on submit.
  const mode = await getSessionMode(db, session.id);
  if (mode !== 'room') {
    await setSessionState(db, session.id, 'revealed');
  }

  return NextResponse.json({
    sessionId: session.id,
    score: Math.round(breakdown.finalScore),
    breakdown,
    reaction: reactionFor(breakdown.finalScore),
    shareToken: shareToken(playerId, roundId),
    topComment: {
      text: round.topCommentText,
      upvotes: formatUpvotes(round.topCommentScore),
    },
  });
}
