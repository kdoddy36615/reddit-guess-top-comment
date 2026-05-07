import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';
import type { ScoreBreakdown } from '@/scoring';

type Db = SupabaseClient<Database>;

export async function insertGuess(
  db: Db,
  args: {
    sessionId: string;
    roundId: string;
    playerId: string;
    guessText: string;
    score: number;
    breakdown: ScoreBreakdown;
  },
): Promise<{ id: string }> {
  const { data, error } = await db
    .from('guesses')
    .insert({
      session_id: args.sessionId,
      round_id: args.roundId,
      player_id: args.playerId,
      guess_text: args.guessText,
      score: args.score,
      score_breakdown:
        args.breakdown as unknown as Database['public']['Tables']['guesses']['Insert']['score_breakdown'],
    })
    .select('id')
    .single();
  if (error) throw error;
  return { id: data.id };
}

export async function findGuess(
  db: Db,
  args: { sessionId: string; roundId: string; playerId: string },
): Promise<{ score: number; guessText: string } | null> {
  const { data, error } = await db
    .from('guesses')
    .select('score, guess_text')
    .eq('session_id', args.sessionId)
    .eq('round_id', args.roundId)
    .eq('player_id', args.playerId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { score: data.score, guessText: data.guess_text };
}
