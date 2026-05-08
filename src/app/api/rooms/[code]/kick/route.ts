import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getRoom, kickPlayer } from '@/db/rooms';
import { ensureCurrentPlayer } from '@/lib/auth/ensure-player';
import { isValidRoomCode } from '@/lib/rooms/code';
import { createServiceRoleClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const Body = z.object({
  playerId: z.string().uuid(),
});

/**
 * POST /api/rooms/[code]/kick — host removes a player from the room.
 * Marks `is_kicked=true` so they can't rejoin until the room is recreated.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  if (!isValidRoomCode(code)) {
    return NextResponse.json({ error: 'Invalid room code.' }, { status: 400 });
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
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
    return NextResponse.json({ error: 'Only the host can kick.' }, { status: 403 });
  }
  if (parsed.data.playerId === room.host_id) {
    return NextResponse.json({ error: "Host can't kick themselves." }, { status: 400 });
  }

  await kickPlayer(db, { code, playerId: parsed.data.playerId });
  return NextResponse.json({ ok: true });
}
