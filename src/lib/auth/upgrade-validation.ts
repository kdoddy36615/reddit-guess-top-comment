import { z } from 'zod';

export const MIN_PASSWORD_LENGTH = 8;

const Schema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(MIN_PASSWORD_LENGTH),
});

export type UpgradeFormInput = { email: string; password: string };

export type UpgradeValidationResult = { ok: true } | { ok: false; error: string };

export function validateUpgradeForm(input: UpgradeFormInput): UpgradeValidationResult {
  const parsed = Schema.safeParse(input);
  if (parsed.success) return { ok: true };
  const first = parsed.error.issues[0];
  if (!first) return { ok: false, error: 'Invalid input' };
  if (first.path[0] === 'email') {
    return { ok: false, error: 'Please enter a valid email address.' };
  }
  if (first.path[0] === 'password') {
    return {
      ok: false,
      error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
    };
  }
  return { ok: false, error: 'Invalid input' };
}
