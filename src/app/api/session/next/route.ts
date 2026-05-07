import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { advanceSession, getOrCreateActiveSoloSession } from '@/db/sessions';
import { getCurrentPlayer } from '@/lib/auth/current-player';
import { createServiceRoleClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const Body = z.object({
  sessionId: z.string().uuid().optional(),
});

export async function POST(req: NextRequest) {
  const player = await getCurrentPlayer();
  if (!player) {
    return NextResponse.json({ error: 'No player — onboard first' }, { status: 401 });
  }

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const db = createServiceRoleClient();
  const sessionId = parsed.data.sessionId ?? (await getOrCreateActiveSoloSession(db, player.id));

  const result = await advanceSession(db, { sessionId });
  if (!result) {
    return NextResponse.json({ sessionId, roundId: null });
  }
  return NextResponse.json({ sessionId, roundId: result.roundId, roundIndex: result.roundIndex });
}
