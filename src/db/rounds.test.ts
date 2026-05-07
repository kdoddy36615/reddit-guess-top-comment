// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { getPublicRound, getRoundForScoring } from './rounds';

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
