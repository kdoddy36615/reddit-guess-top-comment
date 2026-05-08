// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import {
  advanceRoomSession,
  advanceSession,
  findOrCreateDailySession,
  findOrCreateRoomSession,
  getOrCreateActiveSoloSession,
  getPlayerDailyProgress,
  isRoundInSession,
} from './sessions';

type FakeDbOpts = {
  played?: { round_index: number; round_id: string }[];
  eligible?: { id: string }[];
  currentRoundId?: string | null;
};

function fakeDb(opts: FakeDbOpts) {
  const inserts: { table: string; row: unknown }[] = [];
  const updates: { table: string; row: unknown; eqArgs: unknown[] }[] = [];
  const notCalls: { table: string; args: unknown[] }[] = [];

  function thenable<T>(rows: T[], table: string) {
    const builder = {
      select: () => builder,
      eq: () => builder,
      not: (...args: unknown[]) => {
        notCalls.push({ table, args });
        return builder;
      },
      order: () => builder,
      limit: () => builder,
      // biome-ignore lint/suspicious/noThenProperty: mocking Supabase's PostgrestBuilder which is intentionally thenable
      then: (resolve: (v: { data: T[]; error: null }) => void) =>
        resolve({ data: rows, error: null }),
    } as Record<string, unknown>;
    return builder;
  }

  const from = (table: string) => {
    if (table === 'session_rounds') {
      const t = thenable(opts.played ?? [], table);
      t.insert = (row: unknown) => {
        inserts.push({ table, row });
        return {
          // biome-ignore lint/suspicious/noThenProperty: mocking Supabase's PostgrestBuilder which is intentionally thenable
          then: (resolve: (v: { data: null; error: null }) => void) =>
            resolve({ data: null, error: null }),
        };
      };
      return t;
    }
    if (table === 'rounds') {
      return thenable(opts.eligible ?? [], table);
    }
    if (table === 'game_sessions') {
      const t = thenable(
        opts.currentRoundId !== undefined
          ? [{ current_round_id: opts.currentRoundId }]
          : ([] as unknown[]),
        table,
      );
      // Reads use .maybeSingle() rather than the array thenable.
      t.maybeSingle = async () => ({
        data: opts.currentRoundId !== undefined ? { current_round_id: opts.currentRoundId } : null,
        error: null,
      });
      t.update = (row: unknown) => {
        const u = { table, row, eqArgs: [] as unknown[] };
        updates.push(u);
        return {
          eq: (col: string, val: unknown) => {
            u.eqArgs = [col, val];
            return {
              // biome-ignore lint/suspicious/noThenProperty: mocking Supabase's PostgrestBuilder which is intentionally thenable
              then: (resolve: (v: { data: null; error: null }) => void) =>
                resolve({ data: null, error: null }),
            };
          },
        };
      };
      return t;
    }
    throw new Error(`unexpected table: ${table}`);
  };

  return { db: { from } as never, inserts, updates, notCalls };
}

