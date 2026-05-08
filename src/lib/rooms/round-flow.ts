import type { SupabaseClient } from '@supabase/supabase-js';
import { advanceRoomSession } from '@/db/sessions';
import type { Database } from '@/lib/supabase/database.types';

type Db = SupabaseClient<Database>;

export const REVEAL_HOLD_MS = 5_000;

export type RoundState = 'guessing' | 'revealed' | 'session_complete';

export interface ShouldRevealArgs {
  state: RoundState;
  roundStartedAt: string | null;
  timerSeconds: number;
  activePlayerIds: string[];
  submittedPlayerIds: Set<string>;
  now: Date;
}

/**
 * Decide whether the room round should transition `guessing → revealed`. Two
 * triggers, whichever fires first:
 *   - Every active (non-kicked) player has submitted a guess.
 *   - The round timer has expired (`now ≥ round_started_at + timer_seconds`).
 *
 * Pure: no I/O. The caller resolves player roster + submitted set + clock and
 * passes them in. Same shape as `shouldAdvanceRoundFromReveal` so both
 * triggers are exercised by the same `transitionRoomRound` orchestrator.
 */
export function shouldRevealRound(args: ShouldRevealArgs): boolean {
  if (args.state !== 'guessing') return false;
  if (args.activePlayerIds.length === 0) return false;
  const allSubmitted = args.activePlayerIds.every((id) => args.submittedPlayerIds.has(id));
  if (allSubmitted) return true;
  if (!args.roundStartedAt) return false;
  const endsAtMs = Date.parse(args.roundStartedAt) + args.timerSeconds * 1000;
  return args.now.getTime() >= endsAtMs;
}

export interface ShouldAdvanceArgs {
  state: RoundState;
  revealedAt: string | null;
  now: Date;
}

/**
 * Decide whether the round should auto-advance off the reveal screen — true
 * once REVEAL_HOLD_MS has elapsed since the round entered `revealed`.
 */
export function shouldAdvanceRoundFromReveal(args: ShouldAdvanceArgs): boolean {
  if (args.state !== 'revealed') return false;
  if (!args.revealedAt) return false;
  const advanceAtMs = Date.parse(args.revealedAt) + REVEAL_HOLD_MS;
  return args.now.getTime() >= advanceAtMs;
}

export type TransitionResult =
  | { kind: 'noop'; state: RoundState }
  | { kind: 'revealed'; revealedAt: string }
  | { kind: 'advanced'; roundId: string; roundIndex: number; startedAt: string }
  | { kind: 'completed' };

/**
 * Server-side state machine driver. Reads the current room session row,
 * checks whether `guessing → revealed` or `revealed → next-round` is now
 * eligible, and applies the transition under an idempotent CAS-style update
 * (the WHERE clause re-asserts the previous state so concurrent callers
 * don't double-advance).
 *
 * Caller: `/api/rooms/[code]/round/transition`. Any client may call it; the
 * first call wins, the rest are no-ops returning the current state.
 */
export async function transitionRoomRound(
  db: Db,
  args: { code: string; sessionId: string; now?: () => Date },
): Promise<TransitionResult> {
  const now = args.now ? args.now() : new Date();

  const sessRow = await db
    .from('game_sessions')
    .select(
      'id, current_round_id, current_round_state, current_round_started_at, current_round_revealed_at',
    )
    .eq('id', args.sessionId)
    .maybeSingle();
  if (sessRow.error) throw sessRow.error;
  if (!sessRow.data) {
    throw new Error(`session ${args.sessionId} not found`);
  }
  const state = sessRow.data.current_round_state as RoundState;
  const roundId = sessRow.data.current_round_id;

  if (state === 'session_complete') {
    return { kind: 'noop', state };
  }

  const room = await db
    .from('room_metadata')
    .select('timer_seconds')
    .eq('code', args.code)
    .maybeSingle();
  if (room.error) throw room.error;
  if (!room.data) throw new Error(`room ${args.code} not found`);

  if (state === 'guessing') {
    const players = await db
      .from('room_players')
      .select('player_id')
      .eq('room_code', args.code)
      .eq('is_kicked', false);
    if (players.error) throw players.error;
    const activeIds = ((players.data ?? []) as { player_id: string }[]).map((p) => p.player_id);

    let submittedIds = new Set<string>();
    if (roundId) {
      const guesses = await db
        .from('guesses')
        .select('player_id')
        .eq('session_id', args.sessionId)
        .eq('round_id', roundId);
      if (guesses.error) throw guesses.error;
      submittedIds = new Set(
        ((guesses.data ?? []) as { player_id: string }[]).map((g) => g.player_id),
      );
    }

    const ready = shouldRevealRound({
      state,
      roundStartedAt: sessRow.data.current_round_started_at,
      timerSeconds: room.data.timer_seconds,
      activePlayerIds: activeIds,
      submittedPlayerIds: submittedIds,
      now,
    });
    if (!ready) return { kind: 'noop', state };

    const revealedAt = now.toISOString();
    const upd = await db
      .from('game_sessions')
      .update({
        current_round_state: 'revealed',
        current_round_revealed_at: revealedAt,
      })
      .eq('id', args.sessionId)
      .eq('current_round_state', 'guessing');
    if (upd.error) throw upd.error;
    return { kind: 'revealed', revealedAt };
  }

  // state === 'revealed'
  const ready = shouldAdvanceRoundFromReveal({
    state,
    revealedAt: sessRow.data.current_round_revealed_at,
    now,
  });
  if (!ready) return { kind: 'noop', state };

  // CAS guard: only advance if still 'revealed'. We do this by updating the
  // state to a sentinel first, then advancing — but a simpler approach is to
  // call advanceRoomSession which sets state back to 'guessing' (or
  // 'session_complete'); concurrent callers will find no next session round.
  // Re-check state under a tighter window.
  const recheck = await db
    .from('game_sessions')
    .select('current_round_state')
    .eq('id', args.sessionId)
    .maybeSingle();
  if (recheck.error) throw recheck.error;
  if (recheck.data?.current_round_state !== 'revealed') {
    return { kind: 'noop', state: recheck.data?.current_round_state as RoundState };
  }

  const next = await advanceRoomSession(db, { sessionId: args.sessionId, now: () => now });
  if (!next) {
    // Match over — flip the room status to ended.
    const flipRoom = await db
      .from('room_metadata')
      .update({ status: 'ended', ended_at: now.toISOString() })
      .eq('code', args.code);
    if (flipRoom.error) throw flipRoom.error;
    return { kind: 'completed' };
  }
  return {
    kind: 'advanced',
    roundId: next.roundId,
    roundIndex: next.roundIndex,
    startedAt: now.toISOString(),
  };
}
