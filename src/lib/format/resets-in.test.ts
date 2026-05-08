import { describe, expect, it } from 'vitest';
import { formatResetsIn } from './resets-in';

describe('formatResetsIn', () => {
  it('returns hh:mm until next UTC midnight when more than an hour remains', () => {
    // 2026-05-08 19:48:00 UTC → next UTC midnight is 4h 12m away.
    const now = new Date('2026-05-08T19:48:00.000Z');
    expect(formatResetsIn(now)).toBe('04:12');
  });

  it('rolls minutes that round up into the hour', () => {
    // 23:59:30 UTC → 0h 1m left (round up partial minute).
    const now = new Date('2026-05-08T23:59:30.000Z');
    expect(formatResetsIn(now)).toBe('00:01');
  });

  it('returns 00:00 at exact UTC midnight', () => {
    const now = new Date('2026-05-08T00:00:00.000Z');
    expect(formatResetsIn(now)).toBe('24:00');
  });

  it('pads single-digit hours and minutes', () => {
    // 21:05:00 UTC → 2h 55m.
    const now = new Date('2026-05-08T21:05:00.000Z');
    expect(formatResetsIn(now)).toBe('02:55');
  });
});
