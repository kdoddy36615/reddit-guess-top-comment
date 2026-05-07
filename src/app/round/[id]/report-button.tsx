'use client';

import { Flag } from 'lucide-react';
import { useState } from 'react';

type Status = 'idle' | 'sending' | 'reported' | 'already' | 'error';

export function ReportButton({ roundId }: { roundId: string }) {
  const [status, setStatus] = useState<Status>('idle');

  async function onReport() {
    if (status === 'sending' || status === 'reported' || status === 'already') return;
    if (typeof window !== 'undefined') {
      const ok = window.confirm(
        'Report this round as low-quality, broken, or inappropriate? Reports help us keep the game playable.',
      );
      if (!ok) return;
    }
    setStatus('sending');
    try {
      const res = await fetch('/api/report', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ roundId }),
      });
      if (!res.ok) {
        setStatus('error');
        return;
      }
      const data = (await res.json()) as { alreadyReported: boolean };
      setStatus(data.alreadyReported ? 'already' : 'reported');
    } catch {
      setStatus('error');
    }
  }

  const label =
    status === 'reported'
      ? 'Reported — thanks'
      : status === 'already'
        ? 'Already reported'
        : status === 'sending'
          ? 'Reporting…'
          : status === 'error'
            ? 'Report failed'
            : 'Report';

  const disabled = status === 'sending' || status === 'reported' || status === 'already';

  return (
    <button
      type="button"
      onClick={onReport}
      disabled={disabled}
      data-testid="report-round"
      title="Report this round"
      aria-label="Report this round"
      className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-800 disabled:text-zinc-400 disabled:hover:text-zinc-400"
    >
      <Flag className="h-3.5 w-3.5" aria-hidden="true" />
      <span>{label}</span>
    </button>
  );
}
