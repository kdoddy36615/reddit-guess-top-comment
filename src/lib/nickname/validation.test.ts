import { describe, expect, it } from 'vitest';
import { MAX_NICKNAME_LENGTH, MIN_NICKNAME_LENGTH, validateNickname } from './validation';

describe('validateNickname', () => {
  it('accepts a typical nickname and returns the normalized form', () => {
    const result = validateNickname('kevin');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.normalized).toBe('kevin');
  });

  it('rejects strings shorter than the minimum length', () => {
    const result = validateNickname('a');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('too_short');
    }
  });

  it('rejects strings longer than the maximum length', () => {
    const result = validateNickname('a'.repeat(MAX_NICKNAME_LENGTH + 1));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('too_long');
  });

  it('rejects whitespace-only input as too short', () => {
    const result = validateNickname('     ');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('too_short');
  });

  it('rejects strings containing control characters', () => {
    const result = validateNickname('kevin');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('invalid_chars');
  });

  it('rejects strings containing profanity from the blocklist', () => {
    // Use a representative slur substring from the blocklist; we pick
    // "shit" as the canonical sample case so the test does not need to
    // hardcode the full list.
    const result = validateNickname('bigShitPanda');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('profanity');
  });

  it('normalizes by trimming surrounding whitespace', () => {
    const result = validateNickname('   kevin   ');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.normalized).toBe('kevin');
  });

  it('normalizes by collapsing internal runs of whitespace', () => {
    const result = validateNickname('kev    in');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.normalized).toBe('kev in');
  });

  it('normalizes tabs/newlines (whitespace) to a single space', () => {
    const result = validateNickname('kev\t\n\tin');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.normalized).toBe('kev in');
  });

  it('measures length against the normalized form (not the raw input)', () => {
    // 24 letters surrounded by whitespace — fits after trim.
    const raw = `   ${'a'.repeat(MAX_NICKNAME_LENGTH)}   `;
    const result = validateNickname(raw);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.normalized).toHaveLength(MAX_NICKNAME_LENGTH);
  });

  it('rejects non-string input defensively (e.g. null/undefined)', () => {
    const result = validateNickname(undefined as unknown as string);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('invalid_type');
  });

  it('exports the min/max constants', () => {
    expect(MIN_NICKNAME_LENGTH).toBe(2);
    expect(MAX_NICKNAME_LENGTH).toBe(24);
  });

  it('treats profanity-detection as case-insensitive', () => {
    const result = validateNickname('SHITbird');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('profanity');
  });
});
