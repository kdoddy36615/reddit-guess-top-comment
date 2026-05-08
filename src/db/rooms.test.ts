// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  createRoom,
  getRoom,
  getRoomPlayers,
  joinRoom,
  kickPlayer,
  lockRoom,
  transitionStatus,
  updateSettings,
} from './rooms';

// ---------------------------------------------------------------------------
// In-memory Supabase fake
//
// Just the slice of the PostgrestQueryBuilder API used by src/db/rooms.ts:
// - .from('room_metadata' | 'room_players')
// - .select(), .eq(...).maybeSingle() and .eq(...).eq(...) chains
// - .insert(row).select().single()
// - .update(patch).eq(...).select().single() (or no .select())
// - .delete().eq(...)
// Each call returns a thenable so awaiting the builder yields { data, error }.
// ---------------------------------------------------------------------------

type Room = {
  code: string;
  host_id: string | null;
  mode: string;
  max_players: number;
  round_count: number;
  timer_seconds: number;
  status: string;
  locked: boolean;
  created_at: string;
  started_at: string | null;
  ended_at: string | null;
};
type RoomPlayer = {
  room_code: string;
  player_id: string;
  is_kicked: boolean;
  joined_at: string;
};

function makeFakeDb() {
  const rooms = new Map<string, Room>();
  const players: RoomPlayer[] = [];

  function rowMatches(row: Record<string, unknown>, filters: Record<string, unknown>): boolean {
    for (const [k, v] of Object.entries(filters)) {
      if (row[k] !== v) return false;
    }
    return true;
  }

  function roomMetaBuilder() {
    const filters: Record<string, unknown> = {};
    let mode: 'select' | 'insert' | 'update' | 'delete' = 'select';
    let pendingPatch: Partial<Room> = {};
    let pendingInsert: Room | null = null;
    const returningSingle = false;

    const builder = {
      select: () => builder,
      eq: (col: string, val: unknown) => {
        filters[col] = val;
        return builder;
      },
      maybeSingle: async () => {
        const matches = [...rooms.values()].filter((r) => rowMatches(r, filters));
        return { data: matches[0] ?? null, error: null };
      },
      single: async () => {
        if (mode === 'insert') {
          return { data: pendingInsert, error: null };
        }
        if (mode === 'update') {
          const matches = [...rooms.values()].filter((r) => rowMatches(r, filters));
          if (matches.length === 0) return { data: null, error: null };
          return { data: matches[0], error: null };
        }
        const matches = [...rooms.values()].filter((r) => rowMatches(r, filters));
        return { data: matches[0] ?? null, error: null };
      },
      insert: (row: Partial<Room>) => {
        mode = 'insert';
        if (rooms.has(row.code as string)) {
          // mimic unique violation
          const errBuilder = {
            select: () => errBuilder,
            single: async () => ({
              data: null,
              error: { code: '23505', message: 'duplicate key' },
            }),
          };
          return errBuilder;
        }
        const full: Room = {
          code: row.code as string,
          host_id: row.host_id ?? null,
          mode: row.mode as string,
          max_players: row.max_players as number,
          round_count: row.round_count ?? 8,
          timer_seconds: row.timer_seconds ?? 30,
          status: row.status ?? 'lobby',
          locked: row.locked ?? false,
          created_at: new Date().toISOString(),
          started_at: row.started_at ?? null,
          ended_at: row.ended_at ?? null,
        };
        rooms.set(full.code, full);
        pendingInsert = full;
        return builder;
      },
      update: (patch: Partial<Room>) => {
        mode = 'update';
        pendingPatch = patch;
        return builder;
      },
      delete: () => {
        mode = 'delete';
        return builder;
      },
      // biome-ignore lint/suspicious/noThenProperty: thenable for await
      then: (resolve: (v: { data: unknown; error: null }) => void) => {
        if (mode === 'update') {
          for (const r of rooms.values()) {
            if (rowMatches(r, filters)) Object.assign(r, pendingPatch);
          }
          if (returningSingle) {
            const m = [...rooms.values()].filter((r) => rowMatches(r, filters))[0] ?? null;
            return resolve({ data: m, error: null });
          }
          return resolve({ data: null, error: null });
        }
        if (mode === 'delete') {
          for (const code of [...rooms.keys()]) {
            const r = rooms.get(code);
            if (r && rowMatches(r, filters)) rooms.delete(code);
          }
          return resolve({ data: null, error: null });
        }
        const matches = [...rooms.values()].filter((r) => rowMatches(r, filters));
        resolve({ data: matches, error: null });
      },
    };
    return builder;
  }

  function roomPlayersBuilder() {
    const filters: Record<string, unknown> = {};
    let mode: 'select' | 'insert' | 'update' | 'delete' = 'select';
    let pendingPatch: Partial<RoomPlayer> = {};
    let pendingInsert: RoomPlayer | null = null;

    const builder = {
      select: (_cols?: string, _opts?: { count?: string; head?: boolean }) => {
        return builder;
      },
      eq: (col: string, val: unknown) => {
        filters[col] = val;
        return builder;
      },
      maybeSingle: async () => {
        const matches = players.filter((p) => rowMatches(p, filters));
        return { data: matches[0] ?? null, error: null };
      },
      single: async () => {
        if (mode === 'insert') return { data: pendingInsert, error: null };
        const matches = players.filter((p) => rowMatches(p, filters));
        return { data: matches[0] ?? null, error: null };
      },
      insert: (row: Partial<RoomPlayer>) => {
        mode = 'insert';
        const existing = players.find(
          (p) => p.room_code === row.room_code && p.player_id === row.player_id,
        );
        if (existing) {
          const errBuilder = {
            select: () => errBuilder,
            single: async () => ({
              data: null,
              error: { code: '23505', message: 'duplicate key' },
            }),
          };
          return errBuilder;
        }
        const full: RoomPlayer = {
          room_code: row.room_code as string,
          player_id: row.player_id as string,
          is_kicked: row.is_kicked ?? false,
          joined_at: new Date().toISOString(),
        };
        players.push(full);
        pendingInsert = full;
        return builder;
      },
      update: (patch: Partial<RoomPlayer>) => {
        mode = 'update';
        pendingPatch = patch;
        return builder;
      },
      delete: () => {
        mode = 'delete';
        return builder;
      },
      // biome-ignore lint/suspicious/noThenProperty: thenable for await
      then: (resolve: (v: { data: unknown; error: null; count?: number | null }) => void) => {
        if (mode === 'update') {
          for (const p of players) {
            if (rowMatches(p, filters)) Object.assign(p, pendingPatch);
          }
          return resolve({ data: null, error: null });
        }
        if (mode === 'delete') {
          for (let i = players.length - 1; i >= 0; i--) {
            if (rowMatches(players[i], filters)) players.splice(i, 1);
          }
          return resolve({ data: null, error: null });
        }
        const matches = players.filter((p) => rowMatches(p, filters));
        resolve({ data: matches, error: null, count: matches.length });
      },
    };
    return builder;
  }

  const from = (table: string) => {
    if (table === 'room_metadata') return roomMetaBuilder();
    if (table === 'room_players') return roomPlayersBuilder();
    throw new Error(`unexpected table: ${table}`);
  };

  return { db: { from } as never, rooms, players };
}

