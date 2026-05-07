import { describe, expect, it } from 'vitest';
import { scoreGuess } from './index';

const DIM = 768;

function vec(seed: number): number[] {
  // Deterministic non-zero vector. Using sin so values are bounded and varied.
  const out = new Array<number>(DIM);
  for (let i = 0; i < DIM; i++) {
    out[i] = Math.sin(seed + i * 0.0137);
  }
  return out;
}

function orthogonalPair(): [number[], number[]] {
  // Two vectors with disjoint support → cosine = 0.
  const a = new Array<number>(DIM).fill(0);
  const b = new Array<number>(DIM).fill(0);
  for (let i = 0; i < DIM / 2; i++) a[i] = 1;
  for (let i = DIM / 2; i < DIM; i++) b[i] = 1;
  return [a, b];
}

function emptyContext(embedding: number[]) {
  return {
    topComment: {
      text: 'whatever',
      embedding,
      tags: {},
    },
  };
}

function contextWith(
  embedding: number[],
  tags: {
    punchlineWord?: string;
    keyNouns?: string[];
    jokeStructure?: { kind: string; markers: string[] };
  },
) {
  return {
    topComment: {
      text: 'whatever',
      embedding,
      tags,
    },
  };
}

describe('scoreGuess — base from cosine similarity', () => {
  it('returns finalScore >= 90 when guess embedding equals top-comment embedding', () => {
    const e = vec(1);
    const result = scoreGuess({ text: 'hello', embedding: e }, emptyContext(e));
    expect(result.finalScore).toBeGreaterThanOrEqual(90);
    expect(result.base).toBeGreaterThanOrEqual(90);
    expect(result.bonuses).toEqual([]);
  });

  it('returns base near 0 for orthogonal (unrelated) embeddings', () => {
    const [a, b] = orthogonalPair();
    const result = scoreGuess({ text: 'totally unrelated', embedding: a }, emptyContext(b));
    expect(result.base).toBeLessThan(10);
    expect(result.finalScore).toBeLessThan(10);
  });

  it('clamps base at 0 for anti-parallel embeddings (cosine = -1)', () => {
    const e = vec(2);
    const opposite = e.map((x) => -x);
    const result = scoreGuess({ text: 'opposite', embedding: opposite }, emptyContext(e));
    expect(result.base).toBeGreaterThanOrEqual(0);
    expect(result.base).toBeLessThan(0.001);
    expect(result.finalScore).toBe(result.base);
  });
});

describe('scoreGuess — punchline_word bonus', () => {
  it('emits a +20 bonus when guess contains the punchline word', () => {
    const [a, b] = orthogonalPair();
    const result = scoreGuess(
      { text: 'must be the SPAGHETTI', embedding: a },
      contextWith(b, { punchlineWord: 'spaghetti' }),
    );
    const punchline = result.bonuses.find((x) => x.type === 'punchline_word');
    expect(punchline).toBeDefined();
    expect(punchline?.points).toBe(20);
  });

  it('does not emit a punchline_word bonus when the guess does not contain it', () => {
    const [a, b] = orthogonalPair();
    const result = scoreGuess(
      { text: 'something else entirely', embedding: a },
      contextWith(b, { punchlineWord: 'spaghetti' }),
    );
    expect(result.bonuses.find((x) => x.type === 'punchline_word')).toBeUndefined();
  });

  it('matches punchline_word on word boundaries (not substrings)', () => {
    const [a, b] = orthogonalPair();
    const result = scoreGuess(
      // "carpet" contains "car" as substring but not as a word
      { text: 'I rolled out the carpet', embedding: a },
      contextWith(b, { punchlineWord: 'car' }),
    );
    expect(result.bonuses.find((x) => x.type === 'punchline_word')).toBeUndefined();
  });
});

