import { describe, expect, it } from 'vitest';
import type { DailyRunTotal } from './index';
import { aggregateDailyRun, computeStreak, rankBoard, windowBoardForPlayer } from './index';

function total(
  playerId: string,
  totalScore: number,
  completedAt: string,
  dailyRoomId = 'daily-2026-05-08',
): DailyRunTotal {
  return { playerId, totalScore, completedAt, dailyRoomId };
}

describe('aggregateDailyRun', () => {
  it('sums guess scores into a single daily run total', () => {
    const result = aggregateDailyRun({
      playerId: 'p1',
      dailyRoomId: 'daily-2026-05-08',
      completedAt: '2026-05-08T12:00:00.000Z',
      guesses: [{ score: 80 }, { score: 65 }, { score: 92 }, { score: 41 }, { score: 77 }],
    });
    expect(result).toEqual({
      playerId: 'p1',
      dailyRoomId: 'daily-2026-05-08',
      totalScore: 355,
      completedAt: '2026-05-08T12:00:00.000Z',
    });
  });

  it('returns total 0 for empty guesses', () => {
    const result = aggregateDailyRun({
      playerId: 'p1',
      dailyRoomId: 'daily-2026-05-08',
      completedAt: '2026-05-08T12:00:00.000Z',
      guesses: [],
    });
    expect(result.totalScore).toBe(0);
  });
});

describe('rankBoard', () => {
  it('returns an empty array for empty totals', () => {
    expect(rankBoard({ totals: [] })).toEqual([]);
  });

  it('assigns rank 1 to the only player when there is a single total', () => {
    const ranked = rankBoard({
      totals: [total('p1', 412, '2026-05-08T12:00:00.000Z')],
    });
    expect(ranked).toEqual([
      {
        playerId: 'p1',
        totalScore: 412,
        completedAt: '2026-05-08T12:00:00.000Z',
        dailyRoomId: 'daily-2026-05-08',
        rank: 1,
      },
    ]);
  });

  it('sorts by total_score descending', () => {
    const ranked = rankBoard({
      totals: [
        total('p1', 200, '2026-05-08T12:00:00.000Z'),
        total('p2', 400, '2026-05-08T12:00:00.000Z'),
        total('p3', 300, '2026-05-08T12:00:00.000Z'),
      ],
    });
    expect(ranked.map((r) => r.playerId)).toEqual(['p2', 'p3', 'p1']);
    expect(ranked.map((r) => r.rank)).toEqual([1, 2, 3]);
  });

  it('breaks score ties by completed_at ascending (earlier finisher ranks higher)', () => {
    const ranked = rankBoard({
      totals: [
        total('late', 400, '2026-05-08T18:00:00.000Z'),
        total('early', 400, '2026-05-08T06:00:00.000Z'),
        total('mid', 400, '2026-05-08T12:00:00.000Z'),
      ],
    });
    expect(ranked.map((r) => r.playerId)).toEqual(['early', 'mid', 'late']);
    expect(ranked.map((r) => r.rank)).toEqual([1, 2, 3]);
  });

  it('handles ties on a week-window boundary (UTC midnight) without rank collisions', () => {
    // Two players finish at the exact week boundary instant, a third finishes
    // a millisecond after. Tie-break is lexicographic on the ISO string, so
    // the millisecond-later run sorts after the boundary-instant pair, and the
    // boundary pair sort by playerId on identical timestamps — but we don't
    // mandate playerId tiebreak here; just that ranks are 1/2/3 in some
    // deterministic order driven by completed_at.
    const ranked = rankBoard({
      totals: [
        total('p_after', 400, '2026-05-04T00:00:00.001Z'),
        total('p_at_a', 400, '2026-05-04T00:00:00.000Z'),
        total('p_at_b', 400, '2026-05-04T00:00:00.000Z'),
      ],
    });
    expect(ranked.map((r) => r.rank)).toEqual([1, 2, 3]);
    expect(ranked[ranked.length - 1].playerId).toBe('p_after');
    const boundaryIds = ranked
      .slice(0, 2)
      .map((r) => r.playerId)
      .sort();
    expect(boundaryIds).toEqual(['p_at_a', 'p_at_b']);
  });
});

