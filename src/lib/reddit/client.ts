import { RedditCommentsResponseSchema, RedditListingSchema, type RedditPostData } from './schemas';

export type RedditPost = {
  id: string;
  title: string;
  subreddit: string;
  permalink: string;
  url: string;
  score: number;
  stickied: boolean;
  over_18: boolean;
  is_video: boolean;
  post_hint?: string;
  /**
   * Full raw Reddit post `data` object (preview, gallery_data, media_metadata,
   * thumbnail, domain, etc.). Persisted to `rounds.reddit_data` so future
   * slices can render attached images without re-fetching Reddit.
   */
  raw: Record<string, unknown>;
};

export type RedditClientOptions = {
  fetch?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  userAgent: string;
  baseUrl?: string;
};

export type RedditComment = {
  id: string;
  body: string;
  author: string;
  score: number;
};

export type RedditClient = {
  listTopPosts(
    sub: string,
    period: 'day' | 'week' | 'month' | 'year' | 'all',
  ): Promise<RedditPost[]>;
  getTopComment(postId: string, sub: string): Promise<RedditComment | null>;
};

const BACKOFF_MS = [5_000, 15_000, 45_000] as const;

export function createRedditClient(opts: RedditClientOptions): RedditClient {
  const fetchImpl = opts.fetch ?? globalThis.fetch;
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const baseUrl = opts.baseUrl ?? 'https://www.reddit.com';

  function fromData(d: RedditPostData): RedditPost {
    return {
      id: d.id,
      title: d.title,
      subreddit: d.subreddit,
      permalink: d.permalink,
      url: d.url,
      score: d.score,
      stickied: d.stickied,
      over_18: d.over_18,
      is_video: d.is_video,
      post_hint: d.post_hint,
      raw: d as unknown as Record<string, unknown>,
    };
  }

  // Fetch a Reddit URL with retries on transient errors (429/503).
  // 401/403 → halt immediately (auth/UA problem; retries won't help).
  // After the configured backoff schedule is exhausted, halt the script.
  async function fetchWithRetry(url: string): Promise<Response> {
    for (let attempt = 0; ; attempt++) {
      const res = await fetchImpl(url, {
        headers: { 'User-Agent': opts.userAgent, accept: 'application/json' },
      });
      if (res.ok) return res;
      if (res.status === 401 || res.status === 403) {
        throw new Error(`Reddit auth failure (${res.status}) — halting`);
      }
      if (res.status === 429 || res.status === 503) {
        if (attempt >= BACKOFF_MS.length) {
          throw new Error(`Reddit ${res.status} after ${BACKOFF_MS.length} retries — halting`);
        }
        await sleep(BACKOFF_MS[attempt]);
        continue;
      }
      throw new Error(`Reddit unexpected status ${res.status}`);
    }
  }

  return {
    async listTopPosts(sub, period) {
      const url = `${baseUrl}/r/${sub}/top.json?t=${period}&limit=100&raw_json=1`;
      const res = await fetchWithRetry(url);
      const json = await res.json();
      const parsed = RedditListingSchema.parse(json);
      return parsed.data.children.map((c) => fromData(c.data));
    },

    async getTopComment(postId, sub) {
      const url = `${baseUrl}/r/${sub}/comments/${postId}.json?sort=top&limit=1&raw_json=1`;
      const res = await fetchWithRetry(url);
      const json = await res.json();
      const [, commentsListing] = RedditCommentsResponseSchema.parse(json);
      for (const child of commentsListing.data.children) {
        if (child.kind === 't1') {
          const d = child.data;
          return { id: d.id, body: d.body, author: d.author, score: d.score };
        }
      }
      return null;
    },
  };
}
