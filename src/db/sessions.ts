import type { SupabaseClient } from '@supabase/supabase-js';
import { dailyRoomId, pickDailyRounds } from '@/lib/daily';
import { nextRoundIndex, pickRound, type Rng } from '@/lib/round-selection';
import type { Database } from '@/lib/supabase/database.types';

type Db = SupabaseClient<Database>;
type RoundState = 'guessing' | 'revealed' | 'session_complete';

export type SoloSession = {
  id: string;
  currentRoundId: string | null;
  currentRoundState: RoundState;
};

/**
 * Find the player's existing solo session for this round in `guessing` state,
 * or create a new one. The session is keyed loosely (no unique constraint on
 * solo+player+round in the schema), so we look up by (player, round, state).
 */
export async function findOrCreateSoloSession(
  db: Db,
  args: { playerId: string; roundId: string },
): Promise<SoloSession> {
  const existing = await db
    .from('game_sessions')
    .select('id, current_round_id, current_round_state')
    .eq('mode', 'solo')
    .eq('creator_player_id', args.playerId)
    .eq('current_round_id', args.roundId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data) {
    return {
      id: existing.data.id,
      currentRoundId: existing.data.current_round_id,
      currentRoundState: existing.data.current_round_state as RoundState,
    };
  }
  const inserted = await db
    .from('game_sessions')
    .insert({
      mode: 'solo',
      creator_player_id: args.playerId,
      current_round_id: args.roundId,
      current_round_state: 'guessing',
    })
    .select('id, current_round_id, current_round_state')
    .single();
  if (inserted.error) throw inserted.error;
  return {
    id: inserted.data.id,
    currentRoundId: inserted.data.current_round_id,
    currentRoundState: inserted.data.current_round_state as RoundState,
  };
}

export async function findOrCreateDailySession(
  db: Db,
  args: { date: Date; roundCount?: number },
): Promise<{ id: string; roomId: string }> {
  const roomId = dailyRoomId(args.date);

  const existing = await db
    .from('game_sessions')
    .select('id')
    .eq('mode', 'daily')
    .eq('room_id', roomId)
    .maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data) return { id: existing.data.id, roomId };

  const roundCount = args.roundCount ?? 5;

  const eligible = await db.from('rounds').select('id').eq('status', 'auto_published');
  if (eligible.error) throw eligible.error;
  const candidateIds = ((eligible.data ?? []) as { id: string }[]).map((r) => r.id);
  const picked = pickDailyRounds(candidateIds, roomId, roundCount);

  const inserted = await db
    .from('game_sessions')
    .insert({
      mode: 'daily',
      room_id: roomId,
      current_round_id: picked[0],
      current_round_state: 'guessing',
    })
    .select('id')
    .single();

  if (inserted.error) {
    // 23505 = unique_violation — a concurrent caller created today's daily
    // first. Re-SELECT and return the winner; do not write session_rounds.
    if ((inserted.error as { code?: string }).code === '23505') {
      const winner = await db
        .from('game_sessions')
        .select('id')
        .eq('mode', 'daily')
        .eq('room_id', roomId)
        .maybeSingle();
      if (winner.error) throw winner.error;
      if (winner.data) return { id: winner.data.id, roomId };
    }
    throw inserted.error;
  }

  const sessionId = inserted.data.id;
  const sessionRounds = picked.map((round_id, round_index) => ({
    session_id: sessionId,
    round_index,
    round_id,
  }));
  const sr = await db.from('session_rounds').insert(sessionRounds);
  if (sr.error) throw sr.error;

  return { id: sessionId, roomId };
}

export type DailyProgress = {
  totalRounds: number;
  guessedCount: number;
  currentRoundId: string | null;
  isComplete: boolean;
  totalScore: number;
};

