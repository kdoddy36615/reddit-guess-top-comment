// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { REVEAL_HOLD_MS, shouldAdvanceRoundFromReveal, shouldRevealRound } from './round-flow';

describe('shouldRevealRound', () => {
  it('returns true when every active player has submitted', () => {
    expect(
      shouldRevealRound({
        state: 'guessing',
        roundStartedAt: '2026-05-08T12:00:00Z',
        timerSeconds: 30,
        activePlayerIds: ['p1', 'p2', 'p3'],
        submittedPlayerIds: new Set(['p1', 'p2', 'p3']),
        now: new Date('2026-05-08T12:00:10Z'),
      }),
    ).toBe(true);
  });

  it('returns true when the round timer has expired', () => {
    expect(
      shouldRevealRound({
        state: 'guessing',
        roundStartedAt: '2026-05-08T12:00:00Z',
        timerSeconds: 30,
        activePlayerIds: ['p1', 'p2'],
        submittedPlayerIds: new Set(['p1']),
        now: new Date('2026-05-08T12:00:31Z'),
      }),
    ).toBe(true);
  });

  it('returns false when neither all-submitted nor timer-expired', () => {
    expect(
      shouldRevealRound({
        state: 'guessing',
        roundStartedAt: '2026-05-08T12:00:00Z',
        timerSeconds: 30,
        activePlayerIds: ['p1', 'p2'],
        submittedPlayerIds: new Set(['p1']),
        now: new Date('2026-05-08T12:00:10Z'),
      }),
    ).toBe(false);
  });

  it('returns false when state is not guessing (already revealed/complete)', () => {
    expect(
      shouldRevealRound({
        state: 'revealed',
        roundStartedAt: '2026-05-08T12:00:00Z',
        timerSeconds: 30,
        activePlayerIds: ['p1'],
        submittedPlayerIds: new Set(['p1']),
        now: new Date('2026-05-08T12:00:10Z'),
      }),
    ).toBe(false);
  });

  it('returns true on timer-expired even when no one submitted', () => {
    expect(
      shouldRevealRound({
        state: 'guessing',
        roundStartedAt: '2026-05-08T12:00:00Z',
        timerSeconds: 30,
        activePlayerIds: ['p1', 'p2'],
        submittedPlayerIds: new Set(),
        now: new Date('2026-05-08T12:01:00Z'),
      }),
    ).toBe(true);
  });

  it('does not consider kicked/disconnected players as gating submissions', () => {
    // active = present non-kicked roster. If only p1 is active and they submitted,
    // we reveal regardless of whether p2 (kicked) submitted.
    expect(
      shouldRevealRound({
        state: 'guessing',
        roundStartedAt: '2026-05-08T12:00:00Z',
        timerSeconds: 30,
        activePlayerIds: ['p1'],
        submittedPlayerIds: new Set(['p1']),
        now: new Date('2026-05-08T12:00:10Z'),
      }),
    ).toBe(true);
  });
});

describe('shouldAdvanceRoundFromReveal', () => {
  it('returns true once REVEAL_HOLD_MS has elapsed since reveal started', () => {
    const revealedAt = '2026-05-08T12:00:00Z';
    const now = new Date(Date.parse(revealedAt) + REVEAL_HOLD_MS + 1);
    expect(
      shouldAdvanceRoundFromReveal({
        state: 'revealed',
        revealedAt,
        now,
      }),
    ).toBe(true);
  });

  it('returns false before REVEAL_HOLD_MS has elapsed', () => {
    const revealedAt = '2026-05-08T12:00:00Z';
    const now = new Date(Date.parse(revealedAt) + 1000);
    expect(
      shouldAdvanceRoundFromReveal({
        state: 'revealed',
        revealedAt,
        now,
      }),
    ).toBe(false);
  });

  it('returns false when state is not revealed', () => {
    expect(
      shouldAdvanceRoundFromReveal({
        state: 'guessing',
        revealedAt: null,
        now: new Date(),
      }),
    ).toBe(false);
  });

  it('returns false when revealedAt is null even if state is revealed', () => {
    // Defensive: should never happen, but we should not advance with a null
    // timestamp because we can't compute the hold-end deterministically.
    expect(
      shouldAdvanceRoundFromReveal({
        state: 'revealed',
        revealedAt: null,
        now: new Date(),
      }),
    ).toBe(false);
  });
});
