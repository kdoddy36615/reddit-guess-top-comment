import { forwardRef } from 'react';
import { Avatar } from '@/components/ui/avatar';
import { cn } from '@/lib/cn';

export type LeaderboardRowVariant = 'default' | 'you';

export interface LeaderboardRowProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'slot'> {
  rank: number;
  name: string;
  score: number | string;
  variant?: LeaderboardRowVariant;
  /** Avatar palette slot (ignored when variant === 'you'). */
  slot?: number;
  /** Optional avatar image src. */
  avatarSrc?: string;
  avatarAlt?: string;
}

export const LeaderboardRow = forwardRef<HTMLDivElement, LeaderboardRowProps>(
  function LeaderboardRow(
    {
      rank,
      name,
      score,
      variant = 'default',
      slot,
      avatarSrc,
      avatarAlt,
      className,
      style,
      ...props
    },
    ref,
  ) {
    const isYou = variant === 'you';
    return (
      <div
        ref={ref}
        data-variant={variant}
        className={cn(
          'grid items-center gap-3 rounded-md px-[12px] py-[10px]',
          isYou ? 'bg-accent-2-soft' : 'bg-surface-2',
          className,
        )}
        style={{ gridTemplateColumns: '36px 28px 1fr auto', ...style }}
        {...props}
      >
        <span
          data-testid="leaderboard-rank"
          className={cn('font-mono text-sm tabular-nums', isYou ? 'text-accent-2' : 'text-text')}
        >
          {rank}
        </span>
        <Avatar
          name={name}
          size="sm"
          variant={isYou ? 'you' : 'default'}
          slot={isYou ? undefined : slot}
          src={avatarSrc}
          alt={avatarAlt}
          className="h-7 w-7"
        />
        <span data-testid="leaderboard-name" className="truncate text-sm text-text" title={name}>
          {name}
        </span>
        <span
          data-testid="leaderboard-score"
          className={cn('font-mono text-sm tabular-nums', isYou ? 'text-accent-2' : 'text-text')}
        >
          {score}
        </span>
      </div>
    );
  },
);
