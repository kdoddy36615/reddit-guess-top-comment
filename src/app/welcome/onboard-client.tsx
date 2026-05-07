'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export function OnboardClient({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [nickname, setNickname] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = nickname.trim();
    if (trimmed.length < 1 || trimmed.length > 40) {
      setError('Nickname must be 1–40 characters.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const existing = await supabase.auth.getUser();
      if (!existing.data.user) {
        const { error: signInError } = await supabase.auth.signInAnonymously();
        if (signInError) throw signInError;
      }
      const res = await fetch('/api/auth/onboard', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ nickname: trimmed }),
      });
      if (!res.ok) {
        const { error: msg } = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(msg ?? `Onboard failed (${res.status})`);
      }
      router.replace(nextPath);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Onboarding failed');
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-3">
      <label htmlFor="nickname" className="sr-only">
        Nickname
      </label>
      <input
        id="nickname"
        name="nickname"
        type="text"
        autoComplete="nickname"
        maxLength={40}
        disabled={submitting}
        placeholder="Pick a name"
        value={nickname}
        onChange={(e) => setNickname(e.target.value)}
        className="w-full rounded-lg border border-zinc-300 px-4 py-3 text-lg outline-none focus:border-zinc-900"
      />
      <button
        type="submit"
        disabled={submitting || !nickname.trim()}
        className="w-full rounded-lg bg-zinc-900 px-4 py-3 text-white disabled:opacity-50"
      >
        {submitting ? 'Saving…' : 'Start playing'}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}
