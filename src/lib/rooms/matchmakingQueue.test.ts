// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  assignOrCreate,
  processExpiredRandomRooms,
  RANDOM_MIN_PLAYERS_TO_START,
  RANDOM_QUEUE_TIMEOUT_MS,
} from './matchmakingQueue';

// ---------------------------------------------------------------------------
// In-memory Supabase fake — covers the slice of the PostgrestQueryBuilder API
// hit by `assignOrCreate` and `processExpiredRandomRooms`. Modeled on the
// fake in src/db/rooms.test.ts; adds `.order()` support on `room_metadata`
// (needed by the candidate-listing query in `assignOrCreate`).
// ---------------------------------------------------------------------------

interface RoomRow {
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
}
interface RoomPlayerRow {
  room_code: string;
  player_id: string;
  is_kicked: boolean;
  joined_at: string;
}

function rowMatches(row: Record<string, unknown>, filters: Record<string, unknown>): boolean {
  for (const [k, v] of Object.entries(filters)) {
    if (row[k] !== v) return false;
  }
  return true;
}

function makeFakeDb() {
  const rooms = new Map<string, RoomRow>();
  const players: RoomPlayerRow[] = [];
  let nowIso = () => new Date().toISOString();

  function roomMetaBuilder() {
    const filters: Record<string, unknown> = {};
    let mode: 'select' | 'insert' | 'update' | 'delete' = 'select';
    let pendingPatch: Partial<RoomRow> = {};
    let pendingInsert: RoomRow | null = null;
    let order: { col: keyof RoomRow; asc: boolean } | null = null;

    const builder = {
      select: () => builder,
      eq: (col: string, val: unknown) => {
        filters[col] = val;
        return builder;
      },
      order: (col: string, opts: { ascending: boolean }) => {
        order = { col: col as keyof RoomRow, asc: opts.ascending };
        return builder;
      },
      maybeSingle: async () => {
        const matches = [...rooms.values()].filter((r) =>
          rowMatches(r as unknown as Record<string, unknown>, filters),
        );
        return { data: matches[0] ?? null, error: null };
      },
      single: async () => {
        if (mode === 'insert') return { data: pendingInsert, error: null };
        const matches = [...rooms.values()].filter((r) =>
          rowMatches(r as unknown as Record<string, unknown>, filters),
        );
        return { data: matches[0] ?? null, error: null };
      },
      insert: (row: Partial<RoomRow>) => {
        mode = 'insert';
        if (rooms.has(row.code as string)) {
          const errBuilder = {
            select: () => errBuilder,
            single: async () => ({ data: null, error: { code: '23505', message: 'duplicate' } }),
          };
          return errBuilder;
        }
        const full: RoomRow = {
          code: row.code as string,
          host_id: row.host_id ?? null,
          mode: row.mode as string,
          max_players: row.max_players as number,
          round_count: row.round_count ?? 8,
          timer_seconds: row.timer_seconds ?? 30,
          status: row.status ?? 'lobby',
          locked: row.locked ?? false,
          created_at: nowIso(),
          started_at: row.started_at ?? null,
          ended_at: row.ended_at ?? null,
        };
        rooms.set(full.code, full);
        pendingInsert = full;
        return builder;
      },
      update: (patch: Partial<RoomRow>) => {
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
            if (rowMatches(r as unknown as Record<string, unknown>, filters)) {
              Object.assign(r, pendingPatch);
            }
          }
          return resolve({ data: null, error: null });
        }
        if (mode === 'delete') {
          for (const code of [...rooms.keys()]) {
            const r = rooms.get(code);
            if (r && rowMatches(r as unknown as Record<string, unknown>, filters)) {
              rooms.delete(code);
              // Cascade FK behavior — remove dependent room_players rows.
              for (let i = players.length - 1; i >= 0; i--) {
                if (players[i].room_code === code) players.splice(i, 1);
              }
            }
          }
          return resolve({ data: null, error: null });
        }
        let matches = [...rooms.values()].filter((r) =>
          rowMatches(r as unknown as Record<string, unknown>, filters),
        );
        if (order) {
          const { col, asc } = order;
          matches = matches.slice().sort((a, b) => {
            const av = a[col];
            const bv = b[col];
            if (av == null || bv == null) return 0;
            if (av < bv) return asc ? -1 : 1;
            if (av > bv) return asc ? 1 : -1;
            return 0;
          });
        }
        resolve({ data: matches, error: null });
      },
    };
    return builder;
  }

  function roomPlayersBuilder() {
    const filters: Record<string, unknown> = {};
    let mode: 'select' | 'insert' | 'update' | 'delete' = 'select';
    let pendingPatch: Partial<RoomPlayerRow> = {};
    let pendingInsert: RoomPlayerRow | null = null;

    const builder = {
      select: () => builder,
      eq: (col: string, val: unknown) => {
        filters[col] = val;
        return builder;
      },
      maybeSingle: async () => {
        const matches = players.filter((p) =>
          rowMatches(p as unknown as Record<string, unknown>, filters),
        );
        return { data: matches[0] ?? null, error: null };
      },
      single: async () => {
        if (mode === 'insert') return { data: pendingInsert, error: null };
        const matches = players.filter((p) =>
          rowMatches(p as unknown as Record<string, unknown>, filters),
        );
        return { data: matches[0] ?? null, error: null };
      },
      insert: (row: Partial<RoomPlayerRow>) => {
        mode = 'insert';
        const existing = players.find(
          (p) => p.room_code === row.room_code && p.player_id === row.player_id,
        );
        if (existing) {
          const errBuilder = {
            select: () => errBuilder,
            single: async () => ({ data: null, error: { code: '23505', message: 'duplicate' } }),
          };
          return errBuilder;
        }
        const full: RoomPlayerRow = {
          room_code: row.room_code as string,
          player_id: row.player_id as string,
          is_kicked: row.is_kicked ?? false,
          joined_at: nowIso(),
        };
        players.push(full);
        pendingInsert = full;
        return builder;
      },
      update: (patch: Partial<RoomPlayerRow>) => {
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
          for (const p of players) {
            if (rowMatches(p as unknown as Record<string, unknown>, filters)) {
              Object.assign(p, pendingPatch);
            }
          }
          return resolve({ data: null, error: null });
        }
        if (mode === 'delete') {
          for (let i = players.length - 1; i >= 0; i--) {
            if (rowMatches(players[i] as unknown as Record<string, unknown>, filters)) {
              players.splice(i, 1);
            }
          }
          return resolve({ data: null, error: null });
        }
        const matches = players.filter((p) =>
          rowMatches(p as unknown as Record<string, unknown>, filters),
        );
        resolve({ data: matches, error: null });
      },
    };
    return builder;
  }

  const from = (table: string) => {
    if (table === 'room_metadata') return roomMetaBuilder();
    if (table === 'room_players') return roomPlayersBuilder();
    throw new Error(`unexpected table: ${table}`);
  };

  return {
    db: { from } as never,
    rooms,
    players,
    setNow: (iso: string) => {
      nowIso = () => iso;
    },
  };
}

