import { NextResponse } from 'next/server';
import { ensureCurrentPlayer } from '@/lib/auth/ensure-player';
import { assignOrCreate } from '@/lib/rooms/matchmakingQueue';
import { createServiceRoleClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

/**
 * POST /api/rooms/random — queue the player for a random match.
 *
 * Picks the oldest random-mode lobby with capacity, or spins up a fresh
 * one. The 90s start timer + min-3 cancel/re-queue lifecycle is driven by
 * `/api/cron/matchmaking-tick`, which an external scheduler hits every
 * few seconds.
 */
export async function POST() {
  const player = await ensureCurrentPlayer();
  if (!player) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const db = createServiceRoleClient();
  const { room } = await assignOrCreate(db, { playerId: player.id });
  return NextResponse.json({ code: room.code });
}
