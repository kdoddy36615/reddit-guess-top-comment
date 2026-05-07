// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { createRedditClient } from './client';

type FetchArgs = Parameters<typeof fetch>;

function fakeFetch(impl: (...args: FetchArgs) => Promise<Response>) {
  return vi.fn(impl);
}

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
    ...init,
  });
}

function commentsPayload(
  comments: Array<Partial<{ id: string; body: string; author: string; score: number }>>,
  opts: { withMore?: boolean } = {},
) {
  return [
    { kind: 'Listing', data: { children: [] } },
    {
      kind: 'Listing',
      data: {
        children: [
          ...comments.map((c) => ({
            kind: 't1',
            data: {
              id: c.id ?? 'c1',
              body: c.body ?? 'because reasons',
              author: c.author ?? 'someone',
              score: c.score ?? 1000,
            },
          })),
          ...(opts.withMore ? [{ kind: 'more', data: { children: [] } }] : []),
        ],
      },
    },
  ];
}

function listingPayload(posts: Array<Partial<{ id: string; title: string; subreddit: string }>>) {
  return {
    kind: 'Listing',
    data: {
      children: posts.map((p) => ({
        kind: 't3',
        data: {
          id: p.id ?? 'abc',
          title: p.title ?? 'a title',
          subreddit: p.subreddit ?? 'tifu',
          permalink: `/r/${p.subreddit ?? 'tifu'}/comments/${p.id ?? 'abc'}/x/`,
          url: `https://www.reddit.com/r/${p.subreddit ?? 'tifu'}/comments/${p.id ?? 'abc'}/x/`,
          score: 100,
          stickied: false,
          over_18: false,
          is_video: false,
        },
      })),
    },
  };
}

