import type { SupabaseClient } from '@supabase/supabase-js';
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

export async function getSessionState(db: Db, sessionId: string): Promise<RoundState | null> {
  const { data, error } = await db
    .from('game_sessions')
    .select('current_round_state')
    .eq('id', sessionId)
    .maybeSingle();
  if (error) throw error;
  return (data?.current_round_state as RoundState) ?? null;
}
