import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { findGuess, insertGuess } from '@/db/guesses';
import { getRoundForScoring } from '@/db/rounds';
import { findOrCreateSoloSession, setSessionState } from '@/db/sessions';
import { getCurrentPlayer } from '@/lib/auth/current-player';
import { embedText } from '@/lib/gemini/embed';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { scoreGuess } from '@/scoring';
import { reactionFor } from '@/scoring/reaction';

export const runtime = 'nodejs';

const Body = z.object({
  roundId: z.string().uuid(),
  guess: z.string().trim().min(1).max(500),
});

export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
  const { roundId, guess } = parsed.data;

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
  const session = await findOrCreateSoloSession(db, { playerId, roundId });

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
      alreadyGuessed: true,
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
  await setSessionState(db, session.id, 'revealed');

  return NextResponse.json({
    sessionId: session.id,
    score: Math.round(breakdown.finalScore),
    breakdown,
    reaction: reactionFor(breakdown.finalScore),
  });
}
