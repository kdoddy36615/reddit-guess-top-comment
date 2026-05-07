// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { advanceSession, getOrCreateActiveSoloSession } from './sessions';

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