// Deterministic rng-factory: per-call returns a unique fraction so codes
// generated for distinct players don't collide. The room-code alphabet has
// 31 chars so 6-digit codes from incrementing fractions stay distinct for
// well past any test fixture size.
function makeIncRng(seed: number): () => number {
  let n = seed;
  return () => {
    n += 0.0137;
    return n - Math.floor(n);
  };
}

describe('assignOrCreate', () => {
  it('creates a new random room when none exist and adds the player', async () => {
    const { db, rooms, players } = makeFakeDb();
    const result = await assignOrCreate(db, { playerId: 'p1', rng: makeIncRng(0.1) });
    expect(result.created).toBe(true);
    expect(result.room.mode).toBe('random');
    expect(result.room.status).toBe('lobby');
    expect(result.room.max_players).toBe(8);
    expect(result.room.round_count).toBe(8);
    expect(result.room.timer_seconds).toBe(30);
    expect(rooms.size).toBe(1);
    expect(
      players.find((p) => p.player_id === 'p1' && p.room_code === result.room.code),
    ).toBeDefined();
  });

  it('joins the existing oldest random+lobby room with capacity', async () => {
    const { db, players } = makeFakeDb();
    const a = await assignOrCreate(db, { playerId: 'p1', rng: makeIncRng(0.2) });
    const b = await assignOrCreate(db, { playerId: 'p2', rng: makeIncRng(0.3) });
    expect(b.created).toBe(false);
    expect(b.room.code).toBe(a.room.code);
    expect(players.filter((p) => p.room_code === a.room.code)).toHaveLength(2);
  });

  it('skips full rooms and falls back to creating a fresh one', async () => {
    const { db, rooms } = makeFakeDb();
    // Create an 8-player room manually.
    const first = await assignOrCreate(db, { playerId: 'p0', rng: makeIncRng(0.4) });
    for (let i = 1; i < 8; i++) {
      await assignOrCreate(db, { playerId: `p${i}`, rng: makeIncRng(0.4 + i * 0.01) });
    }
    expect(rooms.size).toBe(1);
    const overflow = await assignOrCreate(db, { playerId: 'p8', rng: makeIncRng(0.99) });
    expect(overflow.created).toBe(true);
    expect(overflow.room.code).not.toBe(first.room.code);
    expect(rooms.size).toBe(2);
  });

  it('skips locked rooms', async () => {
    const { db, rooms } = makeFakeDb();
    const a = await assignOrCreate(db, { playerId: 'p1', rng: makeIncRng(0.5) });
    // Lock the original room.
    const original = rooms.get(a.room.code);
    if (original) original.locked = true;
    const b = await assignOrCreate(db, { playerId: 'p2', rng: makeIncRng(0.6) });
    expect(b.room.code).not.toBe(a.room.code);
    expect(b.created).toBe(true);
  });

  it('is idempotent for repeat calls from the same player', async () => {
    const { db, players } = makeFakeDb();
    const a = await assignOrCreate(db, { playerId: 'p1', rng: makeIncRng(0.7) });
    const b = await assignOrCreate(db, { playerId: 'p1', rng: makeIncRng(0.7) });
    expect(b.room.code).toBe(a.room.code);
    expect(b.created).toBe(false);
    expect(players.filter((p) => p.player_id === 'p1')).toHaveLength(1);
  });

  it('places concurrent joiners into a valid random+lobby room each', async () => {
    const { db, rooms, players } = makeFakeDb();
    const ids = ['a', 'b', 'c', 'd'];
    const results = await Promise.all(
      ids.map((id, i) => assignOrCreate(db, { playerId: id, rng: makeIncRng(0.1 + i * 0.07) })),
    );
    for (const r of results) {
      expect(r.room.mode).toBe('random');
      expect(r.room.status).toBe('lobby');
    }
    // Each player has exactly one membership row.
    for (const id of ids) {
      expect(players.filter((p) => p.player_id === id)).toHaveLength(1);
    }
    // Every room created during this run holds at least one of our players.
    for (const room of rooms.values()) {
      const inRoom = players.filter((p) => p.room_code === room.code);
      expect(inRoom.length).toBeGreaterThan(0);
    }
  });

  it('skips rooms whose status has advanced past `lobby`', async () => {
    const { db, rooms } = makeFakeDb();
    const a = await assignOrCreate(db, { playerId: 'p1', rng: makeIncRng(0.8) });
    const r = rooms.get(a.room.code);
    if (r) r.status = 'live';
    const b = await assignOrCreate(db, { playerId: 'p2', rng: makeIncRng(0.85) });
    expect(b.room.code).not.toBe(a.room.code);
    expect(b.created).toBe(true);
  });
});

