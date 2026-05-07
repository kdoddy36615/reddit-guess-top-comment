import { type NextRequest, NextResponse } from 'next/server';
import { findGuess } from '@/db/guesses';
import { getRoundReveal } from '@/db/rounds';
import { getCurrentPlayer } from '@/lib/auth/current-player';
import { createServiceRoleClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: roundId } = await params;
  const sessionId = new URL(req.url).searchParams.get('sessionId');
  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId required' }, { status: 400 });
  }

  const player = await getCurrentPlayer();
  if (!player) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const db = createServiceRoleClient();
  const guess = await findGuess(db, {
    sessionId,
    roundId,
    playerId: player.id,
  });
  if (!guess) {
    // Spoiler-safe: no guess submitted → no reveal.
    return NextResponse.json({ error: 'No guess submitted' }, { status: 403 });
  }

  const reveal = await getRoundReveal(db, roundId);
  if (!reveal) {
    return NextResponse.json({ error: 'Round not found' }, { status: 404 });
  }
  return NextResponse.json({ topCommentText: reveal.topCommentText });
}
