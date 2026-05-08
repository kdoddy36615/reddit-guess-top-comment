import type { Metadata } from 'next';
import {
  findDailyRunTotal,
  selectTopBoard,
  selectWindowedBoardForPlayer,
} from '@/db/daily_run_totals';
import { getPlayerByAuthId } from '@/db/players';
import { dailyRoomId } from '@/lib/daily';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { createSsrClient } from '@/lib/supabase/ssr';
import { type BoardRow, LeaderboardClient } from './leaderboard-client';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Leaderboard · Reddit Guess Top Comment',
  description: "Today's daily-run leaderboard.",
};

const TOP_LIMIT = 20;
const WINDOW_NEIGHBORS = 2;

/**
 * Server-rendered leaderboard.
 *
 * Today tab is the only live timeframe in this slice — week + all-time tabs
 * render disabled placeholders. The "you" row is highlighted only when the
 * viewer has a permanent identity (anonymous-auth users see the
 * "sign in to compete" CTA instead, since their cohort would never persist
 * past a sign-out).
 */
export default async function LeaderboardPage() {
  const ssr = await createSsrClient();
  const {
    data: { user },
  } = await ssr.auth.getUser();
  const isAnonymous = !user || user.is_anonymous === true;

  const player = user ? await getPlayerByAuthId(ssr, user.id) : null;

  const db = createServiceRoleClient();
  const today = new Date();
  const roomId = dailyRoomId(today);
  const dateLabel = roomId.replace(/^daily-/, '');

  const [topRaw, totalCountResp] = await Promise.all([
    selectTopBoard(db, { dailyRoomId: roomId, limit: TOP_LIMIT }),
    db
      .from('daily_run_totals')
      .select('player_id', { count: 'exact', head: true })
      .eq('daily_room_id', roomId),
  ]);
  if (totalCountResp.error) throw totalCountResp.error;
  const totalPlayers = totalCountResp.count ?? 0;

  // The viewer's row only counts as "you" if they have a permanent identity
  // AND a finalized run today. Anonymous-auth users with a run still see
  // their score in the board (matched by playerId), but no gold variant —
  // anchoring the gold to a permanent identity keeps the social signal honest.
  let youWindow: BoardRow[] | null = null;
  if (player && !isAnonymous) {
    const youRun = await findDailyRunTotal(db, {
      playerId: player.id,
      dailyRoomId: roomId,
    });
    const inTop = topRaw.some((r) => r.playerId === player.id);
    if (youRun && !inTop) {
      const windowed = await selectWindowedBoardForPlayer(db, {
        dailyRoomId: roomId,
        playerId: player.id,
        before: WINDOW_NEIGHBORS,
        after: WINDOW_NEIGHBORS,
      });
      if (windowed) {
        const windowIds = windowed.rows.map((r) => r.playerId);
        const namesById = await fetchNicknames(db, windowIds);
        youWindow = windowed.rows.map((r) => ({
          playerId: r.playerId,
          rank: r.rank,
          name: namesById.get(r.playerId) ?? '—',
          score: r.totalScore,
        }));
      }
    }
  }

  const topPlayerIds = topRaw.map((r) => r.playerId);
  const namesById = await fetchNicknames(db, topPlayerIds);
  const topRows: BoardRow[] = topRaw.map((r, i) => ({
    playerId: r.playerId,
    rank: i + 1,
    name: namesById.get(r.playerId) ?? '—',
    score: r.totalScore,
  }));

  return (
    <LeaderboardClient
      dateLabel={dateLabel}
      totalPlayers={totalPlayers}
      topRows={topRows}
      youWindow={youWindow}
      currentPlayerId={!isAnonymous ? (player?.id ?? null) : null}
      isAnonymous={isAnonymous}
      initialNow={today.toISOString()}
    />
  );
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
