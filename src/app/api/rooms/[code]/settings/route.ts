import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getRoom, updateSettings } from '@/db/rooms';
import { ensureCurrentPlayer } from '@/lib/auth/ensure-player';
import { isValidRoomCode } from '@/lib/rooms/code';
import { createServiceRoleClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

// Match the CHECK constraints on `room_metadata`. round_count 3..20,
// timer_seconds 10..120.
const Body = z
  .object({
    roundCount: z.number().int().min(3).max(20).optional(),
    timerSeconds: z.number().int().min(10).max(120).optional(),
  })
  .refine((v) => v.roundCount !== undefined || v.timerSeconds !== undefined, {
    message: 'At least one setting must be provided',
  });

/**
 * POST /api/rooms/[code]/settings — host adjusts round count and/or timer.
 * Random rooms have settings locked at the defaults; this endpoint only
 * accepts changes for `mode='host'` rooms.
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
    return NextResponse.json({ error: 'Only the host can change settings.' }, { status: 403 });
  }
  if (room.mode !== 'host') {
    return NextResponse.json({ error: 'Random room settings are fixed.' }, { status: 409 });
  }
  if (room.status !== 'lobby') {
    return NextResponse.json(
      { error: "Settings can't change once the match starts." },
      { status: 409 },
    );
  }

  await updateSettings(db, {
    code,
    roundCount: parsed.data.roundCount,
    timerSeconds: parsed.data.timerSeconds,
  });
  return NextResponse.json({ ok: true });
}
