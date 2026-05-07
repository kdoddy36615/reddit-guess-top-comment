'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { validateUpgradeForm } from '@/lib/auth/upgrade-validation';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

/**
 * Renders the "Save my scores" upgrade CTA on the post-reveal screen.
 *
 * Visible only when the current auth user is anonymous. Upgrades the existing
 * `auth.users` row in place via `supabase.auth.updateUser({ email, password })`,
 * preserving `auth.uid()` and the linked `players.id`. Once the upgrade
 * succeeds the same identity can sign in from any device via /sign-in.
 *
 * Note: the SDK's `linkIdentity()` only supports OAuth/OIDC; `updateUser` is
 * the documented Supabase path for converting an anonymous user with
 * email + password.
 */
export function SaveScoresCta({ isAnonymous }: { isAnonymous: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (!isAnonymous || done) return null;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validation = validateUpgradeForm({ email, password });
    if (!validation.ok) {
      setError(validation.error);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error: upgradeError } = await supabase.auth.updateUser({
        email: email.trim(),
        password,
      });
      if (upgradeError) {
        setError(upgradeError.message);
        return;
      }
      setDone(true);
      // Refresh server components so the CTA hides on the next render and any
      // session-aware UI sees the new (non-anonymous) auth state.
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upgrade failed');
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        data-testid="save-scores-cta"
        className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-zinc-800 hover:bg-zinc-50"
      >
        Save my scores
      </button>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      data-testid="save-scores-form"
      className="space-y-3 rounded-lg border border-zinc-300 bg-white p-4"
    >
      <div>
        <p className="text-sm font-semibold text-zinc-900">Save your scores</p>
        <p className="mt-1 text-xs text-zinc-600">
          Add an email and password to keep your history across devices. No emails, ever.
        </p>
      </div>
      <label htmlFor="upgrade-email" className="sr-only">
        Email
      </label>
      <input
        id="upgrade-email"
        name="email"
        type="email"
        autoComplete="email"
        required
        disabled={submitting}
        placeholder="you@example.com"
        value={email}
        onChange={(ev) => setEmail(ev.target.value)}
        className="w-full rounded-lg border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-900"
      />
      <label htmlFor="upgrade-password" className="sr-only">
        Password
      </label>
      <input
        id="upgrade-password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        disabled={submitting}
        placeholder="Password (8+ characters)"
        value={password}
        onChange={(ev) => setPassword(ev.target.value)}
        className="w-full rounded-lg border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-900"
      />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          data-testid="save-scores-submit"
          className="flex-1 rounded-lg bg-zinc-900 px-4 py-2 text-white disabled:opacity-50"
        >
          {submitting ? 'Saving…' : 'Save scores'}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
          disabled={submitting}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
      {error && (
        <p className="text-sm text-red-600" data-testid="save-scores-error">
          {error}
        </p>
      )}
    </form>
  );
}
