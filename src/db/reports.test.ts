// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { REPORT_THRESHOLD, reportRound } from './reports';

const ROUND_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const PLAYER = '11111111-1111-1111-1111-111111111111';

type RoundRow = { report_count: number; status: string };

/**
 * Tiny in-memory Supabase fake. Knows just enough about `round_reports` and
 * `rounds` to drive `reportRound` end-to-end without a live DB.
 */
function fakeDb(opts: {
  round: RoundRow;
  // PK keys already present in round_reports — used to simulate ON CONFLICT.
  reports?: Set<string>;
}) {
  const round = { ...opts.round };
  const reports = opts.reports ?? new Set<string>();
  const updateCalls: Array<Partial<RoundRow>> = [];

  const db = {
    from(table: string) {
      if (table === 'round_reports') {
        let pendingInsert: { round_id: string; player_id: string; reason: string | null } | null =
          null;
        const builder = {
          insert(row: { round_id: string; player_id: string; reason: string | null }) {
            pendingInsert = row;
            return builder;
          },
          select(_cols: string) {
            return builder;
          },
          async maybeSingle() {
            if (!pendingInsert) throw new Error('insert() not called');
            const key = `${pendingInsert.round_id}::${pendingInsert.player_id}`;
            if (reports.has(key)) {
              return {
                data: null,
                error: {
                  code: '23505',
                  message: 'duplicate key value violates unique constraint',
                },
              };
            }
            reports.add(key);
            return { data: { round_id: pendingInsert.round_id }, error: null };
          },
        };
        return builder;
      }
      if (table === 'rounds') {
        let mode: 'select' | 'update' | null = null;
        let updatePayload: Partial<RoundRow> | null = null;
        const builder = {
          select(_cols: string) {
            mode = 'select';
            return builder;
          },
          update(payload: Partial<RoundRow>) {
            mode = 'update';
            updatePayload = payload;
            return builder;
          },
          eq(_col: string, _val: string) {
            return builder;
          },
          async maybeSingle() {
            if (mode !== 'select') throw new Error('expected select mode');
            return { data: { ...round }, error: null };
          },
          // biome-ignore lint/suspicious/noThenProperty: mock thenable for await
          then(resolve: (v: { data: null; error: null }) => unknown) {
            if (mode === 'update' && updatePayload) {
              Object.assign(round, updatePayload);
              updateCalls.push(updatePayload);
            }
            resolve({ data: null, error: null });
          },
        };
        return builder;
      }
      throw new Error(`unexpected table ${table}`);
    },
  };

  return { db, round, reports, updateCalls };
}

describe('reportRound', () => {
  it('records a new report and increments the round report count', async () => {
    const { db } = fakeDb({ round: { report_count: 0, status: 'auto_published' } });
    const result = await reportRound(db as never, { roundId: ROUND_ID, playerId: PLAYER });
    expect(result).toEqual({ alreadyReported: false, reportCount: 1, unpublished: false });
  });

  it('is idempotent — second report from same player is a no-op', async () => {
    const { db, updateCalls } = fakeDb({
      round: { report_count: 1, status: 'auto_published' },
      reports: new Set([`${ROUND_ID}::${PLAYER}`]),
    });
    const result = await reportRound(db as never, { roundId: ROUND_ID, playerId: PLAYER });
    expect(result).toEqual({ alreadyReported: true });
    // No update should have been issued — the count must not advance.
    expect(updateCalls).toHaveLength(0);
  });

  it(`flips status to 'reported' once report_count reaches the threshold (${REPORT_THRESHOLD})`, async () => {
    const { db, round } = fakeDb({
      round: { report_count: REPORT_THRESHOLD - 1, status: 'auto_published' },
    });
    const result = await reportRound(db as never, { roundId: ROUND_ID, playerId: PLAYER });
    expect(result).toEqual({
      alreadyReported: false,
      reportCount: REPORT_THRESHOLD,
      unpublished: true,
    });
    expect(round.status).toBe('reported');
    expect(round.report_count).toBe(REPORT_THRESHOLD);
  });

  it('does not flip status below threshold', async () => {
    const { db, round } = fakeDb({
      round: { report_count: 0, status: 'auto_published' },
    });
    await reportRound(db as never, { roundId: ROUND_ID, playerId: PLAYER });
    expect(round.status).toBe('auto_published');
  });

  it('still records reports on rounds that were already unpublished, without altering status', async () => {
    const { db, round } = fakeDb({
      round: { report_count: REPORT_THRESHOLD, status: 'reported' },
    });
    const result = await reportRound(db as never, { roundId: ROUND_ID, playerId: PLAYER });
    expect(result.alreadyReported).toBe(false);
    expect(round.status).toBe('reported'); // unchanged
    if (!result.alreadyReported) {
      expect(result.unpublished).toBe(false);
    }
  });

  it('throws on unexpected DB errors during insert', async () => {
    const failingDb = {
      from: vi.fn(() => ({
        insert: () => ({
          select: () => ({
            maybeSingle: async () => ({
              data: null,
              error: { code: 'XX000', message: 'connection lost' },
            }),
          }),
        }),
      })),
    };
    await expect(
      reportRound(failingDb as never, { roundId: ROUND_ID, playerId: PLAYER }),
    ).rejects.toMatchObject({ code: 'XX000' });
  });
});
