import type { Metadata } from 'next';
import {
  type AggregatedBoardWithWindow,
  findDailyRunTotal,
  selectAllTimeBoardForPlayer,
  selectTopBoard,
  selectWeekBoardForPlayer,
  selectWindowedBoardForPlayer,
} from '@/db/daily_run_totals';
import { getPlayerByAuthId } from '@/db/players';
import { dailyRoomId } from '@/lib/daily';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { createSsrClient } from '@/lib/supabase/ssr';
import {
  type BoardRow,
  LeaderboardClient,
  type Timeframe,
  type TimeframeBoard,
} from './leaderboard-client';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Leaderboard · Reddit Guess Top Comment',
  description: 'Today, this week, and all-time daily-run leaderboards.',
};

const TOP_LIMIT = 20;
const WINDOW_NEIGHBORS = 2;
const WEEK_DAYS = 7;
const ALLOWED_TABS: readonly Timeframe[] = ['today', 'week', 'all-time'] as const;

/**
 * Server-rendered leaderboard.
 *
 * All three timeframes are pre-computed server-side and handed to the client
 * so tab switches are instant + URL-syncable. The "you" row only highlights
 * for permanently-identified viewers — anonymous-auth users see the
 * "sign in to compete" CTA, since their cohort wouldn't survive a sign-out.
 *
 * The `?tab=` query param picks the initially-rendered timeframe; the client
 * mirrors it back to the URL on tab change for shareability.
 */
export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const ssr = await createSsrClient();
  const {
    data: { user },
  } = await ssr.auth.getUser();
  const isAnonymous = !user || user.is_anonymous === true;

  const player = user ? await getPlayerByAuthId(ssr, user.id) : null;
  const focusedPlayerId = !isAnonymous && player ? player.id : null;

  const db = createServiceRoleClient();
  const today = new Date();
  const roomId = dailyRoomId(today);
  const dateLabel = roomId.replace(/^daily-/, '');

  const weekEnd = today.toISOString();
  const weekStart = new Date(today.getTime() - WEEK_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const [todayBoard, weekBoard, allTimeBoard] = await Promise.all([
    buildTodayBoard(db, { roomId, focusedPlayerId }),
    selectWeekBoardForPlayer(db, {
      weekStart,
      weekEnd,
      playerId: focusedPlayerId,
      topLimit: TOP_LIMIT,
      neighbors: WINDOW_NEIGHBORS,
    }),
    selectAllTimeBoardForPlayer(db, {
      playerId: focusedPlayerId,
      topLimit: TOP_LIMIT,
      neighbors: WINDOW_NEIGHBORS,
    }),
  ]);

  // One round-trip for all distinct player IDs across all 3 boards.
  const allPlayerIds = new Set<string>();
  for (const r of todayBoard.topRows) allPlayerIds.add(r.playerId);
  for (const r of todayBoard.youWindow ?? []) allPlayerIds.add(r.playerId);
  for (const r of weekBoard.topRows) allPlayerIds.add(r.playerId);
  for (const r of weekBoard.youWindow ?? []) allPlayerIds.add(r.playerId);
  for (const r of allTimeBoard.topRows) allPlayerIds.add(r.playerId);
  for (const r of allTimeBoard.youWindow ?? []) allPlayerIds.add(r.playerId);
  const namesById = await fetchNicknames(db, [...allPlayerIds]);

  const boards: Record<Timeframe, TimeframeBoard> = {
    today: {
      topRows: todayBoard.topRows.map((r) => withName(r, namesById)),
      youWindow: todayBoard.youWindow
        ? todayBoard.youWindow.map((r) => withName(r, namesById))
        : null,
      totalPlayers: todayBoard.totalPlayers,
    },
    week: aggregatedToTimeframeBoard(weekBoard, namesById),
    'all-time': aggregatedToTimeframeBoard(allTimeBoard, namesById),
  };

  const params = await searchParams;
  const requested = params.tab;
  const initialTab: Timeframe = ALLOWED_TABS.includes(requested as Timeframe)
    ? (requested as Timeframe)
    : 'today';

  return (
    <LeaderboardClient
      dateLabel={dateLabel}
      initialNow={today.toISOString()}
      currentPlayerId={focusedPlayerId}
      isAnonymous={isAnonymous}
      boards={boards}
      initialTab={initialTab}
    />
  );
}

type IntermediateRow = { playerId: string; rank: number; score: number };
type IntermediateBoard = {
  topRows: IntermediateRow[];
  youWindow: IntermediateRow[] | null;
  totalPlayers: number;
};

async function buildTodayBoard(
  db: ReturnType<typeof createServiceRoleClient>,
  args: { roomId: string; focusedPlayerId: string | null },
): Promise<IntermediateBoard> {
  const [topRaw, totalCountResp] = await Promise.all([
    selectTopBoard(db, { dailyRoomId: args.roomId, limit: TOP_LIMIT }),
    db
      .from('daily_run_totals')
      .select('player_id', { count: 'exact', head: true })
      .eq('daily_room_id', args.roomId),
  ]);
  if (totalCountResp.error) throw totalCountResp.error;
  const totalPlayers = totalCountResp.count ?? 0;

  const topRows: IntermediateRow[] = topRaw.map((r, i) => ({
    playerId: r.playerId,
    rank: i + 1,
    score: r.totalScore,
  }));

  let youWindow: IntermediateRow[] | null = null;
  if (args.focusedPlayerId) {
    const youRun = await findDailyRunTotal(db, {
      playerId: args.focusedPlayerId,
      dailyRoomId: args.roomId,
    });
    const inTop = topRaw.some((r) => r.playerId === args.focusedPlayerId);
    if (youRun && !inTop) {
      const windowed = await selectWindowedBoardForPlayer(db, {
        dailyRoomId: args.roomId,
        playerId: args.focusedPlayerId,
        before: WINDOW_NEIGHBORS,
        after: WINDOW_NEIGHBORS,
      });
      if (windowed) {
        youWindow = windowed.rows.map((r) => ({
          playerId: r.playerId,
          rank: r.rank,
          score: r.totalScore,
        }));
      }
    }
  }

  return { topRows, youWindow, totalPlayers };
}

function aggregatedToTimeframeBoard(
  board: AggregatedBoardWithWindow,
  namesById: Map<string, string>,
): TimeframeBoard {
  return {
    topRows: board.topRows.map((r) =>
      withName({ playerId: r.playerId, rank: r.rank, score: r.totalScore }, namesById),
    ),
    youWindow: board.youWindow
      ? board.youWindow.map((r) =>
          withName({ playerId: r.playerId, rank: r.rank, score: r.totalScore }, namesById),
        )
      : null,
    totalPlayers: board.totalPlayers,
  };
}

function withName(row: IntermediateRow, namesById: Map<string, string>): BoardRow {
  return {
    playerId: row.playerId,
    rank: row.rank,
    score: row.score,
    name: namesById.get(row.playerId) ?? '—',
  };
}

async function fetchNicknames(
  db: ReturnType<typeof createServiceRoleClient>,
  playerIds: string[],
): Promise<Map<string, string>> {
  if (playerIds.length === 0) return new Map();
  const { data, error } = await db.from('players').select('id, nickname').in('id', playerIds);
  if (error) throw error;
  return new Map((data ?? []).map((row) => [row.id, row.nickname]));
}
