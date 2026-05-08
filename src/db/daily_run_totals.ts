import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';

type Db = SupabaseClient<Database>;

export type DailyRunRow = {
  playerId: string;
  totalScore: number;
  completedAt: string;
};

/**
 * Upsert one player's daily run total. Idempotent on `(player_id, daily_room_id)`
 * — a second call for the same key replaces the score and `completed_at`.
 *
 * Service-role only (no insert/update RLS policy). Called from the
 * end-of-daily-session route handler after the player's final round resolves.
 */
export async function upsertDailyRunTotal(
  db: Db,
  args: { playerId: string; dailyRoomId: string; totalScore: number },
): Promise<{ totalScore: number; completedAt: string }> {
  const { data, error } = await db
    .from('daily_run_totals')
    .upsert(
      {
        player_id: args.playerId,
        daily_room_id: args.dailyRoomId,
        total_score: args.totalScore,
        completed_at: new Date().toISOString(),
      },
      { onConflict: 'player_id,daily_room_id' },
    )
    .select('total_score, completed_at')
    .single();
  if (error) throw error;
  return { totalScore: data.total_score, completedAt: data.completed_at };
}

/**
 * Look up one player's daily-run-totals row for a single daily room.
 * Returns null when the player hasn't finalized today's daily yet — the
 * `/play/daily` SSR uses this as the "did this player wrap up?" signal so
 * we can redirect them to `/play/daily/end` on revisit.
 */
export async function findDailyRunTotal(
  db: Db,
  args: { playerId: string; dailyRoomId: string },
): Promise<{ totalScore: number; completedAt: string } | null> {
  const { data, error } = await db
    .from('daily_run_totals')
    .select('total_score, completed_at')
    .eq('player_id', args.playerId)
    .eq('daily_room_id', args.dailyRoomId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { totalScore: data.total_score, completedAt: data.completed_at };
}

export type PlayerDailyRunRow = {
  dailyRoomId: string;
  totalScore: number;
  completedAt: string;
};

/**
 * All daily-run totals belonging to a single player, ordered newest first.
 * Used by /account to compute lifetime stats (best run, weekly completion,
 * streak) from a single round trip.
 */
export async function selectAllDailyRunsForPlayer(
  db: Db,
  args: { playerId: string },
): Promise<PlayerDailyRunRow[]> {
  const { data, error } = await db
    .from('daily_run_totals')
    .select('daily_room_id, total_score, completed_at')
    .eq('player_id', args.playerId)
    .order('completed_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    dailyRoomId: r.daily_room_id,
    totalScore: r.total_score,
    completedAt: r.completed_at,
  }));
}

/**
 * Top-N rows on the today board for a single daily room. Ordered by score
 * desc; ties broken by `completed_at asc` so the earlier finisher ranks higher.
 */
export async function selectTopBoard(
  db: Db,
  args: { dailyRoomId: string; limit: number },
): Promise<DailyRunRow[]> {
  const { data, error } = await db
    .from('daily_run_totals')
    .select('player_id, total_score, completed_at')
    .eq('daily_room_id', args.dailyRoomId)
    .order('total_score', { ascending: false })
    .order('completed_at', { ascending: true })
    .limit(args.limit);
  if (error) throw error;
  return (data ?? []).map((r) => ({
    playerId: r.player_id,
    totalScore: r.total_score,
    completedAt: r.completed_at,
  }));
}

export type RankedRow = DailyRunRow & { rank: number };

export type WindowedBoard = {
  /** 1-based rank of the focused player on this room's board. */
  rank: number;
  /** Rows surrounding the focused player, each carrying its own 1-based rank. */
  rows: RankedRow[];
};

/**
 * For a player who is off the top board, return their rank plus a window of
 * surrounding rows so the leaderboard can pin "you" between your neighbours.
 *
 * Returns `null` when the player has no entry for this daily room.
 *
 * Pulls the full ordered board for the room, then slices client-side. A daily
 * cohort tops out in the low thousands, so a single round trip + array slice
 * beats a windowed-rank SQL query in both correctness and ease of testing.
 */
export async function selectWindowedBoardForPlayer(
  db: Db,
  args: { dailyRoomId: string; playerId: string; before: number; after: number },
): Promise<WindowedBoard | null> {
  const { data, error } = await db
    .from('daily_run_totals')
    .select('player_id, total_score, completed_at')
    .eq('daily_room_id', args.dailyRoomId)
    .order('total_score', { ascending: false })
    .order('completed_at', { ascending: true });
  if (error) throw error;
  const all = data ?? [];
  const idx = all.findIndex((r) => r.player_id === args.playerId);
  if (idx === -1) return null;
  const start = Math.max(0, idx - args.before);
  const end = Math.min(all.length, idx + args.after + 1);
  const rows: RankedRow[] = all.slice(start, end).map((r, i) => ({
    playerId: r.player_id,
    totalScore: r.total_score,
    completedAt: r.completed_at,
    rank: start + i + 1,
  }));
  return { rank: idx + 1, rows };
}

export type AggregateRow = {
  playerId: string;
  totalScore: number;
  /** Number of daily runs that contributed to this aggregate. */
  runCount: number;
};

