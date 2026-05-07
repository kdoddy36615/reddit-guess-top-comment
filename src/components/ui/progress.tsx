import { forwardRef } from 'react';
import { cn } from '@/lib/cn';

type PipState = 'done' | 'now' | 'pending';

const PIP_CLASS: Record<PipState, string> = {
  done: 'bg-accent',
  now: 'bg-text-muted',
  pending: 'bg-text-disabled',
};

export interface ProgressProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
  /** 1-based index of the in-progress round. */
  current: number;
  /** Default 5 to match the daily session length. */
  total?: number;
}

export const Progress = forwardRef<HTMLDivElement, ProgressProps>(function Progress(
  { className, current, total = 5, ...props },
  ref,
) {
  const clampedCurrent = Math.min(Math.max(1, Math.floor(current)), total);
  return (
    <div
      ref={ref}
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={total}
      aria-valuenow={clampedCurrent}
      className={cn('inline-flex items-center gap-1.5', className)}
      {...props}
    >
      {Array.from({ length: total }, (_, i) => {
        const idx = i + 1;
        const state: PipState =
          idx < clampedCurrent ? 'done' : idx === clampedCurrent ? 'now' : 'pending';
        return (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: pip positions are stable — a fixed-length progress strip
            key={i}
            data-testid="pip"
            data-state={state}
            className={cn('h-1 w-[18px] rounded-sm', PIP_CLASS[state])}
          />
        );
      })}
    </div>
  );
});
