// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { shareToken } from '@/lib/share-token';
import { findGuessByShareToken, listRecentGuessesForRound } from './guesses';

const ROUND_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const PLAYER_A = '11111111-1111-1111-1111-111111111111';
const PLAYER_B = '22222222-2222-2222-2222-222222222222';

type Row = {
  player_id: string;
  guess_text: string;
  score: number;
  players: { nickname: string };
};

function fakeDb(rows: Row[]) {
  const filters: Record<string, unknown> = {};
  const builder = {
    select: () => builder,
    eq: (col: string, val: unknown) => {
      filters[col] = val;
      return builder;
    },
    // biome-ignore lint/suspicious/noThenProperty: mocking PostgrestBuilder
    then: (resolve: (v: { data: Row[]; error: null }) => void) => {
      const filtered = rows.filter((r) =>
        Object.entries(filters).every(([col, val]) => {
          if (col === 'round_id') return val === undefined || true; // round filtering not tracked on rows
          return (r as unknown as Record<string, unknown>)[col] === val;
        }),
      );
      resolve({ data: filtered, error: null });
    },
  } as Record<string, unknown>;

  const from = (table: string) => {
    if (table !== 'guesses') throw new Error(`unexpected table: ${table}`);
    return builder;
  };

  return { db: { from } as never, filters };
}

describe('findGuessByShareToken', () => {
  it('returns the matching guess + player when the token resolves', async () => {
    const { db } = fakeDb([
      {
        player_id: PLAYER_A,
        guess_text: 'put it in rice',
        score: 92,
        players: { nickname: 'Kevin' },
      },
      { player_id: PLAYER_B, guess_text: 'no clue', score: 12, players: { nickname: 'Jules' } },
    ]);

    const token = shareToken(PLAYER_A, ROUND_ID);
    const result = await findGuessByShareToken(db, { roundId: ROUND_ID, token });

    expect(result).toEqual({
      playerId: PLAYER_A,
      nickname: 'Kevin',
      guessText: 'put it in rice',
      score: 92,
    });
  });

  it('returns null when no guess in the round produces the token', async () => {
    const { db } = fakeDb([
      { player_id: PLAYER_A, guess_text: 'a', score: 10, players: { nickname: 'A' } },
    ]);

    // A token that no (player, round) pair would produce
    const result = await findGuessByShareToken(db, { roundId: ROUND_ID, token: 'AAAAAAAA' });

    expect(result).toBeNull();
  });

  it('scopes the lookup to the round_id', async () => {
    const { db, filters } = fakeDb([
      { player_id: PLAYER_A, guess_text: 'g', score: 50, players: { nickname: 'A' } },
    ]);

    const token = shareToken(PLAYER_A, ROUND_ID);
    await findGuessByShareToken(db, { roundId: ROUND_ID, token });

    expect(filters.round_id).toBe(ROUND_ID);
  });
});

describe('listRecentGuessesForRound', () => {
  it('returns only anonymized guess_text — no scores or player ids leak', async () => {
    const builder: any = {
      select: vi.fn(() => builder),
      eq: vi.fn(() => builder),
      gte: vi.fn(() => builder),
      order: vi.fn(() => builder),
      limit: vi.fn(async () => ({
        data: [{ guess_text: 'spaghetti' }, { guess_text: 'a fork' }, { guess_text: 'rice trick' }],
        error: null,
      })),
    };
    const db = { from: vi.fn(() => builder) } as any;

    const rows = await listRecentGuessesForRound(db, {
      roundId: ROUND_ID,
      limit: 5,
      minScore: 40,
    });

    expect(db.from).toHaveBeenCalledWith('guesses');
    expect(builder.select).toHaveBeenCalledWith('guess_text');
    expect(builder.eq).toHaveBeenCalledWith('round_id', ROUND_ID);
    expect(builder.gte).toHaveBeenCalledWith('score', 40);
    expect(builder.order).toHaveBeenCalledWith('submitted_at', { ascending: false });
    expect(builder.limit).toHaveBeenCalledWith(5);
    expect(rows).toEqual([
      { guessText: 'spaghetti' },
      { guessText: 'a fork' },
      { guessText: 'rice trick' },
    ]);
  });

  it('returns [] when there are no qualifying guesses', async () => {
    const builder: any = {
      select: vi.fn(() => builder),
      eq: vi.fn(() => builder),
      gte: vi.fn(() => builder),
      order: vi.fn(() => builder),
      limit: vi.fn(async () => ({ data: null, error: null })),
    };
    const db = { from: vi.fn(() => builder) } as any;

    const rows = await listRecentGuessesForRound(db, {
      roundId: ROUND_ID,
      limit: 5,
      minScore: 40,
    });

    expect(rows).toEqual([]);
  });
});