describe('scoreGuess — key_noun bonus', () => {
  it('emits a single +5 bonus when guess contains any of the key nouns', () => {
    const [a, b] = orthogonalPair();
    const result = scoreGuess(
      { text: 'the neighbor was furious', embedding: a },
      contextWith(b, { keyNouns: ['car', 'neighbor', 'lawn'] }),
    );
    const noun = result.bonuses.find((x) => x.type === 'key_noun');
    expect(noun?.points).toBe(5);
    expect(result.bonuses.filter((x) => x.type === 'key_noun')).toHaveLength(1);
  });

  it('emits only one key_noun bonus even when multiple key nouns match', () => {
    const [a, b] = orthogonalPair();
    const result = scoreGuess(
      { text: 'the neighbor parked the car on my lawn', embedding: a },
      contextWith(b, { keyNouns: ['car', 'neighbor', 'lawn'] }),
    );
    expect(result.bonuses.filter((x) => x.type === 'key_noun')).toHaveLength(1);
  });

  it('does not emit key_noun bonus when no key noun is present', () => {
    const [a, b] = orthogonalPair();
    const result = scoreGuess(
      { text: 'completely off topic', embedding: a },
      contextWith(b, { keyNouns: ['car', 'neighbor'] }),
    );
    expect(result.bonuses.find((x) => x.type === 'key_noun')).toBeUndefined();
  });
});

describe('scoreGuess — joke_structure bonus', () => {
  it('emits +10 when guess contains a structural marker token', () => {
    const [a, b] = orthogonalPair();
    const result = scoreGuess(
      { text: 'plot twist: it was the dog all along', embedding: a },
      contextWith(b, {
        jokeStructure: { kind: 'callback', markers: ['plot twist', 'all along'] },
      }),
    );
    const struct = result.bonuses.find((x) => x.type === 'joke_structure');
    expect(struct?.points).toBe(10);
  });

  it('does not emit joke_structure bonus when no marker matches', () => {
    const [a, b] = orthogonalPair();
    const result = scoreGuess(
      { text: 'just a flat statement', embedding: a },
      contextWith(b, {
        jokeStructure: { kind: 'callback', markers: ['plot twist', 'all along'] },
      }),
    );
    expect(result.bonuses.find((x) => x.type === 'joke_structure')).toBeUndefined();
  });
});

describe('scoreGuess — keyword_overlap bonus', () => {
  function contextWithText(embedding: number[], text: string) {
    return {
      topComment: { text, embedding, tags: {} },
    };
  }

  it('emits +5 when guess shares >=2 content words with top comment', () => {
    const [a, b] = orthogonalPair();
    const result = scoreGuess(
      { text: 'the wedding cake fell on the dance floor', embedding: a },
      contextWithText(b, 'someone tripped and the wedding cake hit the floor'),
    );
    const overlap = result.bonuses.find((x) => x.type === 'keyword_overlap');
    expect(overlap?.points).toBe(5);
  });

  it('does not emit keyword_overlap when only one content word is shared', () => {
    const [a, b] = orthogonalPair();
    const result = scoreGuess(
      { text: 'a quiet evening alone', embedding: a },
      contextWithText(b, 'wedding cake disaster strikes again'),
    );
    expect(result.bonuses.find((x) => x.type === 'keyword_overlap')).toBeUndefined();
  });

  it('ignores stop-ish short words (length < 4) when computing overlap', () => {
    const [a, b] = orthogonalPair();
    // Both contain "the" and "and" but no longer shared content words.
    const result = scoreGuess(
      { text: 'the cat and the moon', embedding: a },
      contextWithText(b, 'the dog and the sun'),
    );
    expect(result.bonuses.find((x) => x.type === 'keyword_overlap')).toBeUndefined();
  });
});

describe('scoreGuess — finalScore composition and clamping', () => {
  it('finalScore equals base + sum(bonuses) when no clamping is needed', () => {
    const [a, b] = orthogonalPair();
    const result = scoreGuess(
      { text: 'the spaghetti incident', embedding: a },
      contextWith(b, { punchlineWord: 'spaghetti' }),
    );
    const sum = result.bonuses.reduce((s, x) => s + x.points, 0);
    expect(result.finalScore).toBeCloseTo(result.base + sum, 5);
  });

  it('clamps finalScore at 100 when base + bonuses would exceed 100', () => {
    const e = vec(3);
    const result = scoreGuess(
      { text: 'spaghetti was the secret ingredient that night', embedding: e },
      {
        topComment: {
          text: 'spaghetti was the secret ingredient that night',
          embedding: e,
          tags: {
            punchlineWord: 'spaghetti',
            keyNouns: ['ingredient'],
            jokeStructure: { kind: 'reveal', markers: ['secret ingredient'] },
          },
        },
      },
    );
    // base ~100, plus bonuses; must clamp.
    expect(result.finalScore).toBe(100);
    // bonuses should still be reported (legibility), even if clamped.
    expect(result.bonuses.length).toBeGreaterThan(0);
  });
});
