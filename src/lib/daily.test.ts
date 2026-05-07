import { describe, expect, it } from 'vitest';
import { dailyRoomId, pickDailyRounds } from './daily';

describe('dailyRoomId', () => {
  it('formats a UTC date as daily-YYYY-MM-DD', () => {
    const date = new Date('2026-05-07T03:21:00Z');
    expect(dailyRoomId(date)).toBe('daily-2026-05-07');
  });

  it('uses UTC, not local time, near a day boundary', () => {
    // 2026-01-01 00:30 UTC is still 2026-01-01 in UTC even if local is Dec 31.
    const date = new Date('2026-01-01T00:30:00Z');
    expect(dailyRoomId(date)).toBe('daily-2026-01-01');
  });
});

describe('pickDailyRounds', () => {
  const candidates = [
    'aa11',
    'bb22',
    'cc33',
    'dd44',
    'ee55',
    'ff66',
    'gg77',
    'hh88',
    'ii99',
    'jj00',
    'kk11',
    'll22',
    'mm33',
    'nn44',
  ];

  it('returns the requested number of round ids', () => {
    const picks = pickDailyRounds(candidates, 'daily-2026-05-07', 5);
    expect(picks).toHaveLength(5);
  });

  it('is deterministic — same date and inputs yield identical picks', () => {
    const a = pickDailyRounds(candidates, 'daily-2026-05-07', 5);
    const b = pickDailyRounds(candidates, 'daily-2026-05-07', 5);
    expect(a).toEqual(b);
  });

  it('produces different picks for different dates', () => {
    const a = pickDailyRounds(candidates, 'daily-2026-05-07', 5);
    const b = pickDailyRounds(candidates, 'daily-2026-05-08', 5);
    expect(a).not.toEqual(b);
  });

  it('returns ids drawn from the candidate set with no duplicates', () => {
    const picks = pickDailyRounds(candidates, 'daily-2026-05-07', 5);
    expect(new Set(picks).size).toBe(picks.length);
    for (const id of picks) {
      expect(candidates).toContain(id);
    }
  });

  it('is stable under reordering of the input candidates', () => {
    const reversed = [...candidates].reverse();
    const a = pickDailyRounds(candidates, 'daily-2026-05-07', 5);
    const b = pickDailyRounds(reversed, 'daily-2026-05-07', 5);
    expect(new Set(a)).toEqual(new Set(b));
  });

  it('throws InsufficientRoundsError when there are fewer candidates than requested', async () => {
    const { InsufficientRoundsError } = await import('./daily');
    expect(() => pickDailyRounds(['a', 'b', 'c'], 'daily-2026-05-07', 5)).toThrow(
      InsufficientRoundsError,
    );
  });
});
