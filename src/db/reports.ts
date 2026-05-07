import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';

type Db = SupabaseClient<Database>;

/**
 * Report count at which an `auto_published` round flips to `reported` and
 * disappears from gameplay, sitemap, and archive. Tunable; not in scoring.ts
 * because it has nothing to do with scoring.
 */
export const REPORT_THRESHOLD = 3;

export type ReportResult =
  | { alreadyReported: true }
  | { alreadyReported: false; reportCount: number; unpublished: boolean };

/**
 * Record a player's report on a round. Idempotent per `(round, player)` via
 * the table's primary key — a duplicate insert is a no-op and returns
 * `alreadyReported: true` without bumping the count.
 *
 * When the report count reaches `REPORT_THRESHOLD` and the round is currently
 * `auto_published`, the round's status flips to `reported` — automatically
 * removing it from eligibility queries (which all filter by `auto_published`).
 */
export async function reportRound(
  db: Db,
  args: { roundId: string; playerId: string; reason?: string },
): Promise<ReportResult> {
  const insertRes = await db
    .from('round_reports')
    .insert({
      round_id: args.roundId,
      player_id: args.playerId,
      reason: args.reason ?? null,
    })
    .select('round_id')
    .maybeSingle();

  if (insertRes.error) {
    if (insertRes.error.code === '23505') {
      return { alreadyReported: true };
    }
    throw insertRes.error;
  }

  const { data: round, error: readErr } = await db
    .from('rounds')
    .select('report_count, status')
    .eq('id', args.roundId)
    .maybeSingle();
  if (readErr) throw readErr;
  if (!round) throw new Error(`Round ${args.roundId} not found`);

  const newCount = (round.report_count ?? 0) + 1;
  const shouldUnpublish = newCount >= REPORT_THRESHOLD && round.status === 'auto_published';

  const update: { report_count: number; status?: 'reported' } = { report_count: newCount };
  if (shouldUnpublish) update.status = 'reported';

  const { error: updateErr } = await db.from('rounds').update(update).eq('id', args.roundId);
  if (updateErr) throw updateErr;

  return { alreadyReported: false, reportCount: newCount, unpublished: shouldUnpublish };
}
