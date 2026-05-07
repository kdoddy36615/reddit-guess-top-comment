export type Rng = () => number;

export function pickRound<T>(candidates: T[], rng: Rng): T | null {
  const idx = Math.floor(rng() * candidates.length);
  return candidates[idx] ?? null;
}

export function nextRoundIndex(played: { round_index: number }[]): number {
  if (played.length === 0) return 0;
  return Math.max(...played.map((r) => r.round_index)) + 1;
}
