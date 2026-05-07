// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const embedContentMock = vi.fn();

// Mock the @google/genai SDK boundary. Tests pass canned responses through
// `embedContentMock`; nothing in src/lib/gemini/* is mocked.
vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    models = { embedContent: embedContentMock };
  },
}));

describe('embedText', () => {
  beforeEach(() => {
    embedContentMock.mockReset();
  });

  it('returns the embedding vector for a successful call', async () => {
    const vector = new Array(768).fill(0).map((_, i) => i / 768);
    embedContentMock.mockResolvedValueOnce({
      embeddings: [{ values: vector }],
    });

    const { embedText } = await import('./embed');
    const result = await embedText('hello world');
    expect(result).toEqual(vector);
    expect(embedContentMock).toHaveBeenCalledTimes(1);
  });

  it('asks the SDK for the configured 768-dim gemini-embedding-001 model', async () => {
    embedContentMock.mockResolvedValueOnce({
      embeddings: [{ values: new Array(768).fill(0.1) }],
    });
    const { embedText } = await import('./embed');
    await embedText('hello');
    const call = embedContentMock.mock.calls[0][0];
    expect(call.model).toBe('gemini-embedding-001');
    expect(call.contents).toBe('hello');
    expect(call.config?.outputDimensionality).toBe(768);
  });

  it('throws when the SDK response has no embedding values', async () => {
    embedContentMock.mockResolvedValueOnce({ embeddings: [] });
    const { embedText } = await import('./embed');
    await expect(embedText('x')).rejects.toThrow(/embedding/i);
  });
});
