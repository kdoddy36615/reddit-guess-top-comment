// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import {
  countAutoPublishedRounds,
  getPublicRound,
  getRoundForPlay,
  getRoundForScoring,
  listAutoPublishedForArchive,
  listAutoPublishedForSitemap,
  listMoreFromSubreddit,
} from './rounds';

function fakeDb(rows: Record<string, unknown>[]) {
  // Minimal builder mock that supports .from().select().eq().eq().maybeSingle()
  const stack: Record<string, unknown>[] = rows;
  const builder: any = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    maybeSingle: vi.fn(async () => ({ data: stack[0] ?? null, error: null })),
  };
  return { from: vi.fn(() => builder) } as any;
}

describe('getPublicRound', () => {
  it('returns only public-safe fields (no top comment)', async () => {
    const db = fakeDb([
      { id: 'r1', title: 'TIFU by saying X', subreddit: 'tifu', difficulty: 'easy' },
    ]);
    const result = await getPublicRound(db, 'r1');
    expect(result).toEqual({
      id: 'r1',
      title: 'TIFU by saying X',
      subreddit: 'tifu',
      difficulty: 'easy',
    });
  });

  it('returns null when no row matches', async () => {
    const db = fakeDb([]);
    expect(await getPublicRound(db, 'missing')).toBeNull();
  });
});

describe('getRoundForPlay', () => {
  it('returns post score and parses created_utc + selftext from reddit_data JSONB', async () => {
    const db = fakeDb([
      {
        id: 'r1',
        title: 'TIFU by saying X',
        subreddit: 'tifu',
        difficulty: 'easy',
        post_score: 24100,
        reddit_data: { created_utc: 1746700000, selftext: 'Long story short, ...' },
      },
    ]);
    const result = await getRoundForPlay(db, 'r1');
    expect(result).toEqual({
      id: 'r1',
      title: 'TIFU by saying X',
      subreddit: 'tifu',
      difficulty: 'easy',
      postScore: 24100,
      createdUtcSeconds: 1746700000,
      body: 'Long story short, ...',
    });
  });

  it('returns body=null and createdUtcSeconds=null when reddit_data is missing (pre-migration row)', async () => {
    const db = fakeDb([
      {
        id: 'r2',
        title: 'plain row',
        subreddit: 'showerthoughts',
        difficulty: 'medium',
        post_score: 921,
        reddit_data: null,
      },
    ]);
    const result = await getRoundForPlay(db, 'r2');
    expect(result).toEqual({
      id: 'r2',
      title: 'plain row',
      subreddit: 'showerthoughts',
      difficulty: 'medium',
      postScore: 921,
      createdUtcSeconds: null,
      body: null,
    });
  });

  it('drops empty selftext (link-only posts have selftext="")', async () => {
    const db = fakeDb([
      {
        id: 'r3',
        title: 'link post',
        subreddit: 'pics',
        difficulty: 'easy',
        post_score: 50,
        reddit_data: { created_utc: 1746700000, selftext: '   ' },
      },
    ]);
    const result = await getRoundForPlay(db, 'r3');
    expect(result?.body).toBeNull();
  });

  it('returns null when no row matches', async () => {
    const db = fakeDb([]);
    expect(await getRoundForPlay(db, 'missing')).toBeNull();
  });
});

describe('listAutoPublishedForSitemap', () => {
  it('returns id + publishedAt for paginated sitemap output, ordered by published_at asc for stable shards', async () => {
    const builder: any = {
      select: vi.fn(() => builder),
      eq: vi.fn(() => builder),
      order: vi.fn(() => builder),
      range: vi.fn(async () => ({
        data: [
          { id: 'r1', published_at: '2026-04-01T00:00:00Z' },
          { id: 'r2', published_at: '2026-04-02T00:00:00Z' },
        ],
        error: null,
      })),
    };
    const db = { from: vi.fn(() => builder) } as any;

    const rows = await listAutoPublishedForSitemap(db, { offset: 0, limit: 50000 });

    expect(db.from).toHaveBeenCalledWith('rounds');
    expect(builder.eq).toHaveBeenCalledWith('status', 'auto_published');
    expect(builder.order).toHaveBeenCalledWith('published_at', { ascending: true });
    expect(builder.range).toHaveBeenCalledWith(0, 49999);
    expect(rows).toEqual([
      { id: 'r1', publishedAt: '2026-04-01T00:00:00Z' },
      { id: 'r2', publishedAt: '2026-04-02T00:00:00Z' },
    ]);
  });
});

