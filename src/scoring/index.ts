import { SCORING_CONFIG } from '@/config/scoring';

export type BonusType = 'punchline_word' | 'key_noun' | 'joke_structure' | 'keyword_overlap';

export type ScoreBonus = {
  type: BonusType;
  label: string;
  points: number;
};

export type ScoreBreakdown = {
  base: number;
  bonuses: ScoreBonus[];
  finalScore: number;
};

export type Guess = {
  text: string;
  embedding: number[];
};

export type ScoringContext = {
  topComment: {
    text: string;
    embedding: number[];
    tags: {
      punchlineWord?: string;
      keyNouns?: string[];
      jokeStructure?: { kind: string; markers: string[] };
    };
  };
};

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let aMag = 0;
  let bMag = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    aMag += a[i] * a[i];
    bMag += b[i] * b[i];
  }
  const denom = Math.sqrt(aMag) * Math.sqrt(bMag);
  return denom === 0 ? 0 : dot / denom;
}

function curve(cos: number): number {
  const { midpoint, steepness } = SCORING_CONFIG.curve;
  return 100 / (1 + Math.exp(-steepness * (cos - midpoint)));
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function tokenize(s: string): string[] {
  return s.toLowerCase().match(/[a-z0-9']+/g) ?? [];
}

function containsWord(haystack: string[], needle: string): boolean {
  const n = needle.toLowerCase();
  return haystack.includes(n);
}

function containsPhrase(normalizedText: string, phrase: string): boolean {
  // Word-boundary match for multi-word phrases.
  const normalizedPhrase = ` ${tokenize(phrase).join(' ')} `;
  return ` ${normalizedText} `.includes(normalizedPhrase);
}

export function scoreGuess(guess: Guess, context: ScoringContext): ScoreBreakdown {
  const cos = cosineSimilarity(guess.embedding, context.topComment.embedding);
  const base = clamp(curve(cos), 0, 100);

  const guessTokens = tokenize(guess.text);
  const guessNormalized = guessTokens.join(' ');
  const bonuses: ScoreBonus[] = [];

  const { tags } = context.topComment;

  if (tags.punchlineWord && containsWord(guessTokens, tags.punchlineWord)) {
    bonuses.push({
      type: 'punchline_word',
      label: 'Punchline match',
      points: SCORING_CONFIG.bonuses.punchline_word,
    });
  }

  if (tags.keyNouns?.some((n) => containsWord(guessTokens, n))) {
    bonuses.push({
      type: 'key_noun',
      label: 'Key noun match',
      points: SCORING_CONFIG.bonuses.key_noun,
    });
  }

  if (tags.jokeStructure?.markers.some((m) => containsPhrase(guessNormalized, m))) {
    bonuses.push({
      type: 'joke_structure',
      label: 'Joke structure match',
      points: SCORING_CONFIG.bonuses.joke_structure,
    });
  }

  const guessContent = new Set(guessTokens.filter((t) => t.length >= 4));
  const commentContent = new Set(tokenize(context.topComment.text).filter((t) => t.length >= 4));
  let overlap = 0;
  for (const t of guessContent) if (commentContent.has(t)) overlap++;
  if (overlap >= 2) {
    bonuses.push({
      type: 'keyword_overlap',
      label: 'Keyword overlap',
      points: SCORING_CONFIG.bonuses.keyword_overlap,
    });
  }

  const finalScore = clamp(base + bonuses.reduce((s, b) => s + b.points, 0), 0, 100);
  return { base, bonuses, finalScore };
}
