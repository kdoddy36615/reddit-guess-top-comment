// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  selectAllTimeBoard,
  selectTopBoard,
  selectWeekRollup,
  selectWindowedBoardForPlayer,
  upsertDailyRunTotal,
} from './daily_run_totals';

const ROOM_TODAY = 'daily-2026-05-08';
const ROOM_YESTERDAY = 'daily-2026-05-07';
const PLAYER_A = '11111111-1111-1111-1111-111111111111';
const PLAYER_B = '22222222-2222-2222-2222-222222222222';
const PLAYER_C = '33333333-3333-3333-3333-333333333333';
const PLAYER_D = '44444444-4444-4444-4444-444444444444';

function row(
  playerId: string,
  dailyRoomId: string,
  totalScore: number,
  completedAt: string,
): StoredRow {
  return {
    player_id: playerId,
    daily_room_id: dailyRoomId,
    total_score: totalScore,
    completed_at: completedAt,
  };
}

type StoredRow = {
  player_id: string;
  daily_room_id: string;
  total_score: number;
  completed_at: string;
};

/**
 * In-memory fake of the `daily_run_totals` Supabase wrapper surface.
 *
 * Mirrors only what the wrapper actually calls — not a general-purpose
 * Supabase mock. Supports upsert (with onConflict on the composite key),
 * select with eq / gte / lt / order / limit, and bulk select for all-time.
 */
function fakeDb(initial: StoredRow[] = []) {
  const store = new Map<string, StoredRow>();
  for (const r of initial) {
    store.set(`${r.player_id}::${r.daily_room_id}`, { ...r });
  }

  const from = (table: string) => {
    if (table !== 'daily_run_totals') throw new Error(`unexpected table: ${table}`);

    type Filter =
      | { kind: 'eq'; col: string; val: unknown }
      | { kind: 'gte'; col: string; val: string }
      | { kind: 'lt'; col: string; val: string };
    const filters: Filter[] = [];
    type OrderSpec = { col: string; ascending: boolean };
    const orders: OrderSpec[] = [];
    let limit: number | null = null;

    let pendingUpsert: StoredRow | null = null;

    const matches = (row: StoredRow) =>
      filters.every((f) => {
        const v = row[f.col as keyof StoredRow];
        if (f.kind === 'eq') return v === f.val;
        if (f.kind === 'gte') return typeof v === 'string' && v >= f.val;
        if (f.kind === 'lt') return typeof v === 'string' && v < f.val;
        return false;
      });

    const collect = (): StoredRow[] => {
      const filtered = [...store.values()].filter(matches);
      if (orders.length) {
        filtered.sort((a, b) => {
          for (const o of orders) {
            const av = a[o.col as keyof StoredRow];
            const bv = b[o.col as keyof StoredRow];
            if (av === bv) continue;
            const cmp = av < bv ? -1 : 1;
            return o.ascending ? cmp : -cmp;
          }
          return 0;
        });
      }
      return limit !== null ? filtered.slice(0, limit) : filtered;
    };

    const builder: Record<string, unknown> = {
      upsert(
        row: {
          player_id: string;
          daily_room_id: string;
          total_score: number;
          completed_at: string;
        },
        _opts: { onConflict: string },
      ) {
        pendingUpsert = { ...row };
        return builder;
      },
      select(_cols: string) {
        return builder;
      },
      eq(col: string, val: unknown) {
        filters.push({ kind: 'eq', col, val });
        return builder;
      },
      gte(col: string, val: string) {
        filters.push({ kind: 'gte', col, val });
        return builder;
      },
      lt(col: string, val: string) {
        filters.push({ kind: 'lt', col, val });
        return builder;
      },
      order(col: string, opts: { ascending: boolean }) {
        orders.push({ col, ascending: opts.ascending });
        return builder;
      },
      limit(n: number) {
        limit = n;
        return builder;
      },
      async single() {
        if (pendingUpsert) {
          const key = `${pendingUpsert.player_id}::${pendingUpsert.daily_room_id}`;
          store.set(key, pendingUpsert);
          return {
            data: {
              total_score: pendingUpsert.total_score,
              completed_at: pendingUpsert.completed_at,
            },
            error: null,
          };
        }
        const rows = collect();
        return { data: rows[0] ?? null, error: rows[0] ? null : { message: 'not found' } };
      },
      // biome-ignore lint/suspicious/noThenProperty: mocking PostgrestBuilder
      then(resolve: (v: { data: StoredRow[]; error: null }) => void) {
        resolve({ data: collect(), error: null });
      },
    };
    return builder;
  };

  return { db: { from } as never, store };
}