describe('processExpiredRandomRooms', () => {
  function seedExpiredRoom(
    fake: ReturnType<typeof makeFakeDb>,
    code: string,
    createdAtIso: string,
    playerIds: string[],
  ) {
    fake.rooms.set(code, {
      code,
      host_id: null,
      mode: 'random',
      max_players: 8,
      round_count: 8,
      timer_seconds: 30,
      status: 'lobby',
      locked: false,
      created_at: createdAtIso,
      started_at: null,
      ended_at: null,
    });
    for (const id of playerIds) {
      fake.players.push({
        room_code: code,
        player_id: id,
        is_kicked: false,
        joined_at: createdAtIso,
      });
    }
  }

  it('starts a room with at least 3 active players when 90s have passed', async () => {
    const fake = makeFakeDb();
    const created = '2026-05-08T12:00:00.000Z';
    seedExpiredRoom(fake, 'ROOM01', created, ['p1', 'p2', 'p3']);
    const now = new Date(Date.parse(created) + RANDOM_QUEUE_TIMEOUT_MS + 1000);

    const result = await processExpiredRandomRooms(fake.db, { now: () => now });

    expect(result.started).toEqual(['ROOM01']);
    expect(result.cancelled).toEqual([]);
    const room = fake.rooms.get('ROOM01');
    expect(room?.status).toBe('live');
    expect(room?.started_at).toBe(now.toISOString());
  });

  it('cancels rooms with fewer than 3 active players and re-queues them', async () => {
    const fake = makeFakeDb();
    const created = '2026-05-08T12:00:00.000Z';
    seedExpiredRoom(fake, 'ROOM01', created, ['p1', 'p2']);
    // A second expired room with 1 player so the re-queue can converge.
    seedExpiredRoom(fake, 'ROOM02', created, ['p3']);
    const now = new Date(Date.parse(created) + RANDOM_QUEUE_TIMEOUT_MS + 5000);
    fake.setNow(now.toISOString());

    const result = await processExpiredRandomRooms(fake.db, {
      now: () => now,
      rng: makeIncRng(0.42),
    });

    expect(result.started).toEqual([]);
    expect(result.cancelled).toHaveLength(2);
    expect(result.cancelled.flatMap((c) => c.reQueuedPlayers).sort()).toEqual(['p1', 'p2', 'p3']);
    // Both expired rooms are gone (cascade removes their player rows).
    expect(fake.rooms.has('ROOM01')).toBe(false);
    expect(fake.rooms.has('ROOM02')).toBe(false);
    // Each player landed in some random+lobby room (re-queue worked).
    for (const id of ['p1', 'p2', 'p3']) {
      const memberships = fake.players.filter((p) => p.player_id === id);
      expect(memberships).toHaveLength(1);
      const room = fake.rooms.get(memberships[0].room_code);
      expect(room?.mode).toBe('random');
      expect(room?.status).toBe('lobby');
    }
  });

  it('leaves rooms younger than the timeout untouched', async () => {
    const fake = makeFakeDb();
    const created = '2026-05-08T12:00:00.000Z';
    seedExpiredRoom(fake, 'ROOMNEW', created, ['p1', 'p2', 'p3', 'p4']);
    // 5s after creation — well within the 90s window.
    const now = new Date(Date.parse(created) + 5_000);

    const result = await processExpiredRandomRooms(fake.db, { now: () => now });

    expect(result.started).toEqual([]);
    expect(result.cancelled).toEqual([]);
    expect(fake.rooms.get('ROOMNEW')?.status).toBe('lobby');
  });

  it('does not count kicked players toward the start threshold', async () => {
    const fake = makeFakeDb();
    const created = '2026-05-08T12:00:00.000Z';
    seedExpiredRoom(fake, 'ROOMKICK', created, ['p1', 'p2', 'p3']);
    // Kick one — only 2 active remain, below the threshold.
    const kicked = fake.players.find((p) => p.player_id === 'p3' && p.room_code === 'ROOMKICK');
    if (kicked) kicked.is_kicked = true;
    const now = new Date(Date.parse(created) + RANDOM_QUEUE_TIMEOUT_MS + 1000);
    fake.setNow(now.toISOString());

    const result = await processExpiredRandomRooms(fake.db, {
      now: () => now,
      rng: makeIncRng(0.55),
    });

    expect(result.started).toEqual([]);
    expect(result.cancelled).toHaveLength(1);
    expect(result.cancelled[0].reQueuedPlayers.sort()).toEqual(['p1', 'p2']);
    expect(fake.rooms.has('ROOMKICK')).toBe(false);
  });

  it('exposes the constants used to wire UI countdowns', () => {
    expect(RANDOM_QUEUE_TIMEOUT_MS).toBe(90_000);
    expect(RANDOM_MIN_PLAYERS_TO_START).toBe(3);
  });
});
