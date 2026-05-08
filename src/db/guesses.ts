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

/**
 * Lifetime guess count for a single player. Used by /account's "lifetime
 * guesses played" stat card.
 */
export async function countGuessesForPlayer(db: Db, args: { playerId: string }): Promise<number> {
  const { count, error } = await db
    .from('guesses')
    .select('id', { count: 'exact', head: true })
    .eq('player_id', args.playerId);
  if (error) throw error;
  return count ?? 0;
}

/**
 * Every guess this player has ever submitted, joined to the round's subreddit.
 * Used by /account's "top subreddits by accuracy" stat card. The result-set
 * is bounded by the player's lifetime guess count, which stays small for
 * MVP-era players (round count + freeplay caps).
 */
export async function selectGuessSubredditsForPlayer(
  db: Db,
  args: { playerId: string },
): Promise<{ subreddit: string; score: number }[]> {
  const { data, error } = await db
    .from('guesses')
    .select('score, rounds!inner ( subreddit )')
    .eq('player_id', args.playerId);
  if (error) throw error;
  type Row = { score: number; rounds: { subreddit: string } | { subreddit: string }[] | null };
  return ((data ?? []) as Row[]).flatMap((r) => {
    const round = Array.isArray(r.rounds) ? r.rounds[0] : r.rounds;
    if (!round) return [];
    return [{ subreddit: round.subreddit, score: r.score }];
  });
}
