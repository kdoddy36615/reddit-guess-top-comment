import { type NextRequest, NextResponse } from 'next/server';
import { getRoom, transitionStatus } from '@/db/rooms';
import { ensureCurrentPlayer } from '@/lib/auth/ensure-player';
import { isValidRoomCode } from '@/lib/rooms/code';
import { cleanupIfIdle } from '@/lib/rooms/idle-cleanup';
import { createServiceRoleClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

/**
 * POST /api/rooms/[code]/replay — host kicks off another match in the same
 * code after the previous one ended.
 *
 * Pre-conditions:
 *   - Caller is the room host (host-mode rooms only).
 *   - Room status is `ended` (we just finished a match).
 *   - The room is still within the 10-minute idle window — past that, the
 *     room is auto-closed via `cleanupIfIdle` and replay is rejected.
 *
 * Effects:
 *   - Reset `room_metadata.status` to `lobby`, clearing started_at + ended_at
 *     so the lobby UI behaves like a fresh room.
 *   - Lazily create a fresh `game_sessions` row for the same code (relies on
 *     the slice-46 partial unique that scopes uniqueness to the active match).
 *
 * The caller's client broadcasts a `state` event so peers in the end screen
 * `router.refresh()` and follow the room back into the lobby flow.
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
  if (room.mode !== 'host') {
    return NextResponse.json({ error: 'Random rooms cannot be replayed.' }, { status: 409 });
  }
  if (room.host_id !== player.id) {
    return NextResponse.json({ error: 'Only the host can start a replay.' }, { status: 403 });
  }
  if (room.status !== 'ended') {
    return NextResponse.json({ error: 'Match has not ended yet.' }, { status: 409 });
  }

  const cleanedUp = await cleanupIfIdle(db, {
    code,
    status: room.status,
    endedAt: room.ended_at,
  });
  if (cleanedUp) {
    return NextResponse.json(
      { error: 'Room has been idle too long and is closed.' },
      { status: 410 },
    );
  }

  // Reset to lobby. The previous match's `game_sessions` row stays in
  // `session_complete`; the partial unique on `(mode, room_id) WHERE
  // current_round_state <> 'session_complete'` lets the next round-transition
  // (after host clicks `[Start match]`) lazily insert a fresh active row via
  // `findOrCreateRoomSession`. We do not eagerly create the session here so
  // the round timer doesn't start ticking before the lobby flips to `live`.
  await transitionStatus(db, { code, status: 'lobby' });

  return NextResponse.json({ status: 'lobby' });
}
