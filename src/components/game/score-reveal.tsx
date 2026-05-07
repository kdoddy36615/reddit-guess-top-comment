import { forwardRef } from 'react';
import { cn } from '@/lib/cn';
import type { ReactionBand } from '@/scoring/reaction';

const BAND_COLOR_VAR: Record<ReactionBand, string> = {
  bullseye: 'var(--color-success)',
  close: 'var(--color-accent-2)',
  almost: 'var(--color-accent)',
  way_off: 'var(--color-danger)',
};

export interface ScoreRevealProps extends React.HTMLAttributes<HTMLDivElement> {
  guess: string;
  score: number;
  band: ReactionBand;
  matchedRank?: number;
}

export const ScoreReveal = forwardRef<HTMLDivElement, ScoreRevealProps>(function ScoreReveal(
  { guess, score, band, matchedRank, className, style, ...props },
  ref,
) {
  const bandColor = BAND_COLOR_VAR[band];
  return (
    <div
      ref={ref}
      data-testid="score-reveal"
      data-band={band}
      className={cn(
        'flex items-start justify-between gap-4 rounded-lg border border-accent-2-soft bg-gradient-to-b from-accent-2-soft to-transparent p-5',
        'motion-safe:animate-fade-in',
        className,
      )}
      style={{ ...style, ['--band-color' as string]: bandColor }}
      {...props}
    >
      <div className="min-w-0 flex-1 space-y-2">
        <p className="font-mono text-xs uppercase tracking-wider text-accent-2">your guess</p>
        <p
          data-testid="score-reveal-quote"
          className="break-words font-hand text-lg leading-snug text-text"
        >
          &ldquo;{guess}&rdquo;
        </p>
      </div>
      <div className="flex flex-col items-end gap-1.5">
        <span
          data-testid="score-reveal-number"
          aria-live="polite"
          className={cn(
            'font-display font-bold tabular-nums',
            'text-[42px] md:text-[56px] leading-none',
            'motion-safe:animate-score-up',
          )}
          style={{ color: 'var(--band-color)' }}
        >
          <span className="sr-only">your score: </span>
          {score}
        </span>
        {matchedRank !== undefined ? (
          <span data-testid="score-reveal-meta" className="font-mono text-xs text-text-muted">
            matched #{matchedRank}
          </span>
        ) : null}
      </div>
    </div>
  );
});
