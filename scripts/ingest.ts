/**
 * Reddit ingest script — scrape-based, frozen-corpus MVP.
 *
 *   pnpm ingest
 *
 * For each subreddit in `src/config/subreddits.ts`:
 *   1. listTopPosts(sub, 'year') — public Reddit JSON, no auth
 *   2. for each post: pre-flight skip → deterministic filters → fetch top comment
 *      → deterministic comment filters → Gemini gate → if publish, embed +
 *      insert auto_published; if reject, insert rejected (durable, not re-gated).
 *
 * Per-post writes are independent — Ctrl+C is safe; re-run resumes via the
 * pre-flight skip on `reddit_post_id`. Phase 1.5 swaps in OAuth Reddit + cron
 * by changing only `src/lib/reddit/client.ts`'s baseUrl + auth header.
 */

import { env } from '@/config/env';
import { SUBREDDIT_ALLOWLIST } from '@/config/subreddits';
import { embedText } from '@/lib/gemini/embed';
import { gate } from '@/lib/gemini/gate';
import { createRedditClient, type RedditClient, type RedditPost } from '@/lib/reddit/client';
import type { Json } from '@/lib/supabase/database.types';
import { createServiceRoleClient } from '@/lib/supabase/server';

type Db = ReturnType<typeof createServiceRoleClient>;

const PACING_MS = 1500;
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

const counts = { published: 0, rejected: 0, skipped: 0, errored: 0 };

function postLevelSkipReason(post: RedditPost): string | null {
  if (post.stickied) return 'stickied';
  if (post.over_18) return 'NSFW';
  if (post.is_video) return 'video';
  if (post.post_hint === 'image') return 'image';
  if (post.title.length < 20) return 'short title';
  return null;
}

function commentLevelSkipReason(comment: { body: string; author: string } | null): string | null {
  if (!comment) return 'no comments';
  if (comment.body === '[deleted]' || comment.body === '[removed]') return 'deleted comment';
  if (comment.author === 'AutoModerator') return 'AutoMod comment';
  if (comment.body.length < 15) return 'short comment';
  return null;
}

// Crude classifier for errors that should halt the script (auth/quota/config)
// vs. errors that are per-post and should be logged + skipped (transient SDK
// failures, single insert failures, parse blips).
function isHaltingError(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  if (msg.includes('halting')) return true; // raised by the reddit client
  if (msg.includes('api key') || msg.includes('api_key')) return true;
  if (msg.includes('authentication') || msg.includes('unauthenticated')) return true;
  if (msg.includes('permission') || msg.includes('forbidden')) return true;
  if (msg.includes('quota') || msg.includes('rate limit exceeded')) return true;
  if (msg.includes('invalid jwt') || msg.includes('jwt expired')) return true;
  return false;
}

async function alreadyIngested(db: Db, redditPostId: string): Promise<boolean> {
  const { data, error } = await db
    .from('rounds')
    .select('id')
    .eq('reddit_post_id', redditPostId)
    .maybeSingle();
  if (error) throw error;
  return data !== null;
}

async function processPost(
  db: Db,
  reddit: RedditClient,
  post: RedditPost,
): Promise<
  | { kind: 'published' | 'rejected'; difficulty: string; tagsStr?: string }
  | { kind: 'skipped'; reason: string }
> {
  if (await alreadyIngested(db, post.id)) {
    return { kind: 'skipped', reason: 'already ingested' };
  }
  const postSkip = postLevelSkipReason(post);
  if (postSkip) return { kind: 'skipped', reason: postSkip };

  const comment = await reddit.getTopComment(post.id, post.subreddit);
  await sleep(PACING_MS); // pace the Reddit calls

  const commentSkip = commentLevelSkipReason(comment);
  if (commentSkip || !comment) return { kind: 'skipped', reason: commentSkip ?? 'no comment' };

  const gateResult = await gate({
    post: { title: post.title, subreddit: post.subreddit },
    comment: { body: comment.body },
  });

  const baseRow = {
    reddit_post_id: post.id,
    subreddit: post.subreddit,
    title: post.title,
    post_url: `https://www.reddit.com${post.permalink}`,
    post_score: post.score,
    top_comment_text: comment.body,
    top_comment_score: comment.score,
    gate_verdict: gateResult.verdict,
    gate_reasoning: gateResult.reasoning,
    difficulty: gateResult.difficulty,
    punchline_word: gateResult.tags.punchline_word,
    key_noun: gateResult.tags.key_noun,
    joke_structure: gateResult.tags.joke_structure,
    reddit_data: post.raw as Json,
  };

  if (gateResult.verdict === 'reject') {
    const { error } = await db.from('rounds').insert({ ...baseRow, status: 'rejected' });
    if (error) throw error;
    return { kind: 'rejected', difficulty: gateResult.difficulty };
  }

  const values = await embedText(comment.body);
  const pgvector = `[${values.join(',')}]`;
  const { error } = await db.from('rounds').insert({
    ...baseRow,
    comment_embedding: pgvector,
    status: 'auto_published',
    published_at: new Date().toISOString(),
  });
  if (error) throw error;

  const tagsStr = [
    gateResult.tags.punchline_word && '+punchline',
    gateResult.tags.key_noun && '+key_noun',
    gateResult.tags.joke_structure && '+structure',
  ]
    .filter(Boolean)
    .join(' ');
  return { kind: 'published', difficulty: gateResult.difficulty, tagsStr };
}

async function main() {
  const ua = env.REDDIT_USER_AGENT ?? 'reddit-guess-top-comment/0.1 ingest (by /u/anon)';
  const reddit = createRedditClient({ userAgent: ua });
  const db = createServiceRoleClient();

  for (const sub of SUBREDDIT_ALLOWLIST) {
    let posts: RedditPost[];
    try {
      posts = await reddit.listTopPosts(sub, 'year');
    } catch (err) {
      console.error(`r/${sub} listTopPosts FAILED — ${err instanceof Error ? err.message : err}`);
      if (isHaltingError(err)) throw err;
      continue;
    }
    await sleep(PACING_MS);

    for (let i = 0; i < posts.length; i++) {
      const post = posts[i];
      const tag = `[${i + 1}/${posts.length}] r/${sub}/${post.id}`;
      try {
        const r = await processPost(db, reddit, post);
        if (r.kind === 'skipped') {
          counts.skipped++;
          console.log(`${tag} — skipped: ${r.reason}`);
        } else if (r.kind === 'rejected') {
          counts.rejected++;
          console.log(`${tag} — rejected (${r.difficulty})`);
        } else {
          counts.published++;
          console.log(`${tag} — published (${r.difficulty}${r.tagsStr ? `, ${r.tagsStr}` : ''})`);
        }
      } catch (err) {
        counts.errored++;
        const msg = err instanceof Error ? err.message : String(err);
        console.log(`${tag} — ERROR: ${msg}`);
        if (isHaltingError(err)) throw err;
      }
    }
  }
}

main()
  .then(() => {
    console.log(
      `\nSummary: published=${counts.published} rejected=${counts.rejected} skipped=${counts.skipped} errored=${counts.errored}`,
    );
    process.exit(0);
  })
  .catch((err) => {
    console.error(
      `\nHALTED: ${err instanceof Error ? err.message : err}\n` +
        `Summary: published=${counts.published} rejected=${counts.rejected} skipped=${counts.skipped} errored=${counts.errored}`,
    );
    process.exit(1);
  });
