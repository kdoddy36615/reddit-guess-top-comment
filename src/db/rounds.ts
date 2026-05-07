import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';

type Db = SupabaseClient<Database>;

// `difficulty` is enforced as enum-like by a CHECK constraint in the migration,
// but Supabase's type gen produces a plain `string` for CHECK-constrained
// columns. Narrow at the wrapper boundary.
type Difficulty = 'easy' | 'medium' | 'hard';

export type RoundForGuessing = {
  id: string;
  title: string;
  subreddit: string;
  difficulty: Difficulty;
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
  return { ...data, difficulty: data.difficulty as Difficulty };
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
    difficulty: data.difficulty as Difficulty,
    topCommentText: data.top_comment_text,
    commentEmbedding: parsePgvector(data.comment_embedding),
    punchlineWord: data.punchline_word,
    keyNoun: data.key_noun,
    jokeStructure: data.joke_structure,
  };
}

export type SitemapRoundRow = { id: string; publishedAt: string };

/** Page through `auto_published` rounds for sitemap generation. */
export async function listAutoPublishedForSitemap(
  db: Db,
  opts: { offset: number; limit: number },
): Promise<SitemapRoundRow[]> {
  const { offset, limit } = opts;
  const { data, error } = await db
    .from('rounds')
    .select('id, published_at')
    .eq('status', 'auto_published')
    .order('published_at', { ascending: true })
    .range(offset, offset + limit - 1);
  if (error) throw error;
  return (data ?? []).map((r) => ({ id: r.id, publishedAt: r.published_at as string }));
}

/** Count of `auto_published` rounds. Used to compute sitemap shard count. */
export async function countAutoPublishedRounds(db: Db): Promise<number> {
  const { count, error } = await db
    .from('rounds')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'auto_published');
  if (error) throw error;
  return count ?? 0;
}

/**
 * Other auto_published rounds in the same subreddit, for the
 * "More from r/{sub}" sidebar that builds the internal link graph.
 */
export async function listMoreFromSubreddit(
  db: Db,
  args: { subreddit: string; excludeRoundId: string; limit: number },
): Promise<{ id: string; title: string }[]> {
  const { data, error } = await db
    .from('rounds')
    .select('id, title')
    .eq('status', 'auto_published')
    .eq('subreddit', args.subreddit)
    .neq('id', args.excludeRoundId)
    .order('published_at', { ascending: false })
    .limit(args.limit);
  if (error) throw error;
  return (data ?? []).map((r) => ({ id: r.id, title: r.title }));
}

export type ArchiveRoundRow = {
  id: string;
  title: string;
  subreddit: string;
  publishedAt: string;
};

/** Page of auto_published rounds for /archive — newest first. */
export async function listAutoPublishedForArchive(
  db: Db,
  opts: { offset: number; limit: number },
): Promise<ArchiveRoundRow[]> {
  const { offset, limit } = opts;
  const { data, error } = await db
    .from('rounds')
    .select('id, title, subreddit, published_at')
    .eq('status', 'auto_published')
    .order('published_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    title: r.title,
    subreddit: r.subreddit,
    publishedAt: r.published_at as string,
  }));
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