describe('upsertDailyRunTotal', () => {
  it('inserts a new row and returns the persisted score + completed_at', async () => {
    const { db, store } = fakeDb();
    const result = await upsertDailyRunTotal(db, {
      playerId: PLAYER_A,
      dailyRoomId: ROOM_TODAY,
      totalScore: 287,
    });
    expect(result.totalScore).toBe(287);
    expect(result.completedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(store.size).toBe(1);
  });

  it('is idempotent — second call for the same (player, room) replaces the row, not inserts', async () => {
    const { db, store } = fakeDb();
    await upsertDailyRunTotal(db, {
      playerId: PLAYER_A,
      dailyRoomId: ROOM_TODAY,
      totalScore: 100,
    });
    const second = await upsertDailyRunTotal(db, {
      playerId: PLAYER_A,
      dailyRoomId: ROOM_TODAY,
      totalScore: 250,
    });
    expect(store.size).toBe(1);
    expect(second.totalScore).toBe(250);
    const stored = store.get(`${PLAYER_A}::${ROOM_TODAY}`);
    expect(stored?.total_score).toBe(250);
  });
});

describe('selectTopBoard', () => {
  it('returns top-N for a single room, score desc with earlier completer winning ties', async () => {
    const { db } = fakeDb([
      row(PLAYER_A, ROOM_TODAY, 200, '2026-05-08T10:00:00Z'),
      row(PLAYER_B, ROOM_TODAY, 300, '2026-05-08T11:00:00Z'),
      row(PLAYER_C, ROOM_TODAY, 250, '2026-05-08T09:30:00Z'),
      row(PLAYER_D, ROOM_TODAY, 250, '2026-05-08T08:30:00Z'),
      // Different room — must not appear.
      row(PLAYER_A, ROOM_YESTERDAY, 999, '2026-05-07T10:00:00Z'),
    ]);
    const top = await selectTopBoard(db, { dailyRoomId: ROOM_TODAY, limit: 3 });
    expect(top.map((r) => r.playerId)).toEqual([PLAYER_B, PLAYER_D, PLAYER_C]);
    expect(top[0].totalScore).toBe(300);
  });

  it('respects the limit argument', async () => {
    const { db } = fakeDb([
      row(PLAYER_A, ROOM_TODAY, 100, '2026-05-08T10:00:00Z'),
      row(PLAYER_B, ROOM_TODAY, 200, '2026-05-08T11:00:00Z'),
      row(PLAYER_C, ROOM_TODAY, 300, '2026-05-08T09:00:00Z'),
    ]);
    const top = await selectTopBoard(db, { dailyRoomId: ROOM_TODAY, limit: 2 });
    expect(top).toHaveLength(2);
  });
});

describe('selectWindowedBoardForPlayer', () => {
  /**
   * Build a 100-player board where each player's score is `1000 - i*5` so the
   * order is deterministic. The player at rank 47 (1-based) sits at index 46.
   */
  function build100PlayerBoard() {
    const rows: StoredRow[] = [];
    for (let i = 0; i < 100; i++) {
      const playerId = `player-${i.toString().padStart(3, '0')}`;
      const score = 1000 - i * 5;
      const completedAt = `2026-05-08T${(8 + Math.floor(i / 60)).toString().padStart(2, '0')}:${(i % 60).toString().padStart(2, '0')}:00Z`;
      rows.push(row(playerId, ROOM_TODAY, score, completedAt));
    }
    return rows;
  }

  it('returns the player rank and a window of surrounding rows when they sit at rank 47', async () => {
    const { db } = fakeDb(build100PlayerBoard());

    const result = await selectWindowedBoardForPlayer(db, {
      dailyRoomId: ROOM_TODAY,
      playerId: 'player-046',
      before: 2,
      after: 2,
    });

    expect(result).not.toBeNull();
    expect(result?.rank).toBe(47);
    expect(result?.rows.map((r) => r.rank)).toEqual([45, 46, 47, 48, 49]);
    expect(result?.rows.map((r) => r.playerId)).toEqual([
      'player-044',
      'player-045',
      'player-046',
      'player-047',
      'player-048',
    ]);
    // The center row is the focused player.
    expect(result?.rows[2].playerId).toBe('player-046');
  });

  it('clamps the window at the top of the board (rank 1 has no rows above it)', async () => {
    const { db } = fakeDb(build100PlayerBoard());
    const result = await selectWindowedBoardForPlayer(db, {
      dailyRoomId: ROOM_TODAY,
      playerId: 'player-000',
      before: 3,
      after: 2,
    });
    expect(result?.rank).toBe(1);
    expect(result?.rows.map((r) => r.rank)).toEqual([1, 2, 3]);
  });

  it('returns null when the player has no entry for this daily room', async () => {
    const { db } = fakeDb([row(PLAYER_A, ROOM_TODAY, 100, '2026-05-08T10:00:00Z')]);
    const result = await selectWindowedBoardForPlayer(db, {
      dailyRoomId: ROOM_TODAY,
      playerId: PLAYER_B,
      before: 2,
      after: 2,
    });
    expect(result).toBeNull();
  });
});

describe('selectWeekRollup', () => {
  it('aggregates per-player scores across the week and ranks desc', async () => {
    const { db } = fakeDb([
      // Player A: 3 daily runs across the week — 100 + 200 + 50 = 350
      row(PLAYER_A, 'daily-2026-05-04', 100, '2026-05-04T10:00:00Z'),
      row(PLAYER_A, 'daily-2026-05-05', 200, '2026-05-05T10:00:00Z'),
      row(PLAYER_A, 'daily-2026-05-06', 50, '2026-05-06T10:00:00Z'),
      // Player B: 2 runs — 250 + 250 = 500
      row(PLAYER_B, 'daily-2026-05-04', 250, '2026-05-04T11:00:00Z'),
      row(PLAYER_B, 'daily-2026-05-07', 250, '2026-05-07T11:00:00Z'),
      // Player C: 1 run — 400
      row(PLAYER_C, 'daily-2026-05-05', 400, '2026-05-05T09:00:00Z'),
    ]);
    const week = await selectWeekRollup(db, {
      weekStart: '2026-05-04T00:00:00Z',
      weekEnd: '2026-05-11T00:00:00Z',
      limit: 10,
    });
    expect(week).toEqual([
      { playerId: PLAYER_B, totalScore: 500, runCount: 2 },
      { playerId: PLAYER_C, totalScore: 400, runCount: 1 },
      { playerId: PLAYER_A, totalScore: 350, runCount: 3 },
    ]);
  });

  it('respects the half-open [start, end) window — runs on the end instant fall outside', async () => {
    const weekStart = '2026-05-04T00:00:00Z';
    const weekEnd = '2026-05-11T00:00:00Z';
    const { db } = fakeDb([
      // Right before the window start — must be excluded.
      row(PLAYER_A, 'daily-2026-05-03', 100, '2026-05-03T23:59:59Z'),
      // Exact window start — must be included (gte).
      row(PLAYER_B, 'daily-2026-05-04', 200, weekStart),
      // Inside the window.
      row(PLAYER_C, 'daily-2026-05-08', 300, '2026-05-08T12:00:00Z'),
      // Exact window end — must be excluded (lt).
      row(PLAYER_D, 'daily-2026-05-11', 999, weekEnd),
    ]);
    const week = await selectWeekRollup(db, { weekStart, weekEnd, limit: 10 });
    expect(week.map((r) => r.playerId)).toEqual([PLAYER_C, PLAYER_B]);
    expect(week.find((r) => r.playerId === PLAYER_A)).toBeUndefined();
    expect(week.find((r) => r.playerId === PLAYER_D)).toBeUndefined();
  });

  it('respects the limit argument after aggregating', async () => {
    const { db } = fakeDb([
      row(PLAYER_A, 'daily-2026-05-04', 100, '2026-05-04T10:00:00Z'),
      row(PLAYER_B, 'daily-2026-05-04', 200, '2026-05-04T10:00:00Z'),
      row(PLAYER_C, 'daily-2026-05-04', 300, '2026-05-04T10:00:00Z'),
    ]);
    const week = await selectWeekRollup(db, {
      weekStart: '2026-05-04T00:00:00Z',
      weekEnd: '2026-05-11T00:00:00Z',
      limit: 2,
    });
    expect(week).toHaveLength(2);
    expect(week.map((r) => r.playerId)).toEqual([PLAYER_C, PLAYER_B]);
  });
});

describe('selectAllTimeBoard', () => {
  it('aggregates total scores per player across every recorded daily run', async () => {
    const { db } = fakeDb([
      row(PLAYER_A, 'daily-2026-04-01', 100, '2026-04-01T10:00:00Z'),
      row(PLAYER_A, 'daily-2026-04-15', 200, '2026-04-15T10:00:00Z'),
      row(PLAYER_A, 'daily-2026-05-01', 300, '2026-05-01T10:00:00Z'),
      row(PLAYER_B, 'daily-2026-04-01', 500, '2026-04-01T11:00:00Z'),
      row(PLAYER_C, 'daily-2026-05-08', 50, '2026-05-08T10:00:00Z'),
    ]);
    const board = await selectAllTimeBoard(db, { limit: 10 });
    expect(board).toEqual([
      { playerId: PLAYER_A, totalScore: 600, runCount: 3 },
      { playerId: PLAYER_B, totalScore: 500, runCount: 1 },
      { playerId: PLAYER_C, totalScore: 50, runCount: 1 },
    ]);
  });

  it('returns an empty array when there are no rows', async () => {
    const { db } = fakeDb([]);
    const board = await selectAllTimeBoard(db, { limit: 10 });
    expect(board).toEqual([]);
  });
});