describe('countAutoPublishedRounds', () => {
  it('returns the total count of auto_published rounds for sitemap sharding', async () => {
    const builder: any = {
      select: vi.fn(() => builder),
      eq: vi.fn(async () => ({ count: 137, data: [], error: null })),
    };
    const db = { from: vi.fn(() => builder) } as any;
    const total = await countAutoPublishedRounds(db);
    expect(builder.select).toHaveBeenCalledWith('id', { count: 'exact', head: true });
    expect(builder.eq).toHaveBeenCalledWith('status', 'auto_published');
    expect(total).toBe(137);
  });

  it('returns 0 when count is null', async () => {
    const builder: any = {
      select: vi.fn(() => builder),
      eq: vi.fn(async () => ({ count: null, data: [], error: null })),
    };
    const db = { from: vi.fn(() => builder) } as any;
    expect(await countAutoPublishedRounds(db)).toBe(0);
  });
});

describe('listMoreFromSubreddit', () => {
  it('returns up to N other auto_published rounds in the same subreddit, excluding the current round', async () => {
    const builder: any = {
      select: vi.fn(() => builder),
      eq: vi.fn(() => builder),
      neq: vi.fn(() => builder),
      order: vi.fn(() => builder),
      limit: vi.fn(async () => ({
        data: [
          { id: 'r2', title: 'Title 2' },
          { id: 'r3', title: 'Title 3' },
        ],
        error: null,
      })),
    };
    const db = { from: vi.fn(() => builder) } as any;

    const rows = await listMoreFromSubreddit(db, {
      subreddit: 'tifu',
      excludeRoundId: 'r1',
      limit: 6,
    });

    expect(db.from).toHaveBeenCalledWith('rounds');
    expect(builder.select).toHaveBeenCalledWith('id, title');
    expect(builder.eq).toHaveBeenCalledWith('status', 'auto_published');
    expect(builder.eq).toHaveBeenCalledWith('subreddit', 'tifu');
    expect(builder.neq).toHaveBeenCalledWith('id', 'r1');
    expect(builder.order).toHaveBeenCalledWith('published_at', { ascending: false });
    expect(builder.limit).toHaveBeenCalledWith(6);
    expect(rows).toEqual([
      { id: 'r2', title: 'Title 2' },
      { id: 'r3', title: 'Title 3' },
    ]);
  });
});

describe('listAutoPublishedForArchive', () => {
  it('returns id + title + subreddit + publishedAt newest-first, paginated', async () => {
    const builder: any = {
      select: vi.fn(() => builder),
      eq: vi.fn(() => builder),
      order: vi.fn(() => builder),
      range: vi.fn(async () => ({
        data: [
          {
            id: 'r3',
            title: 'Newest',
            subreddit: 'tifu',
            published_at: '2026-04-03T00:00:00Z',
          },
          {
            id: 'r2',
            title: 'Older',
            subreddit: 'AskReddit',
            published_at: '2026-04-02T00:00:00Z',
          },
        ],
        error: null,
      })),
    };
    const db = { from: vi.fn(() => builder) } as any;

    const rows = await listAutoPublishedForArchive(db, { offset: 0, limit: 50 });

    expect(builder.eq).toHaveBeenCalledWith('status', 'auto_published');
    expect(builder.order).toHaveBeenCalledWith('published_at', { ascending: false });
    expect(builder.range).toHaveBeenCalledWith(0, 49);
    expect(rows).toEqual([
      { id: 'r3', title: 'Newest', subreddit: 'tifu', publishedAt: '2026-04-03T00:00:00Z' },
      { id: 'r2', title: 'Older', subreddit: 'AskReddit', publishedAt: '2026-04-02T00:00:00Z' },
    ]);
  });
});

describe('getRoundForScoring', () => {
  it('parses the pgvector embedding string into a number array', async () => {
    const db = fakeDb([
      {
        id: 'r1',
        title: 't',
        subreddit: 's',
        difficulty: 'easy',
        top_comment_text: 'spaghetti',
        comment_embedding: '[0.1,0.2,0.3]',
        punchline_word: 'spaghetti',
        key_noun: null,
        joke_structure: null,
      },
    ]);
    const result = await getRoundForScoring(db, 'r1');
    expect(result?.commentEmbedding).toEqual([0.1, 0.2, 0.3]);
    expect(result?.topCommentText).toBe('spaghetti');
  });
});
