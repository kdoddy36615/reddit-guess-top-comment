import { describe, expect, it } from 'vitest';
import { reactionFor } from './reaction';

describe('reactionFor', () => {
  it('returns "Way Off" for low scores', () => {
    expect(reactionFor(0).band).toBe('way_off');
    expect(reactionFor(20).band).toBe('way_off');
  });

  it('returns "Almost" for low-mid scores', () => {
    expect(reactionFor(40).band).toBe('almost');
  });

  it('returns "Close" for mid-high scores', () => {
    expect(reactionFor(70).band).toBe('close');
  });

  it('returns "Bullseye" for high scores', () => {
    expect(reactionFor(95).band).toBe('bullseye');
    expect(reactionFor(100).band).toBe('bullseye');
  });

  it('attaches a human-readable label and message to every band', () => {
    for (const s of [0, 30, 60, 90]) {
      const r = reactionFor(s);
      expect(r.label).toBeTruthy();
      expect(r.message).toBeTruthy();
    }
  });
});