describe('advanceSession', () => {
  it('appends session_rounds at next round_index and updates the session pointer', async () => {
    const { db, inserts, updates } = fakeDb({
      played: [
        { round_index: 0, round_id: 'r1' },
        { round_index: 1, round_id: 'r2' },
      ],
      eligible: [{ id: 'r3' }, { id: 'r4' }],
    });

    const result = await advanceSession(db, { sessionId: 'sess-1', rng: () => 0 });

    expect(result).toEqual({ roundId: 'r3', roundIndex: 2 });
    expect(inserts).toEqual([
      {
        table: 'session_rounds',
        row: { session_id: 'sess-1', round_index: 2, round_id: 'r3' },
      },
    ]);
    expect(updates).toEqual([
      {
        table: 'game_sessions',
        row: { current_round_id: 'r3', current_round_state: 'guessing' },
        eqArgs: ['id', 'sess-1'],
      },
    ]);
  });

  it('starts a brand-new session at round_index 0', async () => {
    const { db, inserts } = fakeDb({
      played: [],
      eligible: [{ id: 'r1' }, { id: 'r2' }],
    });

    const result = await advanceSession(db, { sessionId: 'sess-new', rng: () => 0 });

    expect(result).toEqual({ roundId: 'r1', roundIndex: 0 });
    expect(inserts[0]?.row).toEqual({
      session_id: 'sess-new',
      round_index: 0,
      round_id: 'r1',
    });
  });

  it('excludes already-played round ids from the eligible query', async () => {
    const { db, notCalls } = fakeDb({
      played: [
        { round_index: 0, round_id: 'r1' },
        { round_index: 1, round_id: 'r2' },
      ],
      eligible: [{ id: 'r3' }],
    });

    await advanceSession(db, { sessionId: 'sess-x', rng: () => 0 });

    const exclusion = notCalls.find((c) => c.table === 'rounds');
    expect(exclusion).toBeDefined();
    expect(exclusion?.args[0]).toBe('id');
    expect(exclusion?.args[1]).toBe('in');
    expect(exclusion?.args[2]).toContain('r1');
    expect(exclusion?.args[2]).toContain('r2');
  });

  it("also excludes the session's own current_round_id", async () => {
    const { db, notCalls } = fakeDb({
      played: [],
      eligible: [{ id: 'rB' }],
      currentRoundId: 'rA',
    });

    await advanceSession(db, { sessionId: 'sess-cur', rng: () => 0 });

    const exclusion = notCalls.find((c) => c.table === 'rounds');
    expect(exclusion).toBeDefined();
    expect(exclusion?.args[2]).toContain('rA');
  });

  it('does not apply an exclusion filter for a brand-new session', async () => {
    const { db, notCalls } = fakeDb({
      played: [],
      eligible: [{ id: 'r1' }],
    });

    await advanceSession(db, { sessionId: 'sess-fresh', rng: () => 0 });

    expect(notCalls.filter((c) => c.table === 'rounds')).toEqual([]);
  });

  it('returns null when no eligible candidates remain', async () => {
    const { db, inserts, updates } = fakeDb({
      played: [{ round_index: 0, round_id: 'r1' }],
      eligible: [],
    });

    const result = await advanceSession(db, { sessionId: 'sess-empty', rng: () => 0 });

    expect(result).toBeNull();
    expect(inserts).toEqual([]);
    expect(updates).toEqual([]);
  });
});

function fakeSessionLookupDb(opts: { existingId: string | null; newId?: string }) {
  const inserts: unknown[] = [];

  const lookupBuilder = {
    select: () => lookupBuilder,
    eq: () => lookupBuilder,
    order: () => lookupBuilder,
    limit: () => lookupBuilder,
    maybeSingle: async () => ({
      data: opts.existingId ? { id: opts.existingId } : null,
      error: null,
    }),
    insert: (row: unknown) => {
      inserts.push(row);
      return {
        select: () => ({
          single: async () => ({
            data: { id: opts.newId ?? 'created-id' },
            error: null,
          }),
        }),
      };
    },
  };

  return {
    db: { from: vi.fn(() => lookupBuilder) } as never,
    inserts,
  };
}

type DailyFakeOpts = {
  existing?: { id: string } | null;
  eligibleRounds?: { id: string }[];
  insertConflict?: boolean;
  // Insert chain returns this id when no conflict.
  newSessionId?: string;
};