function aggregateByPlayer(
  rows: { player_id: string; total_score: number }[],
  limit: number,
): AggregateRow[] {
  const byPlayer = new Map<string, { totalScore: number; runCount: number }>();
  for (const r of rows) {
    const cur = byPlayer.get(r.player_id) ?? { totalScore: 0, runCount: 0 };
    cur.totalScore += r.total_score;
    cur.runCount += 1;
    byPlayer.set(r.player_id, cur);
  }
  return [...byPlayer.entries()]
    .map(([playerId, v]) => ({ playerId, totalScore: v.totalScore, runCount: v.runCount }))
    .sort((a, b) => b.totalScore - a.totalScore || a.playerId.localeCompare(b.playerId))
    .slice(0, limit);
}

/**
 * Sum each player's daily run totals across a week window, ranked desc.
 *
 * `weekStart` is inclusive, `weekEnd` is exclusive — both are ISO timestamps,
 * so the caller is responsible for picking week boundaries (e.g., Monday 00:00
 * UTC). A run on the boundary instant belongs to the week starting at that
 * instant, not to the week ending there.
 */
export async function selectWeekRollup(
  db: Db,
  args: { weekStart: string; weekEnd: string; limit: number },
): Promise<AggregateRow[]> {
  const { data, error } = await db
    .from('daily_run_totals')
    .select('player_id, total_score')
    .gte('completed_at', args.weekStart)
    .lt('completed_at', args.weekEnd);
  if (error) throw error;
  return aggregateByPlayer(data ?? [], args.limit);
}

/**
 * Sum each player's daily run totals across all of recorded history. Ranked
 * desc; ties broken by `playerId` for determinism.
 */
export async function selectAllTimeBoard(db: Db, args: { limit: number }): Promise<AggregateRow[]> {
  const { data, error } = await db.from('daily_run_totals').select('player_id, total_score');
  if (error) throw error;
  return aggregateByPlayer(data ?? [], args.limit);
}

export type RankedAggregateRow = AggregateRow & { rank: number };

export type AggregatedBoardWithWindow = {
  /** Top-N ranked rows. */
  topRows: RankedAggregateRow[];
  /** Window of rows around the focused player when they fall outside the top-N. */
  youWindow: RankedAggregateRow[] | null;
  /** 1-based rank of the focused player on the full ranked board, or null. */
  youRank: number | null;
  /** Distinct player count across the timeframe. */
  totalPlayers: number;
};

/**
 * Aggregate -> rank -> slice top + window around focused player.
 *
 * Used by both the week and all-time board readers — the only difference is
 * which rows the caller pulls from `daily_run_totals` (week-windowed by
 * `completed_at` vs full table). Aggregating + windowing in JS is fine while
 * the cohort is in the low thousands; revisit if scale demands SQL-side ranks.
 */
function aggregateRankWindow(
  rows: { player_id: string; total_score: number }[],
  args: { playerId: string | null; topLimit: number; neighbors: number },
): AggregatedBoardWithWindow {
  const aggregated = aggregateByPlayer(rows, Number.MAX_SAFE_INTEGER);
  const ranked: RankedAggregateRow[] = aggregated.map((r, i) => ({ ...r, rank: i + 1 }));
  const topRows = ranked.slice(0, args.topLimit);

  let youRank: number | null = null;
  let youWindow: RankedAggregateRow[] | null = null;

  if (args.playerId) {
    const idx = ranked.findIndex((r) => r.playerId === args.playerId);
    if (idx !== -1) {
      youRank = idx + 1;
      const inTop = idx < topRows.length;
      if (!inTop) {
        const start = Math.max(0, idx - args.neighbors);
        const end = Math.min(ranked.length, idx + args.neighbors + 1);
        youWindow = ranked.slice(start, end);
      }
    }
  }

  return { topRows, youWindow, youRank, totalPlayers: ranked.length };
}

/**
 * Week board: rolling 7-day window aggregate per player + top-N + windowed
 * "you" view. Half-open `[weekStart, weekEnd)` on `completed_at`.
 */
export async function selectWeekBoardForPlayer(
  db: Db,
  args: {
    weekStart: string;
    weekEnd: string;
    playerId: string | null;
    topLimit: number;
    neighbors: number;
  },
): Promise<AggregatedBoardWithWindow> {
  const { data, error } = await db
    .from('daily_run_totals')
    .select('player_id, total_score')
    .gte('completed_at', args.weekStart)
    .lt('completed_at', args.weekEnd);
  if (error) throw error;
  return aggregateRankWindow(data ?? [], {
    playerId: args.playerId,
    topLimit: args.topLimit,
    neighbors: args.neighbors,
  });
}

/**
 * All-time board: aggregate per player across every recorded run + top-N +
 * windowed "you" view. Single full-table scan; the cohort stays small.
 */
export async function selectAllTimeBoardForPlayer(
  db: Db,
  args: { playerId: string | null; topLimit: number; neighbors: number },
): Promise<AggregatedBoardWithWindow> {
  const { data, error } = await db.from('daily_run_totals').select('player_id, total_score');
  if (error) throw error;
  return aggregateRankWindow(data ?? [], args);
}
