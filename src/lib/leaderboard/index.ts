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

function prevDay(yyyymmdd: string): string {
  const d = new Date(`${yyyymmdd}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  const y = d.getUTCFullYear().toString().padStart(4, '0');
  const m = (d.getUTCMonth() + 1).toString().padStart(2, '0');
  const day = d.getUTCDate().toString().padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Count consecutive daily completions ending at `today`. The streak is "active"
 * when today itself is in the completed set — the moment a player misses a
 * day, their streak resets to 0 and the 🔥 affordance disappears.
 *
 * `completedRoomIds` is the player's full set of finished `daily_room_id`s
 * (any order, duplicates ignored). `today` is the YYYY-MM-DD that the caller
 * considers "now" — passed in rather than computed so the function stays pure
 * and so the daily-end summary can use the same `dailyRoomId(new Date())`
 * basis the player sees on /play/daily.
 */
export function computeStreak(args: { completedRoomIds: string[]; today: string }): {
  count: number;
  active: boolean;
} {
  const days = new Set(args.completedRoomIds.map((id) => id.replace(/^daily-/, '')));
  let count = 0;
  let cursor = args.today;
  while (days.has(cursor)) {
    count += 1;
    cursor = prevDay(cursor);
  }
  return { count, active: count > 0 };
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
