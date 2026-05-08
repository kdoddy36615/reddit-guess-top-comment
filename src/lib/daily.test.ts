import { describe, expect, it } from 'vitest';
import { dailyRoomId, pickDailyRounds, timeUntilNextDailyReset } from './daily';

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

describe('timeUntilNextDailyReset', () => {
  it('returns a full 24h window at exactly UTC midnight (today only just started)', () => {
    const now = new Date('2026-05-08T00:00:00Z');
    const r = timeUntilNextDailyReset(now);
    expect(r.totalSeconds).toBe(24 * 60 * 60);
    expect(r.hours).toBe(24);
    expect(r.minutes).toBe(0);
    expect(r.seconds).toBe(0);
  });

  it('counts down to the *next* UTC midnight from a mid-day instant', () => {
    // 2026-05-08T03:48:12Z → next reset 2026-05-09T00:00:00Z = 20h 11m 48s
    const now = new Date('2026-05-08T03:48:12Z');
    const r = timeUntilNextDailyReset(now);
    expect(r.hours).toBe(20);
    expect(r.minutes).toBe(11);
    expect(r.seconds).toBe(48);
    expect(r.totalSeconds).toBe(20 * 3600 + 11 * 60 + 48);
  });

  it('rolls over correctly across the day boundary', () => {
    // One second before UTC midnight.
    const now = new Date('2026-05-08T23:59:59Z');
    const r = timeUntilNextDailyReset(now);
    expect(r.totalSeconds).toBe(1);
    expect(r.hours).toBe(0);
    expect(r.minutes).toBe(0);
    expect(r.seconds).toBe(1);
  });
});
