'use client';

import { cloneElement, isValidElement, useEffect, useId, useRef, useState } from 'react';
import { cn } from '@/lib/cn';

export interface TooltipProps {
  content: React.ReactNode;
  /** Hover-open delay in ms. Default 400 per DESIGN.md §2. */
  delayMs?: number;
  /** Side relative to the trigger. */
  side?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
  children: React.ReactElement<{
    onMouseEnter?: React.MouseEventHandler;
    onMouseLeave?: React.MouseEventHandler;
    onFocus?: React.FocusEventHandler;
    onBlur?: React.FocusEventHandler;
    'aria-describedby'?: string;
  }>;
}

const SIDE_CLASS: Record<NonNullable<TooltipProps['side']>, string> = {
  top: 'bottom-full left-1/2 mb-2 -translate-x-1/2',
  bottom: 'top-full left-1/2 mt-2 -translate-x-1/2',
  left: 'right-full top-1/2 mr-2 -translate-y-1/2',
  right: 'left-full top-1/2 ml-2 -translate-y-1/2',
};

export function Tooltip({
  content,
  delayMs = 400,
  side = 'top',
  className,
  children,
}: TooltipProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const openAfterDelay = (delay: number) => {
    clearTimer();
    if (delay <= 0) {
      setOpen(true);
      return;
    }
    timer.current = setTimeout(() => setOpen(true), delay);
  };

  const close = () => {
    clearTimer();
    setOpen(false);
  };

  if (!isValidElement(children)) {
    throw new Error('<Tooltip> requires a single React element child');
  }

  const childProps = (children as React.ReactElement<Record<string, unknown>>).props as {
    onMouseEnter?: React.MouseEventHandler;
    onMouseLeave?: React.MouseEventHandler;
    onFocus?: React.FocusEventHandler;
    onBlur?: React.FocusEventHandler;
    'aria-describedby'?: string;
  };

  const trigger = cloneElement(children, {
    onMouseEnter: (e: React.MouseEvent) => {
      childProps.onMouseEnter?.(e);
      openAfterDelay(delayMs);
    },
    onMouseLeave: (e: React.MouseEvent) => {
      childProps.onMouseLeave?.(e);
      close();
    },
    onFocus: (e: React.FocusEvent) => {
      childProps.onFocus?.(e);
      openAfterDelay(0);
    },
    onBlur: (e: React.FocusEvent) => {
      childProps.onBlur?.(e);
      close();
    },
    'aria-describedby': open ? id : childProps['aria-describedby'],
  });

  return (
    <span className="relative inline-flex">
      {trigger}
      {open ? (
        <span
          role="tooltip"
          id={id}
          className={cn(
            'pointer-events-none absolute z-40 whitespace-nowrap rounded-md border border-border-strong bg-surface-2 px-2 py-1 text-text-muted text-xs shadow-[var(--shadow-sm)]',
            'motion-safe:animate-[tooltip-in_var(--duration-fast,120ms)_var(--ease-out)]',
            SIDE_CLASS[side],
            className,
          )}
        >
          {content}
        </span>
      ) : null}
    </span>
  );
}
