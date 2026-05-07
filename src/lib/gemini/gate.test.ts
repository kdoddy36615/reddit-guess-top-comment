// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const generateContentMock = vi.fn();

// Mock the @google/genai SDK boundary, mirroring the pattern in embed.test.ts.
// Internal modules (gate.ts, client.ts) are NOT mocked.
vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    models = { generateContent: generateContentMock };
  },
}));

function geminiResponse(payload: unknown): { text: string } {
  return { text: JSON.stringify(payload) };
}

describe('gate', () => {
  beforeEach(() => {
    generateContentMock.mockReset();
    process.env.GOOGLE_GENAI_API_KEY = 'test-key';
  });

  it('returns a publish verdict with structured tags from a successful call', async () => {
    generateContentMock.mockResolvedValueOnce(
      geminiResponse({
        verdict: 'publish',
        reasoning: 'classic punchline payoff',
        difficulty: 'medium',
        punchline_word: 'spaghetti',
        key_noun: null,
        joke_structure: 'callback',
      }),
    );

    const { gate } = await import('./gate');
    const result = await gate({
      post: { title: 'TIFU by frying my router', subreddit: 'tifu' },
      comment: { body: 'spaghetti, again' },
    });

    expect(result).toEqual({
      verdict: 'publish',
      reasoning: 'classic punchline payoff',
      difficulty: 'medium',
      tags: {
        punchline_word: 'spaghetti',
        key_noun: null,
        joke_structure: 'callback',
      },
    });
  });

  it('returns a reject verdict (with all-null tags allowed)', async () => {
    generateContentMock.mockResolvedValueOnce(
      geminiResponse({
        verdict: 'reject',
        reasoning: 'requires insider context',
        difficulty: 'hard',
        punchline_word: null,
        key_noun: null,
        joke_structure: null,
      }),
    );

    const { gate } = await import('./gate');
    const result = await gate({
      post: { title: 't', subreddit: 'AskReddit' },
      comment: { body: 'b' },
    });

    expect(result.verdict).toBe('reject');
    expect(result.reasoning).toMatch(/insider/i);
    expect(result.tags).toEqual({ punchline_word: null, key_noun: null, joke_structure: null });
  });

  it('throws on a malformed Gemini response', async () => {
    generateContentMock.mockResolvedValueOnce(geminiResponse({ verdict: 'maybe' }));

    const { gate } = await import('./gate');
    await expect(
      gate({ post: { title: 't', subreddit: 'tifu' }, comment: { body: 'b' } }),
    ).rejects.toThrow();
  });

  it('throws when Gemini returns no text', async () => {
    generateContentMock.mockResolvedValueOnce({ text: undefined });

    const { gate } = await import('./gate');
    await expect(
      gate({ post: { title: 't', subreddit: 'tifu' }, comment: { body: 'b' } }),
    ).rejects.toThrow(/no text/i);
  });

  it('asks the SDK for gemini-2.5-flash with a JSON responseSchema', async () => {
    generateContentMock.mockResolvedValueOnce(
      geminiResponse({
        verdict: 'reject',
        reasoning: 'r',
        difficulty: 'easy',
        punchline_word: null,
        key_noun: null,
        joke_structure: null,
      }),
    );

    const { gate } = await import('./gate');
    await gate({ post: { title: 't', subreddit: 'tifu' }, comment: { body: 'b' } });

    const call = generateContentMock.mock.calls[0][0];
    expect(call.model).toBe('gemini-2.5-flash');
    expect(call.config?.responseMimeType).toBe('application/json');
    expect(call.config?.responseSchema).toBeDefined();
  });

  it('puts the post title and comment body into the user content', async () => {
    generateContentMock.mockResolvedValueOnce(
      geminiResponse({
        verdict: 'publish',
        reasoning: 'r',
        difficulty: 'easy',
        punchline_word: null,
        key_noun: null,
        joke_structure: null,
      }),
    );

    const { gate } = await import('./gate');
    await gate({
      post: { title: 'TIFU by frying my router', subreddit: 'tifu' },
      comment: { body: 'spaghetti, again' },
    });

    const call = generateContentMock.mock.calls[0][0];
    const contents = String(call.contents);
    expect(contents).toContain('TIFU by frying my router');
    expect(contents).toContain('spaghetti, again');
    expect(contents).toContain('tifu');
  });

  it('coerces missing tag fields to null (Gemini may omit them on reject)', async () => {
    generateContentMock.mockResolvedValueOnce(
      geminiResponse({
        verdict: 'reject',
        reasoning: 'too short',
        difficulty: 'easy',
        // punchline_word, key_noun, joke_structure intentionally absent
      }),
    );

    const { gate } = await import('./gate');
    const result = await gate({
      post: { title: 't', subreddit: 'tifu' },
      comment: { body: 'b' },
    });

    expect(result.verdict).toBe('reject');
    expect(result.tags).toEqual({ punchline_word: null, key_noun: null, joke_structure: null });
  });

  it('passes a system instruction biased toward over-rejection', async () => {
    generateContentMock.mockResolvedValueOnce(
      geminiResponse({
        verdict: 'reject',
        reasoning: 'r',
        difficulty: 'easy',
        punchline_word: null,
        key_noun: null,
        joke_structure: null,
      }),
    );

    const { gate } = await import('./gate');
    await gate({ post: { title: 't', subreddit: 'tifu' }, comment: { body: 'b' } });

    const call = generateContentMock.mock.calls[0][0];
    const sys = String(call.config?.systemInstruction ?? '');
    expect(sys.toLowerCase()).toMatch(/reject/);
  });
});
