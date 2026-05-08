/**
 * Pure account-stats math. No I/O — callers fetch the rows and pass them in.
 *
 * Mirrors the shape of `src/lib/leaderboard/index.ts` (sibling `computeStreak`
 * lives there since the streak is also surfaced on the daily-end summary).
 */

export type DailyRunRow = {
  totalScore: number;
  dailyRoomId: string;
  /** ISO timestamp. */
  completedAt: string;
};

export type GuessRow = {
  subreddit: string;
  score: number;
};

export type SubredditStat = {
  subreddit: string;
  averageScore: number;
  plays: number;
};

const WEEKLY_WINDOW_DAYS = 7;

/**
 * Highest-scoring daily run, ties broken by earliest `completedAt`. Returns
 * null when the player has no completed runs.
 */
export function computeBestDailyRun(rows: DailyRunRow[]): DailyRunRow | null {
  if (rows.length === 0) return null;
  let best = rows[0];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (
      r.totalScore > best.totalScore ||
      (r.totalScore === best.totalScore && r.completedAt < best.completedAt)
    ) {
      best = r;
    }
  }
  return best;
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
 * Number of distinct daily rooms the player completed across the trailing
 * 7-day window inclusive of `today`. Mirrors the streak math in `lib/leaderboard`
 * but counts non-consecutive completions instead of stopping at the first gap.
 */
export function computeWeeklyDailyCompletion(args: { completedRoomIds: string[]; today: string }): {
  completed: number;
  window: number;
} {
  const days = new Set(args.completedRoomIds.map((id) => id.replace(/^daily-/, '')));
  let cursor = args.today;
  let completed = 0;
  for (let i = 0; i < WEEKLY_WINDOW_DAYS; i++) {
    if (days.has(cursor)) completed += 1;
    cursor = prevDay(cursor);
  }
  return { completed, window: WEEKLY_WINDOW_DAYS };
}

/**
 * Top-N subreddits ranked by the player's average score in that subreddit.
 * Ties on average broken by play count desc, then subreddit name asc for
 * determinism.
 */
export function computeTopSubreddits(args: {
  guesses: GuessRow[];
  limit: number;
}): SubredditStat[] {
  const bySub = new Map<string, { totalScore: number; plays: number }>();
  for (const g of args.guesses) {
    const cur = bySub.get(g.subreddit) ?? { totalScore: 0, plays: 0 };
    cur.totalScore += g.score;
    cur.plays += 1;
    bySub.set(g.subreddit, cur);
  }
  const aggregated: SubredditStat[] = [...bySub.entries()].map(([subreddit, v]) => ({
    subreddit,
    averageScore: Math.round(v.totalScore / v.plays),
    plays: v.plays,
  }));
  aggregated.sort((a, b) => {
    if (b.averageScore !== a.averageScore) return b.averageScore - a.averageScore;
    if (b.plays !== a.plays) return b.plays - a.plays;
    return a.subreddit.localeCompare(b.subreddit);
  });
  return aggregated.slice(0, args.limit);
}
