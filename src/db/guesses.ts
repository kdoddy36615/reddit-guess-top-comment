import type { SupabaseClient } from '@supabase/supabase-js';
import { shareToken } from '@/lib/share-token';
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

export type ShareResult = {
  playerId: string;
  nickname: string;
  guessText: string;
  score: number;
};

/**
 * Resolve a /round/[roundId]/result/[token] share URL back to the original
 * (player, score, guess). Tokens are deterministic hashes of (player, round),
 * so we scan all guesses scoped to the round and match by recomputing the
 * token. Bounded by the number of guesses on a single round.
 */
export async function findGuessByShareToken(
  db: Db,
  args: { roundId: string; token: string },
): Promise<ShareResult | null> {
  const { data, error } = await db
    .from('guesses')
    .select('player_id, guess_text, score, players ( nickname )')
    .eq('round_id', args.roundId);
  if (error) throw error;
  if (!data) return null;

  for (const row of data as Array<{
    player_id: string;
    guess_text: string;
    score: number;
    players: { nickname: string } | { nickname: string }[] | null;
  }>) {
    if (shareToken(row.player_id, args.roundId) !== args.token) continue;
    const player = Array.isArray(row.players) ? row.players[0] : row.players;
    if (!player) continue;
    return {
      playerId: row.player_id,
      nickname: player.nickname,
      guessText: row.guess_text,
      score: row.score,
    };
  }
  return null;
}
