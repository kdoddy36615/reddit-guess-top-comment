// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import {
  generateRoomCode,
  generateUniqueRoomCode,
  isValidRoomCode,
  ROOM_CODE_ALPHABET,
  ROOM_CODE_LENGTH,
} from './code';

describe('ROOM_CODE_ALPHABET', () => {
  it('excludes the ambiguous characters O, 0, 1, I, L', () => {
    for (const ch of ['O', '0', '1', 'I', 'L']) {
      expect(ROOM_CODE_ALPHABET).not.toContain(ch);
    }
  });

  it('contains only uppercase letters and digits', () => {
    expect(ROOM_CODE_ALPHABET).toMatch(/^[A-Z2-9]+$/);
  });

  it('has no duplicate characters', () => {
    const set = new Set(ROOM_CODE_ALPHABET);
    expect(set.size).toBe(ROOM_CODE_ALPHABET.length);
  });
});

describe('generateRoomCode', () => {
  it('produces a 6-character code', () => {
    const code = generateRoomCode();
    expect(code).toHaveLength(ROOM_CODE_LENGTH);
    expect(ROOM_CODE_LENGTH).toBe(6);
  });

  it('uses only characters from the clear alphabet', () => {
    for (let i = 0; i < 200; i++) {
      const code = generateRoomCode();
      for (const ch of code) {
        expect(ROOM_CODE_ALPHABET).toContain(ch);
      }
    }
  });

  it('honors a deterministic rng (rng()=0 selects the first alphabet char)', () => {
    const code = generateRoomCode(() => 0);
    expect(code).toBe(ROOM_CODE_ALPHABET[0].repeat(6));
  });

  it('honors a deterministic rng (rng()=0.99... selects the last alphabet char)', () => {
    const code = generateRoomCode(() => 0.999999);
    expect(code).toBe(ROOM_CODE_ALPHABET[ROOM_CODE_ALPHABET.length - 1].repeat(6));
  });
});

describe('isValidRoomCode', () => {
  it('accepts a 6-char code from the alphabet', () => {
    expect(isValidRoomCode('ABCDEF')).toBe(true);
  });

  it('rejects codes of the wrong length', () => {
    expect(isValidRoomCode('ABCDE')).toBe(false);
    expect(isValidRoomCode('ABCDEFG')).toBe(false);
    expect(isValidRoomCode('')).toBe(false);
  });

  it('rejects codes containing excluded characters', () => {
    expect(isValidRoomCode('ABCDE0')).toBe(false);
    expect(isValidRoomCode('ABCDE1')).toBe(false);
    expect(isValidRoomCode('ABCDEO')).toBe(false);
    expect(isValidRoomCode('ABCDEI')).toBe(false);
    expect(isValidRoomCode('ABCDEL')).toBe(false);
  });

  it('rejects lowercase codes', () => {
    expect(isValidRoomCode('abcdef')).toBe(false);
  });
});

function fakeCollisionDb(takenCodes: Set<string>) {
  const lookups: string[] = [];
  const builder = (code: string) => ({
    select: () => builder(code),
    eq: (_col: string, val: string) => {
      lookups.push(val);
      return builder(val);
    },
    maybeSingle: async () => ({
      data: takenCodes.has(code) ? { code } : null,
      error: null,
    }),
  });
  // Track the most recently passed `code` from .eq() so maybeSingle resolves to it.
  const from = (table: string) => {
    if (table !== 'room_metadata') throw new Error(`unexpected table: ${table}`);
    let captured = '';
    const b = {
      select: () => b,
      eq: (_col: string, val: string) => {
        captured = val;
        lookups.push(val);
        return b;
      },
      maybeSingle: async () => ({
        data: takenCodes.has(captured) ? { code: captured } : null,
        error: null,
      }),
    };
    return b;
  };
  return { db: { from } as never, lookups };
}

describe('generateUniqueRoomCode', () => {
  it('returns the first generated code when no collision', async () => {
    const { db, lookups } = fakeCollisionDb(new Set());
    const rng = vi.fn(() => 0); // always pick first alphabet char
    const code = await generateUniqueRoomCode(db, { rng });
    expect(code).toBe(ROOM_CODE_ALPHABET[0].repeat(6));
    expect(lookups).toHaveLength(1);
  });

  it('retries when the first generated code is already taken', async () => {
    const taken = ROOM_CODE_ALPHABET[0].repeat(6);
    const { db, lookups } = fakeCollisionDb(new Set([taken]));
    // First two calls of rng pick char 0, then we step rng to char 1 by yielding 0.999...
    let calls = 0;
    const rng = () => {
      calls++;
      if (calls <= 6) return 0; // first 6 chars => taken code
      return 0.999999; // subsequent 6 chars => last alphabet char
    };
    const code = await generateUniqueRoomCode(db, { rng });
    expect(code).toBe(ROOM_CODE_ALPHABET[ROOM_CODE_ALPHABET.length - 1].repeat(6));
    expect(lookups).toHaveLength(2);
    expect(lookups[0]).toBe(taken);
  });

  it('throws after exhausting maxAttempts when every code collides', async () => {
    // Make every code-lookup return a hit.
    const from = (table: string) => {
      if (table !== 'room_metadata') throw new Error(`unexpected table: ${table}`);
      const b = {
        select: () => b,
        eq: () => b,
        maybeSingle: async () => ({ data: { code: 'ANYTHG' }, error: null }),
      };
      return b;
    };
    const db = { from } as never;
    await expect(generateUniqueRoomCode(db, { maxAttempts: 3 })).rejects.toThrow(
      /unique room code/i,
    );
  });
});
