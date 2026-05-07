import { forwardRef } from 'react';
import { cn } from '@/lib/cn';

export interface RoundCardProps extends React.HTMLAttributes<HTMLElement> {
  subreddit: string;
  age: string;
  upvotes: string;
  title: string;
  body?: string;
  imageUrl?: string | null;
}

const STRIPE_PATTERN =
  'repeating-linear-gradient(45deg, transparent 0 8px, rgba(246, 239, 225, 0.06) 8px 9px)';

export const RoundCard = forwardRef<HTMLElement, RoundCardProps>(function RoundCard(
  { subreddit, age, upvotes, title, body, imageUrl, className, ...props },
  ref,
) {
  return (
    <article
      ref={ref}
      className={cn('space-y-3 rounded-lg border border-border bg-surface-2 p-5', className)}
      {...props}
    >
      <header className="flex flex-wrap items-center gap-x-2 font-mono text-xs text-text-muted">
        <span className="text-accent">r/{subreddit}</span>
        <span aria-hidden="true" className="text-text-faint">
          ·
        </span>
        <span>{age}</span>
        <span aria-hidden="true" className="text-text-faint">
          ·
        </span>
        <span>
          {upvotes}
          <span aria-hidden="true">↑</span>
        </span>
      </header>
      <h2 className="text-balance font-display text-[19px] font-semibold leading-tight text-text md:text-xl">
        {title}
      </h2>
      {body ? (
        <p data-testid="round-card-body" className="text-[14px] leading-[1.4] text-text-muted">
          {body}
        </p>
      ) : null}
      {imageUrl ? (
        <div
          data-testid="round-card-image"
          aria-hidden="true"
          className="aspect-[16/9] w-full overflow-hidden rounded-md border border-border bg-surface-3"
          style={{ backgroundImage: STRIPE_PATTERN }}
        />
      ) : null}
    </article>
  );
});
