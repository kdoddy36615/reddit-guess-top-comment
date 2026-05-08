import { type NextRequest, NextResponse } from 'next/server';
import { env } from '@/config/env';
import { processExpiredRandomRooms } from '@/lib/rooms/matchmakingQueue';
import { createServiceRoleClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

/**
 * POST /api/cron/matchmaking-tick — drain expired random matchmaking rooms.
 *
 * The "or equivalent" of the Edge Function called for in issue #44. Wire an
 * external scheduler (Supabase pg_cron + http extension, Vercel cron, or
 * cron-job.org) to hit this every ~5–15s. For each random+lobby room older
 * than 90s, the handler either flips it to `live` (≥3 active players) or
 * cancels it and re-queues its players.
 *
 * Auth: `Authorization: Bearer <CRON_SECRET>`. Honors `CRON_KILLSWITCH=true`
 * for emergency halts (per the cost-control rules in CLAUDE.md — cheap to
 * cut even though this handler does no LLM/Reddit work).
 */
export async function POST(req: NextRequest) {
  if (env.CRON_KILLSWITCH) {
    return NextResponse.json({ halted: true, reason: 'killswitch' }, { status: 200 });
  }

  const auth = req.headers.get('authorization');
  const expected = env.CRON_SECRET;
  if (!expected || auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = createServiceRoleClient();
  const result = await processExpiredRandomRooms(db);
  return NextResponse.json(result);
}