export async function getPlayerDailyProgress(
  db: Db,
  args: { sessionId: string; playerId: string },
): Promise<DailyProgress> {
  const sr = await db
    .from('session_rounds')
    .select('round_index, round_id')
    .eq('session_id', args.sessionId)
    .order('round_index', { ascending: true });
  if (sr.error) throw sr.error;
  const rounds = ((sr.data ?? []) as { round_index: number; round_id: string }[])
    .slice()
    .sort((a, b) => a.round_index - b.round_index);

  const gs = await db
    .from('guesses')
    .select('round_id, score')
    .eq('session_id', args.sessionId)
    .eq('player_id', args.playerId);
  if (gs.error) throw gs.error;
  const guesses = (gs.data ?? []) as { round_id: string; score: number }[];

  const guessedRoundIds = new Set(guesses.map((g) => g.round_id));
  const totalScore = guesses.reduce((sum, g) => sum + g.score, 0);
  const next = rounds.find((r) => !guessedRoundIds.has(r.round_id)) ?? null;

  return {
    totalRounds: rounds.length,
    guessedCount: guessedRoundIds.size,
    currentRoundId: next?.round_id ?? null,
    isComplete: rounds.length > 0 && next === null,
    totalScore,
  };
}

export async function isRoundInSession(
  db: Db,
  args: { sessionId: string; roundId: string },
): Promise<boolean> {
  const { data, error } = await db
    .from('session_rounds')
    .select('round_id')
    .eq('session_id', args.sessionId)
    .eq('round_id', args.roundId)
    .maybeSingle();
  if (error) throw error;
  return data !== null;
}

export async function setSessionState(db: Db, sessionId: string, state: RoundState): Promise<void> {
  const { error } = await db
    .from('game_sessions')
    .update({ current_round_state: state })
    .eq('id', sessionId);
  if (error) throw error;
}

/**
 * Find the player's most recent solo session (any state), or create a new
 * empty one with no current round. Used to start a freeplay session from the
 * homepage, before any round has been served.
 */
export async function getOrCreateActiveSoloSession(db: Db, playerId: string): Promise<string> {
  const existing = await db
    .from('game_sessions')
    .select('id')
    .eq('mode', 'solo')
    .eq('creator_player_id', playerId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data) return existing.data.id;

  const inserted = await db
    .from('game_sessions')
    .insert({
      mode: 'solo',
      creator_player_id: playerId,
      current_round_state: 'guessing',
    })
    .select('id')
    .single();
  if (inserted.error) throw inserted.error;
  return inserted.data.id;
}

export async function getSessionState(db: Db, sessionId: string): Promise<RoundState | null> {
  const { data, error } = await db
    .from('game_sessions')
    .select('current_round_state')
    .eq('id', sessionId)
    .maybeSingle();
  if (error) throw error;
  return (data?.current_round_state as RoundState) ?? null;
}

/**
 * Pick the next round for a freeplay (solo) session. Uniform random over
 * `auto_published` rounds excluding any already played in this session.
 * Inserts the `session_rounds` row, advances the session pointer, and
 * returns the picked round. Returns null if no eligible rounds remain.
 */
export async function advanceSession(
  db: Db,
  args: { sessionId: string; rng?: Rng },
): Promise<{ roundId: string; roundIndex: number } | null> {
  const rng = args.rng ?? Math.random;

  const sessionRow = await db
    .from('game_sessions')
    .select('current_round_id')
    .eq('id', args.sessionId)
    .maybeSingle();
  if (sessionRow.error) throw sessionRow.error;
  const currentRoundId = sessionRow.data?.current_round_id ?? null;

  const played = await db
    .from('session_rounds')
    .select('round_index, round_id')
    .eq('session_id', args.sessionId);
  if (played.error) throw played.error;
  const playedRows = (played.data ?? []) as { round_index: number; round_id: string }[];
  const excludeIds = Array.from(
    new Set([...playedRows.map((r) => r.round_id), ...(currentRoundId ? [currentRoundId] : [])]),
  );
  const idx = nextRoundIndex(playedRows);

  let q = db.from('rounds').select('id').eq('status', 'auto_published');
  if (excludeIds.length > 0) {
    q = q.not('id', 'in', `(${excludeIds.join(',')})`);
  }
  const eligible = await q;
  if (eligible.error) throw eligible.error;

  const candidates = (eligible.data ?? []) as { id: string }[];
  const picked = pickRound(candidates, rng);
  if (!picked) return null;

  const inserted = await db
    .from('session_rounds')
    .insert({ session_id: args.sessionId, round_index: idx, round_id: picked.id });
  if (inserted.error) throw inserted.error;

  const updated = await db
    .from('game_sessions')
    .update({ current_round_id: picked.id, current_round_state: 'guessing' })
    .eq('id', args.sessionId);
  if (updated.error) throw updated.error;

  return { roundId: picked.id, roundIndex: idx };
}
