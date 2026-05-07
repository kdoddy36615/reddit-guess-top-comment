import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';

type Db = SupabaseClient<Database>;

export type RoundForGuessing = {
  id: string;
  title: string;
  subreddit: string;
  difficulty: 'easy' | 'medium' | 'hard';
};

export type RoundForScoring = RoundForGuessing & {
  topCommentText: string;
  commentEmbedding: number[];
  punchlineWord: string | null;
  keyNoun: string | null;
  jokeStructure: string | null;
};

function parsePgvector(s: string | null): number[] {
  if (!s) return [];
  // pgvector serializes as "[0.1,0.2,...]"
  const trimmed = s.replace(/^\[|\]$/g, '');
  return trimmed.split(',').map(Number);
}

/** Public-facing round info for the round page (NO top comment). */
export async function getPublicRound(db: Db, id: string): Promise<RoundForGuessing | null> {
  const { data, error } = await db
    .from('rounds')
    .select('id, title, subreddit, difficulty')
    .eq('id', id)
    .eq('status', 'auto_published')
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return data;
}

/** Full round details including the top comment + embedding. Service-role only. */
export async function getRoundForScoring(db: Db, id: string): Promise<RoundForScoring | null> {
  const { data, error } = await db
    .from('rounds')
    .select(
      'id, title, subreddit, difficulty, top_comment_text, comment_embedding, punchline_word, key_noun, joke_structure',
    )
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id,
    title: data.title,
    subreddit: data.subreddit,
    difficulty: data.difficulty,
    topCommentText: data.top_comment_text,
    commentEmbedding: parsePgvector(data.comment_embedding),
    punchlineWord: data.punchline_word,
    keyNoun: data.key_noun,
    jokeStructure: data.joke_structure,
  };
}

/** Just the top comment text. Used by the reveal endpoint after a guess. */
export async function getRoundReveal(
  db: Db,
  id: string,
): Promise<{ topCommentText: string } | null> {
  const { data, error } = await db
    .from('rounds')
    .select('top_comment_text')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { topCommentText: data.top_comment_text };
}
