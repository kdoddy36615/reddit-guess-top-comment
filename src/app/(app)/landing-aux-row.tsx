'use client';

import { useEffect, useState } from 'react';
import { timeUntilNextDailyReset } from '@/lib/daily';

export interface LandingAuxRowProps {
  /** ISO timestamp captured server-side at SSR — keeps the first paint stable. */
  nowIso: string;
  playersToday: number;
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

function formatCountdown(now: Date): string {
  const { hours, minutes, seconds } = timeUntilNextDailyReset(now);
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

export function LandingAuxRow({ nowIso, playersToday }: LandingAuxRowProps) {
  const [label, setLabel] = useState(() => formatCountdown(new Date(nowIso)));

  useEffect(() => {
    setLabel(formatCountdown(new Date()));
    const id = setInterval(() => {
      setLabel(formatCountdown(new Date()));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const formattedCount = new Intl.NumberFormat('en-US').format(playersToday);
  const playedCopy = playersToday === 1 ? '1 played today' : `${formattedCount} played today`;

  return (
    <div
      data-testid="landing-aux"
      className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 font-mono text-xs uppercase tracking-wider text-text-faint"
    >
      <span className="inline-flex items-center gap-1.5">
        <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-accent" />
        <span>
          daily resets <span data-testid="aux-countdown">{label}</span>
        </span>
      </span>
      <span aria-hidden="true">·</span>
      <span>{playedCopy}</span>
    </div>
  );
}
