import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { type JoinResult, joinRoom } from '@/db/rooms';
import { ensureCurrentPlayer } from '@/lib/auth/ensure-player';
import { isValidRoomCode } from '@/lib/rooms/code';
import { createServiceRoleClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const Body = z.object({
  code: z.string().trim().toUpperCase(),
});

type JoinFailureReason = Extract<JoinResult, { ok: false }>['reason'];

const REASON_TO_MESSAGE: Record<JoinFailureReason, string> = {
  not_found: "Couldn't find a room with that code.",
  not_in_lobby: 'That match is already in progress.',
  locked: 'The host has locked this room.',
  full: 'The room is full.',
  kicked: "You can't rejoin this room.",
};

const REASON_TO_STATUS: Record<JoinFailureReason, number> = {
  not_found: 404,
  not_in_lobby: 409,
  locked: 403,
  full: 409,
  kicked: 403,
};

/**
 * POST /api/rooms/join — validate a 6-char code and add the calling player to
 * the room's `room_players` set. Returns `{ code }` on success so the client
 * can redirect to `/r/{code}`.
 */
export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
  const { code } = parsed.data;

  if (!isValidRoomCode(code)) {
    return NextResponse.json({ error: 'Invalid room code.' }, { status: 400 });
  }

  const player = await ensureCurrentPlayer();
  if (!player) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const db = createServiceRoleClient();
  const result = await joinRoom(db, { code, playerId: player.id });
  if (!result.ok) {
    return NextResponse.json(
      { error: REASON_TO_MESSAGE[result.reason] },
      { status: REASON_TO_STATUS[result.reason] },
    );
  }
  return NextResponse.json({ code });
}
