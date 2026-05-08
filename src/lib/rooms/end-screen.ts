/**
 * Pure helpers for the multiplayer match-end summary.
 *
 * Inputs are the snapshot read from the DB in `/r/[code]/end/page.tsx`:
 *   - `players` — the room's players (including any kicked, but the caller
 *     filters those out before passing them in).
 *   - `rounds`  — the session's rounds in `round_index` order.
 *   - `guesses` — every guess row for the session (across all players + rounds).
 *
 * Output is a fully-resolved summary: standings sorted top-down, the winner
 * (rank 1), and the three per-round highlights surfaced on the end screen
 * (top single-round score, biggest miss, fastest-submit player).
 *
 * No I/O, no networking — same boundary as `src/scoring/`.
 */

export interface MatchPlayer {
  id: string;
  nickname: string | null;
}

export interface MatchRound {
  id: string;
  index: number;
  subreddit: string;
}

export interface MatchGuess {
  playerId: string;
  roundId: string;
  score: number;
  submittedAt: string;
}

export interface Standing {
  rank: number;
  playerId: string;
  playerName: string;
  totalScore: number;
  submittedCount: number;
}

export interface RoundHighlight {
  playerId: string;
  playerName: string;
  roundIndex: number;
  score: number;
}

export interface FastestSubmitHighlight {
  playerId: string;
  playerName: string;
  firstSubmitRounds: number;
}

export interface MatchSummary {
  winner: Standing;
  standings: Standing[];
  highlights: {
    topScore: RoundHighlight | null;
    biggestMiss: RoundHighlight | null;
    fastestSubmit: FastestSubmitHighlight | null;
  };
}

export interface ComputeMatchSummaryArgs {
  players: MatchPlayer[];
  rounds: MatchRound[];
  guesses: MatchGuess[];
}

function nameOf(players: MatchPlayer[], id: string): string {
  return players.find((p) => p.id === id)?.nickname ?? 'player';
}

export function computeMatchSummary(args: ComputeMatchSummaryArgs): MatchSummary {
  const { players, rounds, guesses } = args;

  const totals = new Map<string, { total: number; submits: number; sumSubmittedAt: number }>();
  for (const p of players) {
    totals.set(p.id, { total: 0, submits: 0, sumSubmittedAt: 0 });
  }
  for (const g of guesses) {
    const t = totals.get(g.playerId);
    if (!t) continue;
    t.total += g.score;
    t.submits += 1;
    t.sumSubmittedAt += Date.parse(g.submittedAt);
  }

  // Standings: total desc, then submitted-count desc, then earliest-cumulative-submit asc.
  const ranked = [...totals.entries()]
    .map(([id, t]) => ({
      id,
      total: t.total,
      submits: t.submits,
      avgSubmittedAt: t.submits > 0 ? t.sumSubmittedAt / t.submits : Number.POSITIVE_INFINITY,
    }))
    .sort((a, b) => {
      if (b.total !== a.total) return b.total - a.total;
      if (b.submits !== a.submits) return b.submits - a.submits;
      return a.avgSubmittedAt - b.avgSubmittedAt;
    });

  const standings: Standing[] = ranked.map((r, i) => ({
    rank: i + 1,
    playerId: r.id,
    playerName: nameOf(players, r.id),
    totalScore: r.total,
    submittedCount: r.submits,
  }));

  // Top score / biggest miss: scan every (player, round) guess.
  const roundIndexById = new Map(rounds.map((r) => [r.id, r.index] as const));
  let topScore: RoundHighlight | null = null;
  let biggestMiss: RoundHighlight | null = null;
  for (const g of guesses) {
    const idx = roundIndexById.get(g.roundId);
    if (idx === undefined) continue;
    const h: RoundHighlight = {
      playerId: g.playerId,
      playerName: nameOf(players, g.playerId),
      roundIndex: idx,
      score: g.score,
    };
    if (topScore === null || g.score > topScore.score) topScore = h;
    if (biggestMiss === null || g.score < biggestMiss.score) biggestMiss = h;
  }

  // Fastest submit: per round, the lowest submitted_at wins. Tally first-submit
  // rounds per player; the most wins. Ties → earliest cumulative submit.
  const firstSubmitsByPlayer = new Map<string, number>();
  const guessesByRound = new Map<string, MatchGuess[]>();
  for (const g of guesses) {
    const arr = guessesByRound.get(g.roundId);
    if (arr) arr.push(g);
    else guessesByRound.set(g.roundId, [g]);
  }
  for (const arr of guessesByRound.values()) {
    if (arr.length === 0) continue;
    let best = arr[0];
    for (const g of arr) {
      if (Date.parse(g.submittedAt) < Date.parse(best.submittedAt)) best = g;
    }
    firstSubmitsByPlayer.set(best.playerId, (firstSubmitsByPlayer.get(best.playerId) ?? 0) + 1);
  }
  let fastestSubmit: FastestSubmitHighlight | null = null;
  for (const [pid, count] of firstSubmitsByPlayer) {
    if (
      fastestSubmit === null ||
      count > fastestSubmit.firstSubmitRounds ||
      (count === fastestSubmit.firstSubmitRounds &&
        nameOf(players, pid).localeCompare(fastestSubmit.playerName) < 0)
    ) {
      fastestSubmit = {
        playerId: pid,
        playerName: nameOf(players, pid),
        firstSubmitRounds: count,
      };
    }
  }

  const winner = standings[0] ?? {
    rank: 1,
    playerId: '',
    playerName: 'no winner',
    totalScore: 0,
    submittedCount: 0,
  };

  return { winner, standings, highlights: { topScore, biggestMiss, fastestSubmit } };
}