function fakeDailyDb(opts: DailyFakeOpts) {
  const inserts: { table: string; row: unknown }[] = [];
  let sessionLookups = 0;

  function gameSessionsBuilder() {
    const reads = {
      select: () => reads,
      eq: () => reads,
      maybeSingle: async () => {
        sessionLookups++;
        return { data: opts.existing ?? null, error: null };
      },
      insert: (row: unknown) => {
        inserts.push({ table: 'game_sessions', row });
        return {
          select: () => ({
            single: async () => {
              if (opts.insertConflict) {
                return {
                  data: null,
                  error: { code: '23505', message: 'duplicate key' } as unknown,
                };
              }
              return { data: { id: opts.newSessionId ?? 'daily-sess' }, error: null };
            },
          }),
        };
      },
    };
    return reads;
  }

  function roundsBuilder() {
    const builder = {
      select: () => builder,
      eq: () => builder,
      // biome-ignore lint/suspicious/noThenProperty: mocking PostgrestBuilder
      then: (resolve: (v: { data: { id: string }[]; error: null }) => void) =>
        resolve({ data: opts.eligibleRounds ?? [], error: null }),
    };
    return builder;
  }

  function sessionRoundsBuilder() {
    const builder = {
      insert: (rows: unknown) => {
        inserts.push({ table: 'session_rounds', row: rows });
        return {
          // biome-ignore lint/suspicious/noThenProperty: mocking PostgrestBuilder
          then: (resolve: (v: { data: null; error: null }) => void) =>
            resolve({ data: null, error: null }),
        };
      },
    };
    return builder;
  }

  const from = (table: string) => {
    if (table === 'game_sessions') return gameSessionsBuilder();
    if (table === 'rounds') return roundsBuilder();
    if (table === 'session_rounds') return sessionRoundsBuilder();
    throw new Error(`unexpected table: ${table}`);
  };

  return { db: { from } as never, inserts, getLookups: () => sessionLookups };
}

describe('findOrCreateDailySession', () => {
  it('returns the existing session when one is found for the date', async () => {
    const { db, inserts } = fakeDailyDb({ existing: { id: 'daily-existing' } });
    const result = await findOrCreateDailySession(db, {
      date: new Date('2026-05-07T03:21:00Z'),
    });
    expect(result.id).toBe('daily-existing');
    expect(result.roomId).toBe('daily-2026-05-07');
    expect(inserts).toEqual([]);
  });

  it('creates the session and pre-fills 5 session_rounds when none exists', async () => {
    const eligible = Array.from({ length: 14 }, (_, i) => ({
      id: `r${i.toString().padStart(2, '0')}`,
    }));
    const { db, inserts } = fakeDailyDb({
      existing: null,
      eligibleRounds: eligible,
      newSessionId: 'daily-new',
    });

    const result = await findOrCreateDailySession(db, {
      date: new Date('2026-05-07T03:21:00Z'),
    });

    expect(result.id).toBe('daily-new');
    expect(result.roomId).toBe('daily-2026-05-07');

    const sessionInsert = inserts.find((i) => i.table === 'game_sessions');
    expect(sessionInsert?.row).toMatchObject({
      mode: 'daily',
      room_id: 'daily-2026-05-07',
      current_round_state: 'guessing',
    });

    const sessionRoundsInsert = inserts.find((i) => i.table === 'session_rounds');
    expect(sessionRoundsInsert).toBeDefined();
    const rows = sessionRoundsInsert?.row as Array<{
      session_id: string;
      round_index: number;
      round_id: string;
    }>;
    expect(rows).toHaveLength(5);
    expect(rows.map((r) => r.round_index)).toEqual([0, 1, 2, 3, 4]);
    for (const row of rows) {
      expect(row.session_id).toBe('daily-new');
      expect(eligible.map((e) => e.id)).toContain(row.round_id);
    }
    expect(new Set(rows.map((r) => r.round_id)).size).toBe(5);

    // current_round_id should match the first session_rounds row.
    const sessionRow = sessionInsert?.row as { current_round_id: string };
    expect(sessionRow.current_round_id).toBe(rows[0].round_id);
  });

  it('throws when fewer than 5 eligible rounds are available', async () => {
    const { db } = fakeDailyDb({
      existing: null,
      eligibleRounds: [{ id: 'r1' }, { id: 'r2' }, { id: 'r3' }],
    });
    await expect(
      findOrCreateDailySession(db, { date: new Date('2026-05-07T03:21:00Z') }),
    ).rejects.toThrow();
  });

  it('on UNIQUE-violation race, re-selects and returns the winner session', async () => {
    // Race scenario: first lookup finds nothing, but by the time we INSERT,
    // a concurrent process has already created the daily row, so the INSERT
    // fails with code 23505. We must re-SELECT and return that winner.
    const inserts: { table: string; row: unknown }[] = [];
    let lookupCount = 0;

    function builder() {
      const reads = {
        select: () => reads,
        eq: () => reads,
        maybeSingle: async () => {
          lookupCount++;
          // First lookup: nothing. Second lookup (post-conflict): the winner.
          return lookupCount === 1
            ? { data: null, error: null }
            : { data: { id: 'winner-sess' }, error: null };
        },
        insert: (row: unknown) => {
          inserts.push({ table: 'game_sessions', row });
          return {
            select: () => ({
              single: async () => ({
                data: null,
                error: { code: '23505', message: 'duplicate key' } as unknown,
              }),
            }),
          };
        },
      };
      return reads;
    }

    const eligible = Array.from({ length: 14 }, (_, i) => ({
      id: `r${i.toString().padStart(2, '0')}`,
    }));

    const from = (table: string) => {
      if (table === 'game_sessions') return builder();
      if (table === 'rounds') {
        const b = {
          select: () => b,
          eq: () => b,
          // biome-ignore lint/suspicious/noThenProperty: mocking PostgrestBuilder
          then: (resolve: (v: { data: { id: string }[]; error: null }) => void) =>
            resolve({ data: eligible, error: null }),
        };
        return b;
      }
      if (table === 'session_rounds') {
        return {
          insert: (row: unknown) => {
            inserts.push({ table: 'session_rounds', row });
            return {
              // biome-ignore lint/suspicious/noThenProperty: mocking PostgrestBuilder
              then: (resolve: (v: { data: null; error: null }) => void) =>
                resolve({ data: null, error: null }),
            };
          },
        };
      }
      throw new Error(`unexpected table: ${table}`);
    };

    const result = await findOrCreateDailySession({ from } as never, {
      date: new Date('2026-05-07T03:21:00Z'),
    });

    expect(result.id).toBe('winner-sess');
    // We should NOT have inserted any session_rounds because the session
    // we returned belongs to the winner (they own that responsibility).
    expect(inserts.find((i) => i.table === 'session_rounds')).toBeUndefined();
  });

  it('produces the same 5 rounds in the same order for the same date', async () => {
    const eligible = Array.from({ length: 14 }, (_, i) => ({
      id: `r${i.toString().padStart(2, '0')}`,
    }));

    const a = fakeDailyDb({ existing: null, eligibleRounds: eligible, newSessionId: 's1' });
    await findOrCreateDailySession(a.db, { date: new Date('2026-05-07T03:21:00Z') });

    // Different newSessionId is fine — we're testing round-pick determinism, not session-id.
    const b = fakeDailyDb({ existing: null, eligibleRounds: eligible, newSessionId: 's2' });
    await findOrCreateDailySession(b.db, { date: new Date('2026-05-07T03:21:00Z') });

    const aRounds = a.inserts.find((i) => i.table === 'session_rounds')?.row as Array<{
      round_id: string;
    }>;
    const bRounds = b.inserts.find((i) => i.table === 'session_rounds')?.row as Array<{
      round_id: string;
    }>;
    expect(aRounds.map((r) => r.round_id)).toEqual(bRounds.map((r) => r.round_id));
  });
});

