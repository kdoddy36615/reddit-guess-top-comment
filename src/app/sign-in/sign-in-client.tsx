'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { validateUpgradeForm } from '@/lib/auth/upgrade-validation';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export function SignInClient({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) {
        setError(signInError.message);
        return;
      }
      router.replace(nextPath);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-3">
      <label htmlFor="signin-email" className="sr-only">
        Email
      </label>
      <input
        id="signin-email"
        name="email"
        type="email"
        autoComplete="email"
        required
        disabled={submitting}
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full rounded-lg border border-zinc-300 px-4 py-3 text-lg outline-none focus:border-zinc-900"
      />
      <label htmlFor="signin-password" className="sr-only">
        Password
      </label>
      <input
        id="signin-password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        disabled={submitting}
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full rounded-lg border border-zinc-300 px-4 py-3 text-lg outline-none focus:border-zinc-900"
      />
      <button
        type="submit"
        disabled={submitting}
        data-testid="sign-in-submit"
        className="w-full rounded-lg bg-zinc-900 px-4 py-3 text-white disabled:opacity-50"
      >
        {submitting ? 'Signing in…' : 'Sign in'}
      </button>
      {error && (
        <p className="text-sm text-red-600" data-testid="sign-in-error">
          {error}
        </p>
      )}
    </form>
  );
}
