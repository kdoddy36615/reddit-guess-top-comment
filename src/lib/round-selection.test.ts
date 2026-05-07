import { describe, expect, it } from 'vitest';
import { nextRoundIndex, pickRound } from './round-selection';

describe('pickRound', () => {
  it('picks the first candidate when rng returns 0', () => {
    const candidates = [{ id: 'r1' }, { id: 'r2' }, { id: 'r3' }];
    expect(pickRound(candidates, () => 0)).toEqual({ id: 'r1' });
  });

  it('returns null when there are no candidates', () => {
    expect(pickRound([], () => 0)).toBeNull();
  });

  it('picks the last candidate when rng returns just under 1', () => {
    const candidates = [{ id: 'r1' }, { id: 'r2' }, { id: 'r3' }];
    expect(pickRound(candidates, () => 0.999)).toEqual({ id: 'r3' });
  });
});

describe('nextRoundIndex', () => {
  it('returns 0 when no rounds have been played', () => {
    expect(nextRoundIndex([])).toBe(0);
  });

  it('returns max+1 when prior rounds exist', () => {
    expect(nextRoundIndex([{ round_index: 0 }, { round_index: 1 }, { round_index: 2 }])).toBe(3);
  });
});