function fakeProgressDb(opts: {
  sessionRounds: { round_index: number; round_id: string }[];
  guesses: { round_id: string; score: number }[];
}) {
  const from = (table: string) => {
    if (table === 'session_rounds') {
      const b = {
        select: () => b,
        eq: () => b,
        order: () => b,
        // biome-ignore lint/suspicious/noThenProperty: mocking PostgrestBuilder
        then: (resolve: (v: { data: unknown[]; error: null }) => void) =>
          resolve({
            data: [...opts.sessionRounds].sort((a, b) => a.round_index - b.round_index),
            error: null,
          }),
      };
      return b;
    }
    if (table === 'guesses') {
      const b = {
        select: () => b,
        eq: () => b,
        // biome-ignore lint/suspicious/noThenProperty: mocking PostgrestBuilder
        then: (resolve: (v: { data: unknown[]; error: null }) => void) =>
          resolve({ data: opts.guesses, error: null }),
      };
      return b;
    }
    throw new Error(`unexpected table: ${table}`);
  };
  return { db: { from } as never };
}

describe('getPlayerDailyProgress', () => {
  const sessionRounds = [
    { round_index: 0, round_id: 'rA' },
    { round_index: 1, round_id: 'rB' },
    { round_index: 2, round_id: 'rC' },
    { round_index: 3, round_id: 'rD' },
    { round_index: 4, round_id: 'rE' },
  ];

  it('returns the first round when the player has no guesses yet', async () => {
    const { db } = fakeProgressDb({ sessionRounds, guesses: [] });
    const progress = await getPlayerDailyProgress(db, {
      sessionId: 'sess-1',
      playerId: 'player-1',
    });
    expect(progress.totalRounds).toBe(5);
    expect(progress.guessedCount).toBe(0);
    expect(progress.currentRoundId).toBe('rA');
    expect(progress.isComplete).toBe(false);
    expect(progress.totalScore).toBe(0);
  });

  it('returns the next un-guessed round when partially through', async () => {
    const { db } = fakeProgressDb({
      sessionRounds,
      guesses: [
        { round_id: 'rA', score: 80 },
        { round_id: 'rB', score: 40 },
      ],
    });
    const progress = await getPlayerDailyProgress(db, {
      sessionId: 'sess-1',
      playerId: 'player-1',
    });
    expect(progress.guessedCount).toBe(2);
    expect(progress.currentRoundId).toBe('rC');
    expect(progress.isComplete).toBe(false);
    expect(progress.totalScore).toBe(120);
  });

  it('reports complete when the player has guessed all rounds', async () => {
    const { db } = fakeProgressDb({
      sessionRounds,
      guesses: sessionRounds.map((r, i) => ({ round_id: r.round_id, score: 50 + i })),
    });
    const progress = await getPlayerDailyProgress(db, {
      sessionId: 'sess-1',
      playerId: 'player-1',
    });
    expect(progress.guessedCount).toBe(5);
    expect(progress.currentRoundId).toBeNull();
    expect(progress.isComplete).toBe(true);
    expect(progress.totalScore).toBe(50 + 51 + 52 + 53 + 54);
  });

  it('handles guesses arriving out of order — order is by session_rounds.round_index', async () => {
    const { db } = fakeProgressDb({
      sessionRounds,
      guesses: [
        { round_id: 'rB', score: 30 },
        { round_id: 'rA', score: 60 },
      ],
    });
    const progress = await getPlayerDailyProgress(db, {
      sessionId: 'sess-1',
      playerId: 'player-1',
    });
    expect(progress.currentRoundId).toBe('rC');
    expect(progress.guessedCount).toBe(2);
  });
});

