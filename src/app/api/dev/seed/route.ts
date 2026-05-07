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

async function ensureSampleRound(db: ReturnType<typeof createServiceRoleClient>): Promise<string> {
  const sample = {
    reddit_post_id: 'seed_round_001',
    subreddit: 'tifu',
    title: 'TIFU by trying to impress my date with my pasta-cooking skills',
    post_url: 'https://reddit.com/r/tifu/seed_round_001',
    post_score: 1234,
    top_comment_text:
      "She's never going to forget the smoke detector duet during the spaghetti fire.",
    top_comment_score: 5678,
    gate_verdict: 'publish' as const,
    gate_reasoning: 'seed: hand-picked example with a clear punchline',
    difficulty: 'easy' as const,
    punchline_word: 'spaghetti',
    key_noun: 'smoke detector',
    joke_structure: 'callback',
    status: 'auto_published' as const,
    published_at: new Date().toISOString(),
  };

  const values = await embedText(sample.top_comment_text);
  const pgvector = `[${values.join(',')}]`;

  const { data, error } = await db
    .from('rounds')
    .upsert({ ...sample, comment_embedding: pgvector }, { onConflict: 'reddit_post_id' })
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
    const roundId = await ensureSampleRound(db);
    return NextResponse.json({ ok: true, roundId, url: `/round/${roundId}` });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
