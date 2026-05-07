import { z } from 'zod';
import { getGenAI } from './client';

const MODEL = 'gemini-2.5-flash';

export type GateInput = {
  post: { title: string; subreddit: string };
  comment: { body: string };
};

export type GateResult = {
  verdict: 'publish' | 'reject';
  reasoning: string;
  difficulty: 'easy' | 'medium' | 'hard';
  tags: {
    punchline_word: string | null;
    key_noun: string | null;
    joke_structure: string | null;
  };
};

// Structured-output schema we ask Gemini to fill. Flat shape matches what the
// SDK can constrain via `responseSchema`; we lift the three tag fields into a
// nested `tags` object on the public TS type for ergonomics.
// Tag fields use `nullish()` (null OR undefined) because Gemini frequently
// omits them entirely on reject rather than returning explicit nulls. We
// normalize undefined → null on the public `tags` object.
const GateResponseSchema = z.object({
  verdict: z.enum(['publish', 'reject']),
  reasoning: z.string().min(1),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  punchline_word: z.string().nullish(),
  key_noun: z.string().nullish(),
  joke_structure: z.string().nullish(),
});

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    verdict: { type: 'string', enum: ['publish', 'reject'] },
    reasoning: { type: 'string' },
    difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'] },
    punchline_word: { type: 'string', nullable: true },
    key_noun: { type: 'string', nullable: true },
    joke_structure: { type: 'string', nullable: true },
  },
  required: ['verdict', 'reasoning', 'difficulty'],
} as const;

const SYSTEM_INSTRUCTION = `
You are gating Reddit "post-title + top-comment" pairs for a guessing game where
the player reads the post title and tries to predict the top comment. Quality
bar is HIGH and you should bias toward REJECT — false negatives cost nothing
(Reddit supply is infinite), false positives ruin player experience.

REJECT if any of:
- top comment requires insider context the title doesn't supply
- top comment is a one-word reaction ("lol", "this", "underrated") with no payoff
- top comment is a wall of explanation rather than a punchline/payoff
- top comment is a meta-joke about the subreddit or about Reddit itself
- top comment depends on an image, video, or external link
- the title alone is not enough for a thoughtful player to plausibly guess in the
  same direction as the comment

PUBLISH only when a smart player reading just the title could plausibly produce
something semantically close to the top comment.

If you publish, also fill:
- difficulty: easy / medium / hard (from the player's POV)
- punchline_word: the single most-load-bearing word in the comment, if any
- key_noun: the topical noun the comment hangs on, if any
- joke_structure: a short label like "callback", "rule-of-three", "literal-twist", if any

Always set difficulty (even on reject — pick your best guess). Tag fields may be null.
Always include reasoning (1–2 sentences).
`.trim();

export async function gate(input: GateInput): Promise<GateResult> {
  const userContent = `Subreddit: r/${input.post.subreddit}
Title: ${input.post.title}
Top comment: ${input.comment.body}`;

  const response = await getGenAI().models.generateContent({
    model: MODEL,
    contents: userContent,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,
    },
  });

  const text = response.text;
  if (!text) throw new Error('Gemini gate returned no text');
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(text);
  } catch (e) {
    throw new Error(`Gemini gate returned non-JSON: ${(e as Error).message}`);
  }
  const parsed = GateResponseSchema.parse(parsedJson);
  return {
    verdict: parsed.verdict,
    reasoning: parsed.reasoning,
    difficulty: parsed.difficulty,
    tags: {
      punchline_word: parsed.punchline_word ?? null,
      key_noun: parsed.key_noun ?? null,
      joke_structure: parsed.joke_structure ?? null,
    },
  };
}
