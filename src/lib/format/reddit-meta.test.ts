import { describe, expect, it } from 'vitest';
import { formatPostAge, formatUpvotes } from './reddit-meta';

describe('formatUpvotes', () => {
  it('returns the raw number as a string under 1k', () => {
    expect(formatUpvotes(0)).toBe('0');
    expect(formatUpvotes(7)).toBe('7');
    expect(formatUpvotes(921)).toBe('921');
    expect(formatUpvotes(999)).toBe('999');
  });

  it('renders 1.0k–9.9k with one decimal place', () => {
    expect(formatUpvotes(1000)).toBe('1.0k');
    expect(formatUpvotes(1234)).toBe('1.2k');
    expect(formatUpvotes(6800)).toBe('6.8k');
    expect(formatUpvotes(9949)).toBe('9.9k');
  });

  it('renders 10k+ without a decimal', () => {
    expect(formatUpvotes(10000)).toBe('10k');
    expect(formatUpvotes(24100)).toBe('24k');
    expect(formatUpvotes(999_999)).toBe('1000k');
  });

  it('clamps negatives to 0', () => {
    expect(formatUpvotes(-5)).toBe('0');
  });
});

describe('formatPostAge', () => {
  const now = Date.UTC(2026, 4, 8, 12, 0, 0); // 2026-05-08T12:00:00Z

  it('returns minutes for sub-hour ages', () => {
    expect(formatPostAge(now / 1000 - 60 * 5, now)).toBe('5m');
    expect(formatPostAge(now / 1000 - 60 * 36, now)).toBe('36m');
  });

  it('returns hours for sub-day ages', () => {
    expect(formatPostAge(now / 1000 - 60 * 60 * 8, now)).toBe('8h');
  });

  it('returns days beyond 24 hours', () => {
    expect(formatPostAge(now / 1000 - 60 * 60 * 24 * 3, now)).toBe('3d');
  });

  it('returns "—" for null/undefined input', () => {
    expect(formatPostAge(null, now)).toBe('—');
    expect(formatPostAge(undefined, now)).toBe('—');
  });

  it('returns "now" for ages under a minute', () => {
    expect(formatPostAge(now / 1000 - 30, now)).toBe('now');
  });
});
