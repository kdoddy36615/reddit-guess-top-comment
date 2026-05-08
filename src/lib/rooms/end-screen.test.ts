import { describe, expect, it } from 'vitest';
import {
  computeMatchSummary,
  type MatchGuess,
  type MatchPlayer,
  type MatchRound,
} from './end-screen';

const players: MatchPlayer[] = [
  { id: 'p1', nickname: 'kev' },
  { id: 'p2', nickname: 'snorlax' },
  { id: 'p3', nickname: 'comment_king' },
];

const rounds: MatchRound[] = [
  { id: 'r1', index: 0, subreddit: 'tifu' },
  { id: 'r2', index: 1, subreddit: 'askreddit' },
  { id: 'r3', index: 2, subreddit: 'showerthoughts' },
];

describe('computeMatchSummary', () => {
  it('ranks the winner by total score, ties broken by submit count', () => {
    const guesses: MatchGuess[] = [
      // p1: 90 + 50 + 50 = 190
      { playerId: 'p1', roundId: 'r1', score: 90, submittedAt: '2026-05-08T12:00:01Z' },
      { playerId: 'p1', roundId: 'r2', score: 50, submittedAt: '2026-05-08T12:01:00Z' },
      { playerId: 'p1', roundId: 'r3', score: 50, submittedAt: '2026-05-08T12:02:00Z' },
      // p2: 80 + 60 + 40 = 180
      { playerId: 'p2', roundId: 'r1', score: 80, submittedAt: '2026-05-08T12:00:02Z' },
      { playerId: 'p2', roundId: 'r2', score: 60, submittedAt: '2026-05-08T12:01:05Z' },
      { playerId: 'p2', roundId: 'r3', score: 40, submittedAt: '2026-05-08T12:02:05Z' },
      // p3: missed all three
    ];
    const summary = computeMatchSummary({ players, rounds, guesses });
    expect(summary.winner.playerId).toBe('p1');
    expect(summary.winner.totalScore).toBe(190);
    expect(summary.standings.map((s) => s.playerId)).toEqual(['p1', 'p2', 'p3']);
    expect(summary.standings[0].rank).toBe(1);
    expect(summary.standings[2].totalScore).toBe(0);
  });

  it('finds the top single-round score across all guesses', () => {
    const guesses: MatchGuess[] = [
      { playerId: 'p1', roundId: 'r1', score: 80, submittedAt: '2026-05-08T12:00:01Z' },
      { playerId: 'p2', roundId: 'r2', score: 95, submittedAt: '2026-05-08T12:01:01Z' },
      { playerId: 'p1', roundId: 'r3', score: 70, submittedAt: '2026-05-08T12:02:01Z' },
    ];
    const summary = computeMatchSummary({ players, rounds, guesses });
    expect(summary.highlights.topScore).toEqual({
      playerId: 'p2',
      playerName: 'snorlax',
      roundIndex: 1,
      score: 95,
    });
  });

  it('finds the biggest miss as the lowest submitted (non-zero-only) score', () => {
    const guesses: MatchGuess[] = [
      { playerId: 'p1', roundId: 'r1', score: 80, submittedAt: '2026-05-08T12:00:01Z' },
      { playerId: 'p2', roundId: 'r2', score: 95, submittedAt: '2026-05-08T12:01:01Z' },
      { playerId: 'p1', roundId: 'r3', score: 12, submittedAt: '2026-05-08T12:02:01Z' },
    ];
    const summary = computeMatchSummary({ players, rounds, guesses });
    expect(summary.highlights.biggestMiss).toEqual({
      playerId: 'p1',
      playerName: 'kev',
      roundIndex: 2,
      score: 12,
    });
  });

  it('counts fastest-submit as most rounds-with-first-submit', () => {
    const guesses: MatchGuess[] = [
      // r1: p1 first
      { playerId: 'p1', roundId: 'r1', score: 80, submittedAt: '2026-05-08T12:00:01Z' },
      { playerId: 'p2', roundId: 'r1', score: 70, submittedAt: '2026-05-08T12:00:05Z' },
      // r2: p1 first
      { playerId: 'p1', roundId: 'r2', score: 30, submittedAt: '2026-05-08T12:01:00Z' },
      { playerId: 'p2', roundId: 'r2', score: 60, submittedAt: '2026-05-08T12:01:05Z' },
      // r3: p2 first
      { playerId: 'p2', roundId: 'r3', score: 40, submittedAt: '2026-05-08T12:02:01Z' },
      { playerId: 'p1', roundId: 'r3', score: 50, submittedAt: '2026-05-08T12:02:08Z' },
    ];
    const summary = computeMatchSummary({ players, rounds, guesses });
    expect(summary.highlights.fastestSubmit).toEqual({
      playerId: 'p1',
      playerName: 'kev',
      firstSubmitRounds: 2,
    });
  });

  it('returns null highlights when there are no submissions', () => {
    const summary = computeMatchSummary({ players, rounds, guesses: [] });
    expect(summary.highlights.topScore).toBeNull();
    expect(summary.highlights.biggestMiss).toBeNull();
    expect(summary.highlights.fastestSubmit).toBeNull();
  });

  it('handles a single-player match (all rounds first-submit go to them)', () => {
    const solo: MatchPlayer[] = [{ id: 'p1', nickname: 'kev' }];
    const guesses: MatchGuess[] = [
      { playerId: 'p1', roundId: 'r1', score: 80, submittedAt: '2026-05-08T12:00:01Z' },
      { playerId: 'p1', roundId: 'r2', score: 60, submittedAt: '2026-05-08T12:01:01Z' },
    ];
    const summary = computeMatchSummary({ players: solo, rounds, guesses });
    expect(summary.winner.playerId).toBe('p1');
    expect(summary.highlights.fastestSubmit?.firstSubmitRounds).toBe(2);
  });

  it('breaks total-score ties by earliest cumulative submit (more aggressive players win)', () => {
    const tied: MatchGuess[] = [
      { playerId: 'p1', roundId: 'r1', score: 50, submittedAt: '2026-05-08T12:00:01Z' },
      { playerId: 'p2', roundId: 'r1', score: 50, submittedAt: '2026-05-08T12:00:03Z' },
      { playerId: 'p1', roundId: 'r2', score: 50, submittedAt: '2026-05-08T12:01:01Z' },
      { playerId: 'p2', roundId: 'r2', score: 50, submittedAt: '2026-05-08T12:01:03Z' },
    ];
    const summary = computeMatchSummary({
      players: [players[0], players[1]],
      rounds,
      guesses: tied,
    });
    expect(summary.standings[0].playerId).toBe('p1');
    expect(summary.standings[0].rank).toBe(1);
    expect(summary.standings[1].rank).toBe(2);
  });
});
