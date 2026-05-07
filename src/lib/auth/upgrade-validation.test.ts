import { describe, expect, it } from 'vitest';
import { validateUpgradeForm } from './upgrade-validation';

describe('validateUpgradeForm', () => {
  it('accepts a valid email + 8-character password', () => {
    expect(validateUpgradeForm({ email: 'a@b.co', password: 'password' })).toEqual({ ok: true });
  });

  it('rejects an empty email', () => {
    const r = validateUpgradeForm({ email: '', password: 'password' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/email/i);
  });

  it('rejects a malformed email', () => {
    const r = validateUpgradeForm({ email: 'not-an-email', password: 'password' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/email/i);
  });

  it('rejects a password shorter than 8 characters', () => {
    const r = validateUpgradeForm({ email: 'a@b.co', password: 'short' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/password/i);
  });

  it('trims surrounding whitespace before validating the email', () => {
    expect(validateUpgradeForm({ email: '  a@b.co  ', password: 'password' })).toEqual({
      ok: true,
    });
  });
});