describe('windowBoardForPlayer', () => {
  function rankedFixture(size: number) {
    const totals: DailyRunTotal[] = [];
    for (let i = 0; i < size; i++) {
      totals.push(
        total(
          `p${String(i + 1).padStart(2, '0')}`,
          1000 - i,
          `2026-05-08T${String(i % 24).padStart(2, '0')}:00:00.000Z`,
        ),
      );
    }
    // Build via rankBoard so ranks line up with the sorted output.
    return rankBoard({ totals });
  }

  it('returns an empty array when the player is not in the ranked board', () => {
    const ranked = rankedFixture(50);
    expect(windowBoardForPlayer({ ranked, playerId: 'ghost' })).toEqual([]);
  });

  it('returns 2 above + the player + 2 below by default for an off-screen player', () => {
    const ranked = rankedFixture(100);
    const window = windowBoardForPlayer({ ranked, playerId: 'p47' });
    expect(window.map((r) => r.playerId)).toEqual(['p45', 'p46', 'p47', 'p48', 'p49']);
    expect(window.map((r) => r.rank)).toEqual([45, 46, 47, 48, 49]);
  });

  it('respects a custom neighbors count', () => {
    const ranked = rankedFixture(100);
    const window = windowBoardForPlayer({ ranked, playerId: 'p50', neighbors: 1 });
    expect(window.map((r) => r.playerId)).toEqual(['p49', 'p50', 'p51']);
  });

  it('clamps the window at the top of the board', () => {
    const ranked = rankedFixture(100);
    const window = windowBoardForPlayer({ ranked, playerId: 'p01' });
    expect(window.map((r) => r.playerId)).toEqual(['p01', 'p02', 'p03']);
  });

  it('clamps the window at the bottom of the board', () => {
    const ranked = rankedFixture(100);
    const window = windowBoardForPlayer({ ranked, playerId: 'p100' });
    expect(window.map((r) => r.playerId)).toEqual(['p98', 'p99', 'p100']);
  });

  it('returns just the player when there is only one ranked row', () => {
    const ranked = rankBoard({ totals: [total('solo', 412, '2026-05-08T12:00:00.000Z')] });
    expect(windowBoardForPlayer({ ranked, playerId: 'solo' })).toEqual([
      {
        playerId: 'solo',
        totalScore: 412,
        completedAt: '2026-05-08T12:00:00.000Z',
        dailyRoomId: 'daily-2026-05-08',
        rank: 1,
      },
    ]);
  });
});

describe('computeStreak', () => {
  it('returns 0 / inactive when the player has no completed runs', () => {
    expect(computeStreak({ completedRoomIds: [], today: '2026-05-08' })).toEqual({
      count: 0,
      active: false,
    });
  });

  it('returns 1 / active when only today is completed', () => {
    expect(computeStreak({ completedRoomIds: ['daily-2026-05-08'], today: '2026-05-08' })).toEqual({
      count: 1,
      active: true,
    });
  });

  it('counts a 4-day run ending today', () => {
    expect(
      computeStreak({
        completedRoomIds: [
          'daily-2026-05-05',
          'daily-2026-05-06',
          'daily-2026-05-07',
          'daily-2026-05-08',
        ],
        today: '2026-05-08',
      }),
    ).toEqual({ count: 4, active: true });
  });

  it('stops counting at the first gap walking backwards from today', () => {
    expect(
      computeStreak({
        completedRoomIds: [
          'daily-2026-05-01',
          'daily-2026-05-02',
          'daily-2026-05-06',
          'daily-2026-05-07',
          'daily-2026-05-08',
        ],
        today: '2026-05-08',
      }),
    ).toEqual({ count: 3, active: true });
  });

  it('returns 0 / inactive when today is not completed (streak broken)', () => {
    expect(
      computeStreak({
        completedRoomIds: ['daily-2026-05-06', 'daily-2026-05-07'],
        today: '2026-05-08',
      }),
    ).toEqual({ count: 0, active: false });
  });

  it('handles month boundaries (April 30 → May 1)', () => {
    expect(
      computeStreak({
        completedRoomIds: ['daily-2026-04-30', 'daily-2026-05-01'],
        today: '2026-05-01',
      }),
    ).toEqual({ count: 2, active: true });
  });

  it('handles year boundaries (Dec 31 → Jan 1)', () => {
    expect(
      computeStreak({
        completedRoomIds: ['daily-2025-12-31', 'daily-2026-01-01'],
        today: '2026-01-01',
      }),
    ).toEqual({ count: 2, active: true });
  });

  it('ignores duplicates in the input', () => {
    expect(
      computeStreak({
        completedRoomIds: ['daily-2026-05-08', 'daily-2026-05-08', 'daily-2026-05-07'],
        today: '2026-05-08',
      }),
    ).toEqual({ count: 2, active: true });
  });
});