describe('createRedditClient — listTopPosts', () => {
  it('returns posts parsed from a 200 OK listing response', async () => {
    const fetch = fakeFetch(async () =>
      jsonResponse(
        listingPayload([
          { id: 'p1', title: 'TIFU by frying my router', subreddit: 'tifu' },
          { id: 'p2', title: 'TIFU by emailing the wrong group', subreddit: 'tifu' },
        ]),
      ),
    );
    const client = createRedditClient({ fetch, sleep: async () => {}, userAgent: 'ua/0.1' });

    const posts = await client.listTopPosts('tifu', 'year');

    expect(posts).toHaveLength(2);
    expect(posts[0]).toMatchObject({
      id: 'p1',
      title: 'TIFU by frying my router',
      subreddit: 'tifu',
    });
  });

  it('sends the configured User-Agent header and hits the period-scoped URL', async () => {
    const fetch = fakeFetch(async () => jsonResponse(listingPayload([{ id: 'p1' }])));
    const ua = 'reddit-guess-top-comment/0.1 ingest (by /u/somebody)';
    const client = createRedditClient({ fetch, sleep: async () => {}, userAgent: ua });

    await client.listTopPosts('AskReddit', 'year');

    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/r/AskReddit/top.json');
    expect(url).toContain('t=year');
    expect((init.headers as Record<string, string>)['User-Agent']).toBe(ua);
  });

  it('retries 429 with 5s/15s/45s backoff and recovers on the 4th attempt', async () => {
    const queue: Response[] = [
      new Response('rate', { status: 429 }),
      new Response('rate', { status: 429 }),
      new Response('rate', { status: 429 }),
      jsonResponse(listingPayload([{ id: 'p1' }])),
    ];
    const fetch = fakeFetch(async () => queue.shift() as Response);
    const sleep = vi.fn(async (_ms: number) => {});

    const client = createRedditClient({ fetch, sleep, userAgent: 'ua' });
    const posts = await client.listTopPosts('tifu', 'year');

    expect(posts).toHaveLength(1);
    expect(fetch).toHaveBeenCalledTimes(4);
    expect(sleep.mock.calls.map((c) => c[0])).toEqual([5_000, 15_000, 45_000]);
  });

  it('halts after 3 failed retries on 429', async () => {
    const fetch = fakeFetch(async () => new Response('rate', { status: 429 }));
    const sleep = vi.fn(async (_ms: number) => {});
    const client = createRedditClient({ fetch, sleep, userAgent: 'ua' });

    await expect(client.listTopPosts('tifu', 'year')).rejects.toThrow(/429|rate|halt/i);
    expect(fetch).toHaveBeenCalledTimes(4); // initial + 3 retries
  });

  it('treats 503 the same as 429 (backoff + retry)', async () => {
    const queue: Response[] = [
      new Response('busy', { status: 503 }),
      jsonResponse(listingPayload([{ id: 'p1' }])),
    ];
    const fetch = fakeFetch(async () => queue.shift() as Response);
    const sleep = vi.fn(async (_ms: number) => {});

    const client = createRedditClient({ fetch, sleep, userAgent: 'ua' });
    await client.listTopPosts('tifu', 'year');

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(5_000);
  });

  it('halts immediately on 401 with no retry', async () => {
    const fetch = fakeFetch(async () => new Response('forbidden', { status: 401 }));
    const sleep = vi.fn(async () => {});
    const client = createRedditClient({ fetch, sleep, userAgent: 'ua' });

    await expect(client.listTopPosts('tifu', 'year')).rejects.toThrow(/401|halt|auth/i);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it('halts immediately on 403 with no retry', async () => {
    const fetch = fakeFetch(async () => new Response('forbidden', { status: 403 }));
    const sleep = vi.fn(async () => {});
    const client = createRedditClient({ fetch, sleep, userAgent: 'ua' });

    await expect(client.listTopPosts('tifu', 'year')).rejects.toThrow(/403|halt|auth/i);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('preserves unknown Reddit fields on `raw` for forward-compat persistence', async () => {
    // Inject a child whose data includes image-related fields not on the schema.
    // We expect them to survive parsing and land on `raw` for `rounds.reddit_data`.
    const fetch = fakeFetch(async () =>
      jsonResponse({
        kind: 'Listing',
        data: {
          children: [
            {
              kind: 't3',
              data: {
                id: 'p1',
                title: 'a title that is long enough to pass filters',
                subreddit: 'tifu',
                permalink: '/r/tifu/comments/p1/x/',
                url: 'https://i.redd.it/abc.jpg',
                score: 1,
                stickied: false,
                over_18: false,
                is_video: false,
                is_gallery: true,
                domain: 'i.redd.it',
                thumbnail: 'https://b.thumbs.redditmedia.com/x.jpg',
                preview: { images: [{ source: { url: 'https://preview.redd.it/x.jpg' } }] },
              },
            },
          ],
        },
      }),
    );
    const client = createRedditClient({ fetch, sleep: async () => {}, userAgent: 'ua' });

    const [post] = await client.listTopPosts('tifu', 'year');

    expect(post.raw).toMatchObject({
      is_gallery: true,
      domain: 'i.redd.it',
      thumbnail: expect.any(String),
      preview: expect.any(Object),
    });
  });

  it('throws when the response shape fails Zod validation', async () => {
    const fetch = fakeFetch(async () => jsonResponse({ unexpected: true }));
    const client = createRedditClient({ fetch, sleep: async () => {}, userAgent: 'ua' });

    await expect(client.listTopPosts('tifu', 'year')).rejects.toThrow();
  });
});

describe('createRedditClient — getTopComment', () => {
  it('returns the first t1 child from the comments listing', async () => {
    const fetch = fakeFetch(async () =>
      jsonResponse(
        commentsPayload([
          { id: 'c1', body: 'spaghetti', author: 'u1', score: 9999 },
          { id: 'c2', body: 'next', author: 'u2', score: 100 },
        ]),
      ),
    );
    const client = createRedditClient({ fetch, sleep: async () => {}, userAgent: 'ua' });

    const c = await client.getTopComment('p1', 'tifu');
    expect(c).toMatchObject({ id: 'c1', body: 'spaghetti', author: 'u1', score: 9999 });
  });

  it('skips `more` placeholders and returns the first real comment', async () => {
    const fetch = fakeFetch(async () =>
      jsonResponse(commentsPayload([{ id: 'c1', body: 'real reply' }], { withMore: true })),
    );
    const client = createRedditClient({ fetch, sleep: async () => {}, userAgent: 'ua' });

    const c = await client.getTopComment('p1', 'tifu');
    expect(c?.id).toBe('c1');
  });

  it('returns null when there are no comments', async () => {
    const fetch = fakeFetch(async () => jsonResponse(commentsPayload([])));
    const client = createRedditClient({ fetch, sleep: async () => {}, userAgent: 'ua' });

    expect(await client.getTopComment('p1', 'tifu')).toBeNull();
  });

  it('hits the comments URL with sort=top', async () => {
    const fetch = fakeFetch(async () => jsonResponse(commentsPayload([{ id: 'c1' }])));
    const client = createRedditClient({ fetch, sleep: async () => {}, userAgent: 'ua' });

    await client.getTopComment('abc123', 'tifu');

    const [url] = fetch.mock.calls[0] as [string];
    expect(url).toContain('/r/tifu/comments/abc123');
    expect(url).toContain('sort=top');
  });

  it('shares the retry/halt path with listTopPosts (429 → backoff)', async () => {
    const queue: Response[] = [
      new Response('rate', { status: 429 }),
      jsonResponse(commentsPayload([{ id: 'c1' }])),
    ];
    const fetch = fakeFetch(async () => queue.shift() as Response);
    const sleep = vi.fn(async () => {});
    const client = createRedditClient({ fetch, sleep, userAgent: 'ua' });

    const c = await client.getTopComment('p1', 'tifu');
    expect(c?.id).toBe('c1');
    expect(sleep).toHaveBeenCalledWith(5_000);
  });
});
