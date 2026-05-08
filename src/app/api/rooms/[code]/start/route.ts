import { type NextRequest, NextResponse } from 'next/server';
import { getRoom, transitionStatus } from '@/db/rooms';
import { ensureCurrentPlayer } from '@/lib/auth/ensure-player';
import { isValidRoomCode } from '@/lib/rooms/code';
import { createServiceRoleClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

/**
 * POST /api/rooms/[code]/start — host transitions a host-mode room from
 * `lobby` → `live`. Random rooms ignore this — they auto-start via the
 * matchmaking timer (slice 44).
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  if (!isValidRoomCode(code)) {
    return NextResponse.json({ error: 'Invalid room code.' }, { status: 400 });
  }

  const player = await ensureCurrentPlayer();
  if (!player) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const db = createServiceRoleClient();
  const room = await getRoom(db, code);
  if (!room) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 });
  }
  if (room.host_id !== player.id) {
    return NextResponse.json({ error: 'Only the host can start the match.' }, { status: 403 });
  }
  if (room.mode !== 'host') {
    return NextResponse.json({ error: 'Random rooms start automatically.' }, { status: 409 });
  }
  if (room.status !== 'lobby') {
    return NextResponse.json({ error: 'Match has already started.' }, { status: 409 });
  }

  await transitionStatus(db, { code, status: 'live' });
  return NextResponse.json({ status: 'live' });
}
