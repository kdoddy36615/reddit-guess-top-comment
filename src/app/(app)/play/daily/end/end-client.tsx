'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import { formatResetsIn } from '@/lib/format/resets-in';
import type { ReactionBand } from '@/scoring/reaction';

const BAND_COLOR_VAR: Record<ReactionBand, string> = {
  bullseye: 'var(--color-success)',
  close: 'var(--color-accent-2)',
  almost: 'var(--color-accent)',
  way_off: 'var(--color-danger)',
};

export type EndClientRound = {
  /** 1-based round index. */
  index: number;
  subreddit: string;
  guess: string;
  score: number;
  band: ReactionBand;
};

export interface EndClientProps {
  /** YYYY-MM-DD label for the daily eyebrow + countdown anchor. */
  dateLabel: string;
  totalScore: number;
  /** 1-based rank on today's daily board. */
  rank: number;
  /** Distinct players on today's daily board. */
  totalPlayers: number;
  rounds: EndClientRound[];
  streak: { count: number; active: boolean };
  /** ISO timestamp seeding the next-daily countdown. */
  initialNow: string;
  /**
   * True on the redirect from /play/daily after a fresh finalize. Drives the
   * score-up + staggered fade-up animations. False on revisits — DESIGN.md §5
   * says "revisit state does not play animations".
   */
  justFinished: boolean;
}

function NextDailyCountdown({ initialNow }: { initialNow: string }) {
  const [label, setLabel] = useState(() => formatResetsIn(new Date(initialNow)));
  useEffect(() => {
    const id = setInterval(() => setLabel(formatResetsIn(new Date())), 30_000);
    return () => clearInterval(id);
  }, []);
  return (
    <span
      data-testid="daily-next-countdown"
      className="font-mono text-sm text-text-muted tabular-nums"
    >
      next daily {label}
    </span>
  );
}

export function EndClient({
  dateLabel,
  totalScore,
  rank,
  totalPlayers,
  rounds,
  streak,
  initialNow,
  justFinished,
}: EndClientProps) {
  return (
    <section
      data-testid="daily-end"
      data-just-finished={justFinished ? 'true' : 'false'}
      className="space-y-8 py-10"
    >
      <header className="space-y-3 text-center">
        <p className="font-mono text-xs uppercase tracking-wider text-text-faint">
          daily complete · {dateLabel}
        </p>
        <p className="font-display text-lg italic text-text-muted">nice run.</p>
        <p
          data-testid="daily-total-score"
          className={cn(
            'font-display font-bold leading-none tabular-nums text-accent',
            'text-[72px] md:text-[96px]',
            justFinished && 'motion-safe:animate-score-up',
          )}
          style={{ ['--band-color' as string]: 'var(--color-accent)' }}
          aria-live="polite"
        >
          <span className="sr-only">your total score: </span>
          {totalScore}
        </p>
        <p
          data-testid="daily-rank"
          className="font-mono text-xs uppercase tracking-wider text-text-faint"
        >
          total · rank {rank.toLocaleString()} of {totalPlayers.toLocaleString()} today
        </p>
        <svg
          aria-hidden="true"
          viewBox="0 0 96 12"
          className="mx-auto block h-3 w-24 text-text-faint"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        >
          <path d="M2 6 Q 14 1, 26 6 T 50 6 T 74 6 T 94 6" />
        </svg>
      </header>

      <section className="space-y-2">
        <h2 className="font-mono text-xs uppercase tracking-wider text-text-faint">
          round-by-round
        </h2>
        <ol className="space-y-2">
          {rounds.map((r, i) => (
            <li
              key={r.index}
              data-testid="daily-round-row"
              data-band={r.band}
              className={cn(
                'flex items-center gap-3 rounded-md bg-surface-2 px-3 py-3',
                'border-l-[3px] border-solid',
                justFinished && 'motion-safe:animate-fade-in',
              )}
              style={{
                ['--band-color' as string]: BAND_COLOR_VAR[r.band],
                borderLeftColor: BAND_COLOR_VAR[r.band],
                animationDelay: justFinished ? `${i * 80}ms` : undefined,
              }}
            >
              <span className="font-mono text-sm text-text-faint tabular-nums">
                {String(r.index).padStart(2, '0')}
              </span>
              <span className="font-mono text-sm text-accent">r/{r.subreddit}</span>
              <span
                className="min-w-0 flex-1 truncate font-hand text-md text-text-muted"
                title={r.guess}
              >
                &ldquo;{r.guess}&rdquo;
              </span>
              <span
                className="font-display font-semibold tabular-nums"
                style={{ color: BAND_COLOR_VAR[r.band] }}
              >
                {r.score}
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section
        data-testid="daily-streak"
        className="flex items-center justify-between rounded-lg border border-accent-2-soft bg-accent-2-soft/40 px-4 py-3"
      >
        <p className="font-display text-md font-semibold text-accent-2">
          {streak.count} {streak.count === 1 ? 'day' : 'days'}
          {streak.active ? (
            <span role="img" aria-label="active streak" className="ml-2 motion-safe:animate-pulse">
              🔥
            </span>
          ) : null}
        </p>
        <NextDailyCountdown initialNow={initialNow} />
      </section>

      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center">
        <Link
          href="/leaderboard"
          data-testid="daily-end-see-leaderboard"
          className={buttonVariants({ variant: 'secondary', size: 'md' })}
        >
          see leaderboard
        </Link>
        <Link
          href="/play/solo"
          data-testid="daily-end-play-unlimited"
          className={buttonVariants({ variant: 'primary', size: 'md' })}
        >
          play unlimited →
        </Link>
      </div>
    </section>
  );
}
