export function formatUpvotes(score: number): string {
  if (!Number.isFinite(score) || score < 0) return '0';
  if (score < 1000) return String(Math.floor(score));
  if (score < 10_000) {
    const tenths = Math.floor(score / 100) / 10;
    return `${tenths.toFixed(1)}k`;
  }
  return `${Math.round(score / 1000)}k`;
}

export function formatPostAge(
  createdUtcSeconds: number | null | undefined,
  nowMs: number = Date.now(),
): string {
  if (createdUtcSeconds === null || createdUtcSeconds === undefined) return '—';
  const ageSeconds = Math.max(0, nowMs / 1000 - createdUtcSeconds);
  if (ageSeconds < 60) return 'now';
  const minutes = Math.floor(ageSeconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}
