import { NextResponse } from 'next/server';
import { ensureCurrentPlayer } from '@/lib/auth/ensure-player';
import { findOrCreateRandomRoom } from '@/lib/rooms/matchmaking';
import { createServiceRoleClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

/**
 * POST /api/rooms/random — queue the player for a random match.
 *
 * v1 implementation: find any random-mode lobby with capacity, or spin up a
 * fresh one. The 90-second start timer + min-3 cancel/re-queue logic ships in
 * slice 44 (issue #44). Until then the room sits in lobby until something
 * else advances it.
 */
export async function POST() {
  const player = await ensureCurrentPlayer();
  if (!player) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const db = createServiceRoleClient();
  const room = await findOrCreateRandomRoom(db, { playerId: player.id });
  return NextResponse.json({ code: room.code });
}
