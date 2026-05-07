'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function StartPlayingButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/session/next', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (res.status === 401) {
        router.push('/welcome?next=/');
        return;
      }
      if (!res.ok) {
        setError(`Could not start a round (${res.status})`);
        return;
      }
      const data = (await res.json()) as { roundId: string | null };
      if (!data.roundId) {
        setError('No rounds available yet — run the dev seed.');
        return;
      }
      router.push(`/round/${data.roundId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={start}
        disabled={loading}
        data-testid="start-playing"
        className="rounded-lg bg-zinc-900 px-6 py-3 text-lg text-white disabled:opacity-50"
      >
        {loading ? 'Loading…' : 'Start playing'}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
