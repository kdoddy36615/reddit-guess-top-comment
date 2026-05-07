import { describe, expect, it } from 'vitest';
import { shareToken } from './share-token';

const PLAYER_A = '11111111-1111-1111-1111-111111111111';
const PLAYER_B = '22222222-2222-2222-2222-222222222222';
const ROUND_X = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const ROUND_Y = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

describe('shareToken', () => {
  it('returns an 8-char URL-safe string', () => {
    const token = shareToken(PLAYER_A, ROUND_X);
    expect(token).toHaveLength(8);
    expect(token).toMatch(/^[A-Za-z0-9_-]{8}$/);
  });

  it('is deterministic for the same inputs', () => {
    expect(shareToken(PLAYER_A, ROUND_X)).toBe(shareToken(PLAYER_A, ROUND_X));
  });

  it('produces distinct tokens across the (player, round) cross-product', () => {
    const tokens = new Set([
      shareToken(PLAYER_A, ROUND_X),
      shareToken(PLAYER_A, ROUND_Y),
      shareToken(PLAYER_B, ROUND_X),
      shareToken(PLAYER_B, ROUND_Y),
    ]);
    expect(tokens.size).toBe(4);
  });

  it('is order-sensitive (player vs round arg position matters)', () => {
    expect(shareToken(PLAYER_A, ROUND_X)).not.toBe(shareToken(ROUND_X, PLAYER_A));
  });
});
