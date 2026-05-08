/**
 * Format the time remaining until the next UTC-midnight daily reset as `hh:mm`.
 *
 * Rounds up so that "30 seconds left" reads as `00:01` rather than `00:00`,
 * matching how a player would interpret a countdown — they'd rather see one
 * minute and watch it tick than see zero and wonder if the daily already
 * rolled. At exactly `00:00:00.000 UTC` the next reset is 24h away, so the
 * function returns `24:00`.
 */
export function formatResetsIn(now: Date): string {
  const next = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0),
  );
  const diffMs = next.getTime() - now.getTime();
  const totalMinutes = Math.ceil(diffMs / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}
