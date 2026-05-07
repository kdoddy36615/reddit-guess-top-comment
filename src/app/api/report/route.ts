import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { reportRound } from '@/db/reports';
import { getCurrentPlayer } from '@/lib/auth/current-player';
import { createServiceRoleClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const Body = z.object({
  roundId: z.string().uuid(),
  reason: z.string().trim().min(1).max(500).optional(),
});

export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
  const { roundId, reason } = parsed.data;

  const player = await getCurrentPlayer();
  if (!player) {
    return NextResponse.json({ error: 'No player — onboard first' }, { status: 401 });
  }

  const db = createServiceRoleClient();
  const result = await reportRound(db, { roundId, playerId: player.id, reason });
  return NextResponse.json(result);
}
