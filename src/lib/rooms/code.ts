import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';

type Db = SupabaseClient<Database>;

/**
 * Clear alphabet — uppercase letters and digits, with the visually-ambiguous
 * characters (`O`, `0`, `1`, `I`, `L`) removed so a code spoken aloud or read
 * off a screen is unambiguous. 31 characters → 31^6 ≈ 887M codes.
 */
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export const ROOM_CODE_LENGTH = 6;

export type Rng = () => number;

const VALID_CODE_RE = new RegExp(`^[${ROOM_CODE_ALPHABET}]{${ROOM_CODE_LENGTH}}$`);

export function isValidRoomCode(code: string): boolean {
  return VALID_CODE_RE.test(code);
}

export function generateRoomCode(rng: Rng = Math.random): string {
  let out = '';
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    const idx = Math.floor(rng() * ROOM_CODE_ALPHABET.length);
    const safeIdx = Math.min(idx, ROOM_CODE_ALPHABET.length - 1);
    out += ROOM_CODE_ALPHABET[safeIdx];
  }
  return out;
}

export interface GenerateUniqueOptions {
  rng?: Rng;
  maxAttempts?: number;
}

/**
 * Generate a 6-char room code that is not already taken in `room_metadata`.
 * Retries on collision up to `maxAttempts` times (default 12). Throws if
 * every attempt collides — which would indicate either a saturated code
 * space or a bug in the rng.
 */
export async function generateUniqueRoomCode(
  db: Db,
  opts: GenerateUniqueOptions = {},
): Promise<string> {
  const rng = opts.rng ?? Math.random;
  const maxAttempts = opts.maxAttempts ?? 12;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const candidate = generateRoomCode(rng);
    const { data, error } = await db
      .from('room_metadata')
      .select('code')
      .eq('code', candidate)
      .maybeSingle();
    if (error) throw error;
    if (!data) return candidate;
  }
  throw new Error(`Failed to generate a unique room code after ${maxAttempts} attempts`);
}
