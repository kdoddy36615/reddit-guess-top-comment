/**
 * Pure leaderboard logic — aggregation, ranking, and windowing.
 *
 * No I/O lives here. The DB-shaped equivalents (`src/db/daily_run_totals.ts`)
 * push the same ordering down to Postgres for production reads; this module
 * is the canonical reference for the semantics and is what consumers compose
 * with when they already have totals in memory (e.g., week/all-time rollups
 * built from cached daily totals, or test fixtures).
 */

export type DailyRunTotal = {
  playerId: string;
  dailyRoomId: string;
  totalScore: number;
  completedAt: string;
};

export type RankedRow = DailyRunTotal & { rank: number };

export function rankBoard(args: { totals: DailyRunTotal[] }): RankedRow[] {
  const sorted = [...args.totals].sort((a, b) => {
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
    return a.completedAt.localeCompare(b.completedAt);
  });
  return sorted.map((row, i) => ({ ...row, rank: i + 1 }));
}

/**
 * Slice the ranked board around a focal player so the leaderboard UI can pin
 * the "you" row between its neighbors when the player is off the top-N view.
 *
 * Returns N rows above + the player + N rows below (default N=2). Clamps at
 * board edges, so a top-3 player gets fewer than `2N+1` rows back. Returns
 * `[]` when the player has no row in `ranked`. The caller decides whether to
 * render this window — typically only when the player is below the rendered
 * top-N cutoff.
 */
export function windowBoardForPlayer(args: {
  ranked: RankedRow[];
  playerId: string;
  neighbors?: number;
}): RankedRow[] {
  const neighbors = args.neighbors ?? 2;
  const idx = args.ranked.findIndex((r) => r.playerId === args.playerId);
  if (idx === -1) return [];
  const start = Math.max(0, idx - neighbors);
  const end = Math.min(args.ranked.length, idx + neighbors + 1);
  return args.ranked.slice(start, end);
}

export function aggregateDailyRun(args: {
  playerId: string;
  dailyRoomId: string;
  completedAt: string;
  guesses: { score: number }[];
}): DailyRunTotal {
  return {
    playerId: args.playerId,
    dailyRoomId: args.dailyRoomId,
    totalScore: args.guesses.reduce((sum, g) => sum + g.score, 0),
    completedAt: args.completedAt,
  };
}
