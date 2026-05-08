export function dailyRoomId(date: Date): string {
  const yyyy = date.getUTCFullYear().toString().padStart(4, '0');
  const mm = (date.getUTCMonth() + 1).toString().padStart(2, '0');
  const dd = date.getUTCDate().toString().padStart(2, '0');
  return `daily-${yyyy}-${mm}-${dd}`;
}

export interface DailyResetCountdown {
  hours: number;
  minutes: number;
  seconds: number;
  totalSeconds: number;
}

/**
 * Time remaining until the next UTC midnight, when `dailyRoomId` rolls over.
 * Used by the landing aux row's "daily resets in HH:MM:SS" display.
 */
export function timeUntilNextDailyReset(now: Date): DailyResetCountdown {
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0);
  const totalSeconds = Math.max(0, Math.floor((next - now.getTime()) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { hours, minutes, seconds, totalSeconds };
}

// xmur3 string hash → 32-bit seed.
function xmur3(str: string): number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  h ^= h >>> 16;
  return h >>> 0;
}

// mulberry32 — small, fast, deterministic 32-bit PRNG.
function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class InsufficientRoundsError extends Error {
  readonly available: number;
  readonly requested: number;
  constructor(available: number, requested: number) {
    super(`pickDailyRounds: ${available} candidates available but ${requested} requested`);
    this.name = 'InsufficientRoundsError';
    this.available = available;
    this.requested = requested;
  }
}

export function pickDailyRounds(candidates: string[], seed: string, n: number): string[] {
  if (candidates.length < n) {
    throw new InsufficientRoundsError(candidates.length, n);
  }
  const sorted = [...candidates].sort();
  const rng = mulberry32(xmur3(seed));
  // Fisher–Yates partial shuffle: pick n distinct elements.
  for (let i = 0; i < n; i++) {
    const j = i + Math.floor(rng() * (sorted.length - i));
    [sorted[i], sorted[j]] = [sorted[j], sorted[i]];
  }
  return sorted.slice(0, n);
}
