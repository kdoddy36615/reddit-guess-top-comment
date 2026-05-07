import { forwardRef } from 'react';
import { cn } from '@/lib/cn';

export type CommentRank = 1 | 2 | 3;

export interface CommentCardProps extends React.HTMLAttributes<HTMLElement> {
  rank: CommentRank;
  user: string;
  upvotes: string;
  text: string;
}

export interface CommentReplyProps extends React.HTMLAttributes<HTMLElement> {
  user: string;
  upvotes: string;
  text: string;
}

function MetaRow({ rank, user, upvotes }: { rank?: CommentRank; user: string; upvotes: string }) {
  return (
    <div
      data-testid="comment-meta"
      className="flex flex-wrap items-center gap-x-2 font-mono text-xs text-text-muted"
    >
      {rank ? (
        <span
          className={cn(
            'inline-flex items-center rounded-pill border px-2 py-0.5 font-mono text-xs',
            rank === 1
              ? 'border-accent bg-accent-soft text-accent'
              : 'border-border-strong bg-surface text-text-muted',
          )}
        >
          #{rank}
        </span>
      ) : null}
      <span>u/{user}</span>
      <span aria-hidden="true" className="text-text-faint">
        ·
      </span>
      <span>
        {upvotes}
        <span aria-hidden="true">↑</span>
      </span>
    </div>
  );
}

export const CommentCard = forwardRef<HTMLElement, CommentCardProps>(function CommentCard(
  { rank, user, upvotes, text, className, children, ...props },
  ref,
) {
  return (
    <article
      ref={ref}
      data-variant="top"
      data-rank={rank}
      className={cn(
        'space-y-2 border-l-[3px] pl-[14px]',
        rank === 1 ? 'border-accent' : 'border-text-disabled',
        className,
      )}
      {...props}
    >
      <MetaRow rank={rank} user={user} upvotes={upvotes} />
      <p data-testid="comment-text" className="text-[16px] leading-snug text-text">
        {text}
      </p>
      {children ? <div className="space-y-2 pt-1">{children}</div> : null}
    </article>
  );
});

export const CommentReply = forwardRef<HTMLElement, CommentReplyProps>(function CommentReply(
  { user, upvotes, text, className, children, ...props },
  ref,
) {
  return (
    <article
      ref={ref}
      data-variant="reply"
      className={cn(
        'space-y-1.5 border-l-2 border-border-strong pl-[14px] transition-colors duration-[var(--duration-fast,120ms)] hover:border-text-faint',
        className,
      )}
      {...props}
    >
      <MetaRow user={user} upvotes={upvotes} />
      <p data-testid="comment-text" className="text-[16px] leading-snug text-text">
        {text}
      </p>
      {children ? <div className="space-y-1.5 pt-1">{children}</div> : null}
    </article>
  );
});
