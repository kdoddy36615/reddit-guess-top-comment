import type { SupabaseClient } from '@supabase/supabase-js';
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
