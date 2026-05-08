'use client';

import { forwardRef, useEffect, useState } from 'react';
import { cn } from '@/lib/cn';

export type RoundTimerState = 'active' | 'expiring' | 'expired';

export interface RoundTimerProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
  /** Server-provided round end timestamp (ms epoch). Authoritative. */
  endsAt: number;
  /** Total round duration in seconds — controls the ring fill ratio. */
  durationSeconds: number;
  /** Highlights the ring with accent-2 (the 'you' / personal-progress color). */
  variant?: 'default' | 'you';
}

const RING_RADIUS = 18;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const SVG_SIZE = 44;
const TICK_MS = 200;

function computeState(remaining: number): RoundTimerState {
  if (remaining <= 0) return 'expired';
  if (remaining <= 5) return 'expiring';
  return 'active';
}

function computeRemaining(endsAt: number, now: number): number {
  return Math.max(0, Math.ceil((endsAt - now) / 1000));
}

export const RoundTimer = forwardRef<HTMLDivElement, RoundTimerProps>(function RoundTimer(
  { endsAt, durationSeconds, variant = 'default', className, ...props },
  ref,
) {
  const [now, setNow] = useState(() => Date.now());
  const remaining = computeRemaining(endsAt, now);
  const state = computeState(remaining);

  useEffect(() => {
    if (state === 'expired') return;
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, [state]);

  const ratio = Math.min(1, Math.max(0, remaining / Math.max(1, durationSeconds)));
  const dashoffset = RING_CIRCUMFERENCE * (1 - ratio);

  const ringStrokeClass =
    variant === 'you'
      ? 'stroke-accent-2'
      : state === 'active'
        ? 'stroke-accent'
        : state === 'expiring'
          ? 'stroke-warning'
          : 'stroke-danger';

  const readoutClass =
    state === 'active'
      ? variant === 'you'
        ? 'text-accent-2'
        : 'text-text'
      : state === 'expiring'
        ? 'text-warning'
        : 'text-danger';

  return (
    <div
      ref={ref}
      data-testid="round-timer"
      data-state={state}
      data-variant={variant}
      role="timer"
      aria-label={`round timer: ${remaining}s remaining`}
      aria-live="off"
      className={cn(
        'relative inline-flex items-center justify-center',
        // Pulse only in expiring state and only when motion is allowed. Reduced-
        // motion users get the color change but no pulse — DESIGN.md §5/§6.
        state === 'expiring' && 'motion-safe:animate-pulse',
        className,
      )}
      style={{ width: SVG_SIZE, height: SVG_SIZE }}
      {...props}
    >
      <svg
        aria-hidden="true"
        width={SVG_SIZE}
        height={SVG_SIZE}
        viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
        className="-rotate-90"
      >
        <circle
          cx={SVG_SIZE / 2}
          cy={SVG_SIZE / 2}
          r={RING_RADIUS}
          fill="none"
          strokeWidth={3}
          className="stroke-border-strong"
        />
        <circle
          data-testid="round-timer-ring"
          cx={SVG_SIZE / 2}
          cy={SVG_SIZE / 2}
          r={RING_RADIUS}
          fill="none"
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeDashoffset={dashoffset}
          className={cn(
            ringStrokeClass,
            'motion-safe:transition-[stroke-dashoffset] motion-safe:duration-200 motion-safe:ease-linear',
          )}
        />
      </svg>
      <span
        data-testid="round-timer-readout"
        className={cn(
          'absolute inset-0 flex items-center justify-center font-mono text-xs tabular-nums',
          readoutClass,
        )}
      >
        {remaining}
      </span>
    </div>
  );
});
