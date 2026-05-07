/**
 * Scoring tuning knobs. Centralized so retuning the algorithm is a one-file change.
 *
 * The function shape (cosine → curve → base; plus N additive bonuses; clamp 0–100)
 * is stable. Numbers below are not.
 */

export const SCORING_CONFIG = {
  /**
   * Sigmoid curve mapping cosine similarity (-1..1) to base score (0..100).
   * base100(c) = 100 / (1 + exp(-steepness * (c - midpoint)))
   *
   * With midpoint=0.5, steepness=8: cos≈0.95 → ~98, cos≈0.5 → 50, cos≈0.1 → ~3.
   * Tuned around the assumption that realistic guess/top-comment cosines on
   * `text-embedding-004` (768d) cluster between 0.3 (off) and 0.95 (paraphrase).
   */
  curve: {
    midpoint: 0.5,
    steepness: 8,
  },
  bonuses: {
    punchline_word: 20,
    key_noun: 5,
    joke_structure: 10,
    keyword_overlap: 5,
  },
} as const;