type RoomFakeOpts = {
  existing?: {
    id: string;
    current_round_id: string | null;
    current_round_state: string;
    current_round_started_at: string | null;
    current_round_revealed_at: string | null;
  } | null;
  eligibleRounds?: { id: string }[];
  newSessionId?: string;
  insertConflict?: boolean;
};

function fakeRoomDb(opts: RoomFakeOpts) {
  const inserts: { table: string; row: unknown }[] = [];

  function gameSessionsBuilder() {
    const reads = {
      select: () => reads,
      eq: () => reads,
      maybeSingle: async () => ({ data: opts.existing ?? null, error: null }),
      insert: (row: unknown) => {
        inserts.push({ table: 'game_sessions', row });
        return {
          select: () => ({
            single: async () => {
              if (opts.insertConflict) {
                return {
                  data: null,
                  error: { code: '23505', message: 'duplicate key' } as unknown,
                };
              }
              return {
                data: {
                  id: opts.newSessionId ?? 'room-sess',
                  current_round_id: (row as { current_round_id: string }).current_round_id,
                  current_round_state: 'guessing',
                  current_round_started_at: (row as { current_round_started_at: string })
                    .current_round_started_at,
                  current_round_revealed_at: null,
                },
                error: null,
              };
            },
          }),
        };
      },
    };
    return reads;
  }

  function roundsBuilder() {
    const builder = {
      select: () => builder,
      eq: () => builder,
      // biome-ignore lint/suspicious/noThenProperty: mocking PostgrestBuilder
      then: (resolve: (v: { data: { id: string }[]; error: null }) => void) =>
        resolve({ data: opts.eligibleRounds ?? [], error: null }),
    };
    return builder;
  }

  function sessionRoundsBuilder() {
    const builder = {
      insert: (rows: unknown) => {
        inserts.push({ table: 'session_rounds', row: rows });
        return {
          // biome-ignore lint/suspicious/noThenProperty: mocking PostgrestBuilder
          then: (resolve: (v: { data: null; error: null }) => void) =>
            resolve({ data: null, error: null }),
        };
      },
    };
    return builder;
  }

  const from = (table: string) => {
    if (table === 'game_sessions') return gameSessionsBuilder();
    if (table === 'rounds') return roundsBuilder();
    if (table === 'session_rounds') return sessionRoundsBuilder();
    throw new Error(`unexpected table: ${table}`);
  };

  return { db: { from } as never, inserts };
}