describe('rooms wrapper — full lifecycle', () => {
  it('create → join → kick → lock → start → end', async () => {
    const { db, rooms, players } = makeFakeDb();

    // 1. host creates a host-mode room (deterministic rng → all same char).
    const created = await createRoom(db, {
      hostPlayerId: 'host-1',
      mode: 'host',
      maxPlayers: 32,
      rng: () => 0,
    });
    expect(created.code).toMatch(/^[A-Z2-9]{6}$/);
    expect(created.host_id).toBe('host-1');
    expect(created.mode).toBe('host');
    expect(created.max_players).toBe(32);
    expect(created.round_count).toBe(8);
    expect(created.timer_seconds).toBe(30);
    expect(created.status).toBe('lobby');
    expect(created.locked).toBe(false);

    // Host gets auto-added to room_players.
    expect(
      players.find((p) => p.room_code === created.code && p.player_id === 'host-1'),
    ).toBeDefined();

    // 2. guest joins.
    const joinResult = await joinRoom(db, {
      code: created.code,
      playerId: 'guest-1',
    });
    expect(joinResult.ok).toBe(true);
    expect(players.find((p) => p.player_id === 'guest-1')?.is_kicked).toBe(false);

    // Joining the same room twice is idempotent (no-op).
    const rejoin = await joinRoom(db, { code: created.code, playerId: 'guest-1' });
    expect(rejoin.ok).toBe(true);

    // 3. host kicks the guest.
    await kickPlayer(db, { code: created.code, playerId: 'guest-1' });
    const kicked = players.find((p) => p.player_id === 'guest-1');
    expect(kicked?.is_kicked).toBe(true);

    // Kicked players cannot rejoin.
    const blocked = await joinRoom(db, { code: created.code, playerId: 'guest-1' });
    expect(blocked).toEqual({ ok: false, reason: 'kicked' });

    // 4. host locks the room — new joins blocked.
    await lockRoom(db, { code: created.code, locked: true });
    expect(rooms.get(created.code)?.locked).toBe(true);
    const lockedTry = await joinRoom(db, { code: created.code, playerId: 'guest-2' });
    expect(lockedTry).toEqual({ ok: false, reason: 'locked' });

    // Unlock and let another guest in.
    await lockRoom(db, { code: created.code, locked: false });
    const guest2 = await joinRoom(db, { code: created.code, playerId: 'guest-2' });
    expect(guest2.ok).toBe(true);

    // 5. host updates settings.
    await updateSettings(db, {
      code: created.code,
      roundCount: 12,
      timerSeconds: 45,
    });
    const r = rooms.get(created.code);
    expect(r?.round_count).toBe(12);
    expect(r?.timer_seconds).toBe(45);

    // 6. transition lobby → live (sets started_at).
    await transitionStatus(db, { code: created.code, status: 'live' });
    expect(rooms.get(created.code)?.status).toBe('live');
    expect(rooms.get(created.code)?.started_at).not.toBeNull();

    // Status='live' blocks new joins.
    const liveTry = await joinRoom(db, { code: created.code, playerId: 'late-guest' });
    expect(liveTry).toEqual({ ok: false, reason: 'not_in_lobby' });

    // 7. transition live → ended (sets ended_at).
    await transitionStatus(db, { code: created.code, status: 'ended' });
    expect(rooms.get(created.code)?.status).toBe('ended');
    expect(rooms.get(created.code)?.ended_at).not.toBeNull();
  });

  it('blocks join when room is at capacity', async () => {
    const { db } = makeFakeDb();
    // max_players=2: host + 1 guest fills it.
    const room = await createRoom(db, {
      hostPlayerId: 'host',
      mode: 'host',
      maxPlayers: 2,
      rng: () => 0,
    });
    const ok = await joinRoom(db, { code: room.code, playerId: 'guest-1' });
    expect(ok.ok).toBe(true);
    const full = await joinRoom(db, { code: room.code, playerId: 'guest-2' });
    expect(full).toEqual({ ok: false, reason: 'full' });
  });

  it('joinRoom returns not_found for an unknown code', async () => {
    const { db } = makeFakeDb();
    const result = await joinRoom(db, { code: 'NOPE99', playerId: 'p1' });
    expect(result).toEqual({ ok: false, reason: 'not_found' });
  });

  it('createRoom for random mode locks settings to defaults', async () => {
    const { db } = makeFakeDb();
    const room = await createRoom(db, {
      mode: 'random',
      maxPlayers: 8,
      rng: () => 0,
    });
    expect(room.host_id).toBeNull();
    expect(room.round_count).toBe(8);
    expect(room.timer_seconds).toBe(30);
    expect(room.mode).toBe('random');
  });

  it('getRoom returns null when no row exists', async () => {
    const { db } = makeFakeDb();
    const r = await getRoom(db, 'XXXXXX');
    expect(r).toBeNull();
  });

  it('getRoomPlayers returns rows in joined_at order with embedded nickname', async () => {
    // Stand-alone mock: getRoomPlayers uses a Supabase foreign-table embed
    // (`players(nickname)`) which the room-lifecycle fake doesn't model.
    const rows = [
      {
        player_id: 'p1',
        is_kicked: false,
        joined_at: '2026-05-08T12:00:00Z',
        players: { nickname: 'alice' },
      },
      {
        player_id: 'p2',
        is_kicked: true,
        joined_at: '2026-05-08T12:01:00Z',
        players: [{ nickname: 'bob' }],
      },
      {
        player_id: 'p3',
        is_kicked: false,
        joined_at: '2026-05-08T12:02:00Z',
        players: null,
      },
    ];
    const order = (col: string, opts: { ascending: boolean }) =>
      Promise.resolve({ data: rows, error: null, _col: col, _asc: opts.ascending });
    const eq = (_col: string, _val: unknown) => ({ order });
    const select = (_cols: string) => ({ eq });
    const from = (_table: string) => ({ select });
    // biome-ignore lint/suspicious/noExplicitAny: minimal mock surface
    const result = await getRoomPlayers({ from } as any, 'CODE12');
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({
      player_id: 'p1',
      is_kicked: false,
      joined_at: '2026-05-08T12:00:00Z',
      nickname: 'alice',
    });
    // Tolerates Supabase returning the embed as either an object or a single-
    // element array depending on the cardinality inference.
    expect(result[1].nickname).toBe('bob');
    expect(result[1].is_kicked).toBe(true);
    expect(result[2].nickname).toBeNull();
  });

  it('does not count kicked players against capacity', async () => {
    const { db } = makeFakeDb();
    const room = await createRoom(db, {
      hostPlayerId: 'host',
      mode: 'host',
      maxPlayers: 2,
      rng: () => 0,
    });
    await joinRoom(db, { code: room.code, playerId: 'guest-1' });
    await kickPlayer(db, { code: room.code, playerId: 'guest-1' });
    // Even though there are 2 rows, one is kicked — a fresh player should fit.
    const r = await joinRoom(db, { code: room.code, playerId: 'guest-2' });
    expect(r.ok).toBe(true);
  });
});
