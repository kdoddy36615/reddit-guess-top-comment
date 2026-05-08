import { describe, expect, it } from 'vitest';
import { computeBestDailyRun, computeTopSubreddits, computeWeeklyDailyCompletion } from './stats';

describe('computeBestDailyRun', () => {
  it('returns null when there are no completed runs', () => {
    expect(computeBestDailyRun([])).toBeNull();
  });

  it('returns the single run when only one exists', () => {
    expect(
      computeBestDailyRun([
        { totalScore: 250, dailyRoomId: 'daily-2026-05-08', completedAt: '2026-05-08T12:00:00Z' },
      ]),
    ).toEqual({
      totalScore: 250,
      dailyRoomId: 'daily-2026-05-08',
      completedAt: '2026-05-08T12:00:00Z',
    });
  });

  it('returns the highest-scoring run', () => {
    const best = computeBestDailyRun([
      { totalScore: 300, dailyRoomId: 'daily-2026-05-06', completedAt: '2026-05-06T12:00:00Z' },
      { totalScore: 412, dailyRoomId: 'daily-2026-05-07', completedAt: '2026-05-07T12:00:00Z' },
      { totalScore: 250, dailyRoomId: 'daily-2026-05-08', completedAt: '2026-05-08T12:00:00Z' },
    ]);
    expect(best?.totalScore).toBe(412);
    expect(best?.dailyRoomId).toBe('daily-2026-05-07');
  });

  it('breaks score ties by earlier completed_at', () => {
    const best = computeBestDailyRun([
      { totalScore: 412, dailyRoomId: 'daily-2026-05-07', completedAt: '2026-05-07T18:00:00Z' },
      { totalScore: 412, dailyRoomId: 'daily-2026-05-08', completedAt: '2026-05-08T06:00:00Z' },
    ]);
    expect(best?.dailyRoomId).toBe('daily-2026-05-07');
  });
});

describe('computeWeeklyDailyCompletion', () => {
  it('returns 0 / 7 when there are no completed runs', () => {
    expect(computeWeeklyDailyCompletion({ completedRoomIds: [], today: '2026-05-08' })).toEqual({
      completed: 0,
      window: 7,
    });
  });

  it('counts a single completion in the window', () => {
    expect(
      computeWeeklyDailyCompletion({
        completedRoomIds: ['daily-2026-05-08'],
        today: '2026-05-08',
      }),
    ).toEqual({ completed: 1, window: 7 });
  });

  it('counts all 7 days when player completed every day in the window', () => {
    expect(
      computeWeeklyDailyCompletion({
        completedRoomIds: [
          'daily-2026-05-02',
          'daily-2026-05-03',
          'daily-2026-05-04',
          'daily-2026-05-05',
          'daily-2026-05-06',
          'daily-2026-05-07',
          'daily-2026-05-08',
        ],
        today: '2026-05-08',
      }),
    ).toEqual({ completed: 7, window: 7 });
  });

  it('excludes runs older than the 7-day window', () => {
    expect(
      computeWeeklyDailyCompletion({
        completedRoomIds: [
          'daily-2026-05-01', // 7 days before today (out of window)
          'daily-2026-05-02', // in window
          'daily-2026-05-08',
        ],
        today: '2026-05-08',
      }),
    ).toEqual({ completed: 2, window: 7 });
  });

  it('handles month boundaries (April 30 → May 1)', () => {
    expect(
      computeWeeklyDailyCompletion({
        completedRoomIds: ['daily-2026-04-30', 'daily-2026-05-01', 'daily-2026-05-02'],
        today: '2026-05-02',
      }),
    ).toEqual({ completed: 3, window: 7 });
  });

  it('ignores duplicate room ids', () => {
    expect(
      computeWeeklyDailyCompletion({
        completedRoomIds: ['daily-2026-05-08', 'daily-2026-05-08'],
        today: '2026-05-08',
      }),
    ).toEqual({ completed: 1, window: 7 });
  });
});

describe('computeTopSubreddits', () => {
  it('returns an empty array when the player has no guesses', () => {
    expect(computeTopSubreddits({ guesses: [], limit: 3 })).toEqual([]);
  });

  it('averages accuracy per subreddit and returns top N desc', () => {
    const top = computeTopSubreddits({
      guesses: [
        { subreddit: 'AskReddit', score: 80 },
        { subreddit: 'AskReddit', score: 60 },
        { subreddit: 'tifu', score: 92 },
        { subreddit: 'tifu', score: 88 },
        { subreddit: 'jokes', score: 30 },
      ],
      limit: 3,
    });
    expect(top).toEqual([
      { subreddit: 'tifu', averageScore: 90, plays: 2 },
      { subreddit: 'AskReddit', averageScore: 70, plays: 2 },
      { subreddit: 'jokes', averageScore: 30, plays: 1 },
    ]);
  });

  it('limits to N subreddits even when more exist', () => {
    const top = computeTopSubreddits({
      guesses: [
        { subreddit: 'a', score: 90 },
        { subreddit: 'b', score: 80 },
        { subreddit: 'c', score: 70 },
        { subreddit: 'd', score: 60 },
      ],
      limit: 3,
    });
    expect(top.map((r) => r.subreddit)).toEqual(['a', 'b', 'c']);
  });

  it('breaks average-score ties by play count desc, then subreddit alpha', () => {
    const top = computeTopSubreddits({
      guesses: [
        { subreddit: 'beta', score: 80 },
        { subreddit: 'alpha', score: 80 },
        { subreddit: 'alpha', score: 80 },
      ],
      limit: 3,
    });
    expect(top).toEqual([
      { subreddit: 'alpha', averageScore: 80, plays: 2 },
      { subreddit: 'beta', averageScore: 80, plays: 1 },
    ]);
  });

  it('rounds the average score to the nearest integer', () => {
    const top = computeTopSubreddits({
      guesses: [
        { subreddit: 'r', score: 81 },
        { subreddit: 'r', score: 82 },
        { subreddit: 'r', score: 84 },
      ],
      limit: 3,
    });
    expect(top[0]).toEqual({ subreddit: 'r', averageScore: 82, plays: 3 });
  });
});
