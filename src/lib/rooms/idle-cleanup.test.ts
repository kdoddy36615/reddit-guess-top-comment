import { describe, expect, it } from 'vitest';
import { ROOM_IDLE_CLEANUP_MS, shouldCleanupIdleRoom } from './idle-cleanup';

const NOW = new Date('2026-05-08T12:30:00Z');

describe('shouldCleanupIdleRoom', () => {
  it('skips rooms not in ended status', () => {
    expect(
      shouldCleanupIdleRoom({
        status: 'live',
        endedAt: '2026-05-08T12:00:00Z',
        now: NOW,
      }),
    ).toBe(false);
    expect(
      shouldCleanupIdleRoom({
        status: 'lobby',
        endedAt: null,
        now: NOW,
      }),
    ).toBe(false);
  });

  it('skips ended rooms missing ended_at', () => {
    expect(
      shouldCleanupIdleRoom({
        status: 'ended',
        endedAt: null,
        now: NOW,
      }),
    ).toBe(false);
  });

  it('skips ended rooms within the 10-minute idle window', () => {
    expect(
      shouldCleanupIdleRoom({
        status: 'ended',
        endedAt: new Date(NOW.getTime() - (ROOM_IDLE_CLEANUP_MS - 1)).toISOString(),
        now: NOW,
      }),
    ).toBe(false);
  });

  it('cleans up ended rooms past the 10-minute idle window', () => {
    expect(
      shouldCleanupIdleRoom({
        status: 'ended',
        endedAt: new Date(NOW.getTime() - ROOM_IDLE_CLEANUP_MS).toISOString(),
        now: NOW,
      }),
    ).toBe(true);
    expect(
      shouldCleanupIdleRoom({
        status: 'ended',
        endedAt: new Date(NOW.getTime() - (ROOM_IDLE_CLEANUP_MS + 60_000)).toISOString(),
        now: NOW,
      }),
    ).toBe(true);
  });

  it('uses 10 minutes as the idle threshold', () => {
    expect(ROOM_IDLE_CLEANUP_MS).toBe(10 * 60 * 1000);
  });
});
