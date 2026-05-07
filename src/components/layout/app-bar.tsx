import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface AppBarProps {
  title?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function AppBar({ title, actions, className }: AppBarProps) {
  return (
    <header
      className={cn(
        'sticky top-0 z-40 h-14 border-b border-border bg-surface/70 backdrop-blur',
        // Reduced-motion users skip the backdrop fade-in; everyone else gets a 200ms ease-out.
        'motion-safe:transition-[backdrop-filter,background-color] motion-safe:duration-[var(--duration-base)] motion-safe:ease-[var(--ease-out)]',
        className,
      )}
    >
      <div className="mx-auto flex h-full w-full max-w-content items-center gap-4 px-4 md:px-6">
        <div className="flex min-w-0 flex-1 items-center">
          <BrandMark />
        </div>
        <div className="flex min-w-0 flex-1 items-center justify-center text-center font-display text-base font-semibold text-text">
          {title}
        </div>
        <div
          data-testid="app-bar-avatar-slot"
          className="flex min-w-0 flex-1 items-center justify-end"
        >
          {actions}
        </div>
      </div>
    </header>
  );
}

function BrandMark() {
  return (
    <Link
      href="/"
      className="inline-flex items-center gap-2 rounded-md text-text outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
    >
      <span aria-hidden="true" className="text-accent text-lg leading-none">
        ◆
      </span>
      <span className="font-display text-md font-semibold tracking-tight">guesstop</span>
    </Link>
  );
}
