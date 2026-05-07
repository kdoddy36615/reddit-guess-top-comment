/**
 * Slice 1 dev seed (round only). Hit once after starting the dev server:
 *   curl -X POST http://localhost:3000/api/dev/seed
 *
 * Idempotent: re-running upserts the same round.
 *
 * Inserts one `rounds` row in `auto_published` status with a real Gemini
 * embedding. Player identity is now real (Supabase signInAnonymously) and
 * created on first visit, so this endpoint no longer manages a test player.
 *
 * Returns the seeded round id so the client can navigate to it.
 *
 * To be removed after slice 2 (real ingestion replaces the manual seed).
 */
import { type NextRequest, NextResponse } from 'next/server';
import { embedText } from '@/lib/gemini/embed';
import { createServiceRoleClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Sample = {
  reddit_post_id: string;
  subreddit: string;
  title: string;
  post_url: string;
  post_score: number;
  top_comment_text: string;
  top_comment_score: number;
  gate_verdict: 'publish';
  gate_reasoning: string;
  difficulty: 'easy' | 'medium' | 'hard';
  punchline_word: string | null;
  key_noun: string | null;
  joke_structure: string | null;
  status: 'auto_published';
};

const SAMPLES: Sample[] = [
  {
    reddit_post_id: 'seed_round_001',
    subreddit: 'tifu',
    title: 'TIFU by trying to impress my date with my pasta-cooking skills',
    post_url: 'https://reddit.com/r/tifu/seed_round_001',
    post_score: 1234,
    top_comment_text:
      "She's never going to forget the smoke detector duet during the spaghetti fire.",
    top_comment_score: 5678,
    gate_verdict: 'publish',
    gate_reasoning: 'seed: hand-picked example with a clear punchline',
    difficulty: 'easy',
    punchline_word: 'spaghetti',
    key_noun: 'smoke detector',
    joke_structure: 'callback',
    status: 'auto_published',
  },
  {
    reddit_post_id: 'seed_round_002',
    subreddit: 'AskReddit',
    title: "What's the most useless skill you have?",
    post_url: 'https://reddit.com/r/AskReddit/seed_round_002',
    post_score: 4321,
    top_comment_text: 'I can recite the entire Bee Movie script from memory.',
    top_comment_score: 9000,
    gate_verdict: 'publish',
    gate_reasoning: 'seed: classic absurdist payoff',
    difficulty: 'medium',
    punchline_word: 'Bee Movie',
    key_noun: 'script',
    joke_structure: 'absurd_specificity',
    status: 'auto_published',
  },
  {
    reddit_post_id: 'seed_round_003',
    subreddit: 'Showerthoughts',
    title: 'If you replaced all your blood with coffee, you would have a really bad day.',
    post_url: 'https://reddit.com/r/Showerthoughts/seed_round_003',
    post_score: 777,
    top_comment_text: 'But a really productive last hour.',
    top_comment_score: 3210,
    gate_verdict: 'publish',
    gate_reasoning: 'seed: short setup, sharp turn',
    difficulty: 'medium',
    punchline_word: 'productive',
    key_noun: 'hour',
    joke_structure: 'reframe',
    status: 'auto_published',
  },
];

async function upsertSample(
  db: ReturnType<typeof createServiceRoleClient>,
  sample: Sample,
): Promise<string> {
  const existing = await db
    .from('rounds')
    .select('id, comment_embedding')
    .eq('reddit_post_id', sample.reddit_post_id)
    .maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data?.comment_embedding) {
    return existing.data.id;
  }

  const values = await embedText(sample.top_comment_text);
  const pgvector = `[${values.join(',')}]`;

  const { data, error } = await db
    .from('rounds')
    .upsert(
      { ...sample, comment_embedding: pgvector, published_at: new Date().toISOString() },
      { onConflict: 'reddit_post_id' },
    )
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

export async function POST(_req: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Disabled in production' }, { status: 403 });
  }
  try {
    const db = createServiceRoleClient();
    const ids = await Promise.all(SAMPLES.map((s) => upsertSample(db, s)));
    return NextResponse.json({ ok: true, roundIds: ids, firstUrl: `/round/${ids[0]}` });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