describe('findOrCreateRoomSession', () => {
  it('returns the existing session for the room when one exists', async () => {
    const { db, inserts } = fakeRoomDb({
      existing: {
        id: 'room-existing',
        current_round_id: 'r1',
        current_round_state: 'guessing',
        current_round_started_at: '2026-05-08T12:00:00Z',
        current_round_revealed_at: null,
      },
    });
    const result = await findOrCreateRoomSession(db, {
      code: 'ABC123',
      roundCount: 8,
    });
    expect(result.id).toBe('room-existing');
    expect(result.currentRoundId).toBe('r1');
    expect(result.currentRoundState).toBe('guessing');
    expect(inserts).toEqual([]);
  });

  it('creates a session, picks N rounds, and writes session_rounds rows', async () => {
    const eligible = Array.from({ length: 12 }, (_, i) => ({
      id: `r${i.toString().padStart(2, '0')}`,
    }));
    const { db, inserts } = fakeRoomDb({
      existing: null,
      eligibleRounds: eligible,
      newSessionId: 'room-new',
    });

    const result = await findOrCreateRoomSession(db, {
      code: 'ABC123',
      roundCount: 8,
      rng: () => 0,
    });

    expect(result.id).toBe('room-new');
    expect(result.currentRoundState).toBe('guessing');
    expect(result.currentRoundStartedAt).toBeTruthy();

    const sessionInsert = inserts.find((i) => i.table === 'game_sessions');
    expect(sessionInsert?.row).toMatchObject({
      mode: 'room',
      room_id: 'ABC123',
      current_round_state: 'guessing',
    });

    const sessionRoundsInsert = inserts.find((i) => i.table === 'session_rounds');
    const rows = sessionRoundsInsert?.row as Array<{
      session_id: string;
      round_index: number;
      round_id: string;
    }>;
    expect(rows).toHaveLength(8);
    expect(rows.map((r) => r.round_index)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(new Set(rows.map((r) => r.round_id)).size).toBe(8);

    const sessionRow = sessionInsert?.row as { current_round_id: string };
    expect(sessionRow.current_round_id).toBe(rows[0].round_id);
  });

  it('throws when fewer eligible rounds than requested are available', async () => {
    const { db } = fakeRoomDb({
      existing: null,
      eligibleRounds: [{ id: 'r1' }, { id: 'r2' }, { id: 'r3' }],
    });
    await expect(
      findOrCreateRoomSession(db, { code: 'ABC123', roundCount: 8, rng: () => 0 }),
    ).rejects.toThrow();
  });
});

describe('advanceRoomSession', () => {
  it('moves the pointer to the next session_rounds row and resets timing', async () => {
    const sessionRows = [
      { round_index: 0, round_id: 'rA' },
      { round_index: 1, round_id: 'rB' },
      { round_index: 2, round_id: 'rC' },
    ];
    let updateRow: Record<string, unknown> | null = null;
    const from = (table: string) => {
      if (table === 'session_rounds') {
        const b = {
          select: () => b,
          eq: () => b,
          order: () => b,
          // biome-ignore lint/suspicious/noThenProperty: mocking PostgrestBuilder
          then: (resolve: (v: { data: unknown[]; error: null }) => void) =>
            resolve({ data: sessionRows, error: null }),
        };
        return b;
      }
      if (table === 'game_sessions') {
        const b = {
          select: () => b,
          eq: () => b,
          maybeSingle: async () => ({
            data: { current_round_id: 'rA' },
            error: null,
          }),
          update: (row: Record<string, unknown>) => {
            updateRow = row;
            return {
              eq: () => ({
                // biome-ignore lint/suspicious/noThenProperty: mocking PostgrestBuilder
                then: (resolve: (v: { data: null; error: null }) => void) =>
                  resolve({ data: null, error: null }),
              }),
            };
          },
        };
        return b;
      }
      throw new Error(`unexpected table: ${table}`);
    };

    const result = await advanceRoomSession({ from } as never, { sessionId: 'sess-1' });

    expect(result?.roundId).toBe('rB');
    expect(result?.roundIndex).toBe(1);
    expect(updateRow).toMatchObject({
      current_round_id: 'rB',
      current_round_state: 'guessing',
      current_round_revealed_at: null,
    });
    expect(
      typeof (updateRow as unknown as { current_round_started_at: string })
        .current_round_started_at,
    ).toBe('string');
  });

  it('returns null and marks session_complete when no next round exists', async () => {
    const sessionRows = [
      { round_index: 0, round_id: 'rA' },
      { round_index: 1, round_id: 'rB' },
    ];
    let updateRow: Record<string, unknown> | null = null;
    const from = (table: string) => {
      if (table === 'session_rounds') {
        const b = {
          select: () => b,
          eq: () => b,
          order: () => b,
          // biome-ignore lint/suspicious/noThenProperty: mocking PostgrestBuilder
          then: (resolve: (v: { data: unknown[]; error: null }) => void) =>
            resolve({ data: sessionRows, error: null }),
        };
        return b;
      }
      if (table === 'game_sessions') {
        const b = {
          select: () => b,
          eq: () => b,
          maybeSingle: async () => ({
            data: { current_round_id: 'rB' },
            error: null,
          }),
          update: (row: Record<string, unknown>) => {
            updateRow = row;
            return {
              eq: () => ({
                // biome-ignore lint/suspicious/noThenProperty: mocking PostgrestBuilder
                then: (resolve: (v: { data: null; error: null }) => void) =>
                  resolve({ data: null, error: null }),
              }),
            };
          },
        };
        return b;
      }
      throw new Error(`unexpected table: ${table}`);
    };

    const result = await advanceRoomSession({ from } as never, { sessionId: 'sess-1' });

    expect(result).toBeNull();
    expect(updateRow).toMatchObject({ current_round_state: 'session_complete' });
  });
});

describe('isRoundInSession', () => {
  function fakeMembershipDb(found: boolean) {
    const from = (table: string) => {
      if (table !== 'session_rounds') throw new Error(`unexpected table: ${table}`);
      const b = {
        select: () => b,
        eq: () => b,
        maybeSingle: async () => ({
          data: found ? { round_id: 'rX' } : null,
          error: null,
        }),
      };
      return b;
    };
    return { db: { from } as never };
  }

  it('returns true when (sessionId, roundId) appears in session_rounds', async () => {
    const { db } = fakeMembershipDb(true);
    expect(await isRoundInSession(db, { sessionId: 's1', roundId: 'rX' })).toBe(true);
  });

  it('returns false when not found', async () => {
    const { db } = fakeMembershipDb(false);
    expect(await isRoundInSession(db, { sessionId: 's1', roundId: 'rZ' })).toBe(false);
  });
});

describe('getOrCreateActiveSoloSession', () => {
  it('returns the existing session id when one is found', async () => {
    const { db, inserts } = fakeSessionLookupDb({ existingId: 'existing-sess' });

    const id = await getOrCreateActiveSoloSession(db, 'player-1');

    expect(id).toBe('existing-sess');
    expect(inserts).toEqual([]);
  });

  it('creates and returns a new session when none exists', async () => {
    const { db, inserts } = fakeSessionLookupDb({ existingId: null, newId: 'fresh-sess' });

    const id = await getOrCreateActiveSoloSession(db, 'player-2');

    expect(id).toBe('fresh-sess');
    expect(inserts).toEqual([
      {
        mode: 'solo',
        creator_player_id: 'player-2',
        current_round_state: 'guessing',
      },
    ]);
  });
});
