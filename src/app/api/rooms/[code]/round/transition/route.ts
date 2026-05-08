import { type NextRequest, NextResponse } from 'next/server';
import { getRoom } from '@/db/rooms';
import { findOrCreateRoomSession } from '@/db/sessions';
import { ensureCurrentPlayer } from '@/lib/auth/ensure-player';
import { isValidRoomCode } from '@/lib/rooms/code';
import { transitionRoomRound } from '@/lib/rooms/round-flow';
import { createServiceRoleClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

/**
 * POST /api/rooms/[code]/round/transition — server-authoritative round
 * advance.
 *
 * Any room member may call this; the operation is idempotent. Drives the
 * round lifecycle:
 *   - `guessing → revealed` when all players submitted OR the timer expired.
 *   - `revealed → guessing (next round)` after the 5s reveal hold.
 *   - `revealed → session_complete` after the last round, also flipping
 *     `room_metadata.status` to `ended` so /r/[code] redirects subsequent
 *     visitors to /r/[code]/end.
 *
 * Clients call this on:
 *   - submission (to fire all-submitted reveal early)
 *   - timer-tick crossings (to fire timer-expired reveal)
 *   - reveal-hold-tick crossings (to advance after 5s)
 *
 * Whoever calls first wins; the rest get a `noop` back. After a successful
 * mutation the calling client broadcasts a `state` payload via Realtime so
 * peers re-fetch the SSR snapshot via `router.refresh()`.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code: rawCode } = await params;
  const code = rawCode.toUpperCase();
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
  if (room.status !== 'live' && room.status !== 'ended') {
    return NextResponse.json({ error: 'Match has not started.' }, { status: 409 });
  }

  const session = await findOrCreateRoomSession(db, {
    code,
    roundCount: room.round_count,
  });

  const result = await transitionRoomRound(db, { code, sessionId: session.id });
  return NextResponse.json({ result, sessionId: session.id });
}
