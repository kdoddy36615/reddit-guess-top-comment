import { describe, expect, it } from 'vitest';
import { ADJECTIVES, ANIMALS, generateNickname } from './generate';
import { MAX_NICKNAME_LENGTH, validateNickname } from './validation';

describe('word lists', () => {
  it('has at least 50 adjectives', () => {
    expect(ADJECTIVES.length).toBeGreaterThanOrEqual(50);
  });

  it('has at least 50 animals', () => {
    expect(ANIMALS.length).toBeGreaterThanOrEqual(50);
  });

  it('contains no duplicates in either pool', () => {
    expect(new Set(ADJECTIVES).size).toBe(ADJECTIVES.length);
    expect(new Set(ANIMALS).size).toBe(ANIMALS.length);
  });

  it('keeps every adjective+animal combo within the max-length limit', () => {
    // Round-trip with validation downstream depends on this; checking
    // explicitly here makes the failure mode obvious if a long word slips in.
    for (const adj of ADJECTIVES) {
      for (const animal of ANIMALS) {
        const combined = `${adj} ${animal}`;
        expect(combined.length).toBeLessThanOrEqual(MAX_NICKNAME_LENGTH);
      }
    }
  });
});

describe('generateNickname', () => {
  it('returns a non-empty string', () => {
    const nick = generateNickname();
    expect(typeof nick).toBe('string');
    expect(nick.length).toBeGreaterThan(0);
  });

  it('produces "adjective animal" shape (single space, both pools)', () => {
    const nick = generateNickname();
    const [first, second, ...rest] = nick.split(' ');
    expect(rest).toHaveLength(0);
    expect(ADJECTIVES).toContain(first);
    expect(ANIMALS).toContain(second);
  });

  it('passes validateNickname (round-trip) across many samples', () => {
    for (let i = 0; i < 200; i += 1) {
      const nick = generateNickname();
      const result = validateNickname(nick);
      expect(result.ok, `generated nickname "${nick}" failed validation`).toBe(true);
    }
  });

  it('uses the provided RNG when injected (deterministic)', () => {
    // 0 picks index 0 from each pool — full determinism check.
    const nick = generateNickname({ random: () => 0 });
    expect(nick).toBe(`${ADJECTIVES[0]} ${ANIMALS[0]}`);
  });

  it('explores both pools across many calls (not stuck on one combo)', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 200; i += 1) seen.add(generateNickname());
    // 50 × 50 = 2500 combos, 200 random samples should easily yield >5 unique.
    expect(seen.size).toBeGreaterThan(5);
  });
});
