import { NextResponse } from 'next/server';
import { createRoom, HOST_MAX_PLAYERS } from '@/db/rooms';
import { ensureCurrentPlayer } from '@/lib/auth/ensure-player';
import { createServiceRoleClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

/**
 * POST /api/rooms/create — host creates a new room.
 *
 * Returns `{ code }`; the client redirects to `/r/{code}` to land in the
 * lobby as host. Settings (round_count, timer_seconds) start at the global
 * defaults and the host can edit them in the lobby (slice 43).
 */
export async function POST() {
  const player = await ensureCurrentPlayer();
  if (!player) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const db = createServiceRoleClient();
  const room = await createRoom(db, {
    hostPlayerId: player.id,
    mode: 'host',
    maxPlayers: HOST_MAX_PLAYERS,
  });
  return NextResponse.json({ code: room.code });
}
