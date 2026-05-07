import { GoogleGenAI } from '@google/genai';
import { env } from '@/config/env';

let cached: GoogleGenAI | null = null;

/**
 * Lazy `GoogleGenAI` factory. Shared by `gate.ts` and any future Gemini-using
 * module that isn't `embed.ts` (which keeps its own factory for historical
 * reasons + a dedicated test boundary).
 */
export function getGenAI(): GoogleGenAI {
  if (cached) return cached;
  const apiKey = env.GOOGLE_GENAI_API_KEY;
  if (!apiKey) throw new Error('GOOGLE_GENAI_API_KEY is not set.');
  cached = new GoogleGenAI({ apiKey });
  return cached;
}
