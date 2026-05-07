import { GoogleGenAI } from '@google/genai';
import { env } from '@/config/env';

const MODEL = 'gemini-embedding-001';
const OUTPUT_DIMS = 768; // matches `vector(768)` in supabase/migrations/0001_initial_schema.sql

let cachedClient: GoogleGenAI | null = null;
function client(): GoogleGenAI {
  if (cachedClient) return cachedClient;
  const apiKey = env.GOOGLE_GENAI_API_KEY;
  if (!apiKey) throw new Error('GOOGLE_GENAI_API_KEY is not set.');
  cachedClient = new GoogleGenAI({ apiKey });
  return cachedClient;
}

/**
 * Embed a single text into a 768-dim vector via Gemini Embedding 001.
 * SDK-style boundary: one function per operation. Mock this module's *parent*
 * (`@google/genai`) in tests, not this function.
 */
export async function embedText(text: string): Promise<number[]> {
  const response = await client().models.embedContent({
    model: MODEL,
    contents: text,
    config: { outputDimensionality: OUTPUT_DIMS },
  });
  const values = response.embeddings?.[0]?.values;
  if (!values || values.length === 0) {
    throw new Error('Gemini returned no embedding values');
  }
  return values;
}
