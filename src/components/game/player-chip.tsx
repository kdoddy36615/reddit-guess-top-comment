import { forwardRef } from 'react';
import { Avatar } from '@/components/ui/avatar';
import { cn } from '@/lib/cn';

export type PlayerChipState = 'typing' | 'submitted' | 'disconnected' | 'kicked';

export interface PlayerChipProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'slot'> {
  name: string;
  state: PlayerChipState;
  /** Highlights the chip as the current viewer (accent-2). */
  isYou?: boolean;
  /** Avatar palette slot (ignored when isYou). */
  slot?: number;
  avatarSrc?: string;
}

const STATE_LABEL: Record<PlayerChipState, string> = {
  typing: 'still typing',
  submitted: 'submitted',
  disconnected: 'disconnected',
  kicked: 'kicked',
};

const STATE_BADGE_CLASS: Record<PlayerChipState, string> = {
  typing: 'text-text-muted',
  submitted: 'text-success',
  disconnected: 'text-text-faint',
  kicked: 'text-danger',
};

const STATE_CHIP_CLASS: Record<PlayerChipState, string> = {
  typing: 'border-border-strong bg-surface',
  // Submitted: success-tinted border, full opacity. Motion-safe transition for
  // the typing→submitted flip per DESIGN.md §5 (border + opacity 200ms ease-out).
  submitted:
    'border-success bg-surface motion-safe:transition-[border-color,opacity] motion-safe:duration-200 motion-safe:ease-[var(--ease-out)]',
  disconnected: 'border-border-strong bg-surface opacity-60',
  kicked: 'border-danger/60 bg-surface text-danger opacity-50 line-through',
};

export const PlayerChip = forwardRef<HTMLSpanElement, PlayerChipProps>(function PlayerChip(
  { name, state, isYou, slot, avatarSrc, className, ...props },
  ref,
) {
  const ariaLabel = `${name}, ${STATE_LABEL[state]}`;
  return (
    // biome-ignore lint/a11y/useAriaPropsSupportedByRole: chip is a self-contained labelled visual unit per DESIGN.md §6 (`aria-label="kev, submitted"`); flattening to one accessible name is the spec'd a11y behavior
    <span
      ref={ref}
      data-testid="player-chip"
      data-state={state}
      data-variant={isYou ? 'you' : 'default'}
      aria-label={ariaLabel}
      className={cn(
        'inline-flex items-center gap-2 rounded-pill border px-2.5 py-1 font-mono text-xs',
        STATE_CHIP_CLASS[state],
        isYou && 'border-accent-2/60 bg-accent-2-soft',
        className,
      )}
      {...props}
    >
      <Avatar
        size="sm"
        name={name}
        variant={isYou ? 'you' : 'default'}
        slot={isYou ? undefined : slot}
        src={avatarSrc}
        alt={name}
      />
      <span data-testid="player-chip-name" className={cn('text-text', isYou && 'text-accent-2')}>
        {name}
      </span>
      <span
        data-testid="player-chip-state"
        aria-hidden="true"
        className={cn('text-[0.65rem]', STATE_BADGE_CLASS[state])}
      >
        {STATE_LABEL[state]}
      </span>
    </span>
  );
});
