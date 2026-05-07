'use client';

import { forwardRef, useId } from 'react';
import { cn } from '@/lib/cn';

export interface GuessInputProps
  extends Omit<
    React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    'value' | 'onChange' | 'onSubmit'
  > {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  submitting?: boolean;
  error?: string | null;
}

const baseTextareaClasses =
  'w-full bg-surface-3 border rounded-md px-4 py-3 text-text placeholder:text-text-faint resize-none min-h-[86px] font-hand text-lg leading-snug pr-12 focus:outline-none focus:shadow-[var(--shadow-glow)] focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg transition-[border-color,box-shadow] duration-[var(--duration-base,200ms)] disabled:opacity-50 disabled:cursor-not-allowed';

function SubmitIcon() {
  return (
    <svg
      data-testid="guess-input-submit-icon"
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
    >
      <path d="M4 10h12" />
      <path d="m11 5 5 5-5 5" />
    </svg>
  );
}

function Spinner() {
  return (
    <span
      data-testid="guess-input-spinner"
      aria-hidden="true"
      className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent"
    />
  );
}

export const GuessInput = forwardRef<HTMLTextAreaElement, GuessInputProps>(function GuessInput(
  {
    value,
    onChange,
    onSubmit,
    submitting = false,
    error,
    disabled,
    placeholder = 'what do you think the top comment said?',
    className,
    onKeyDown,
    id,
    ...props
  },
  ref,
) {
  const reactId = useId();
  const textareaId = id ?? `guess-input-${reactId}`;
  const errorId = `${textareaId}-error`;
  const hasError = Boolean(error);
  const isDisabled = disabled || submitting;

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey) && !submitting) {
      event.preventDefault();
      onSubmit(value);
    }
  }

  return (
    <div
      data-testid="guess-input"
      aria-busy={submitting || undefined}
      className={cn('space-y-2', className)}
    >
      <div className="relative">
        <textarea
          ref={ref}
          id={textareaId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isDisabled}
          aria-invalid={hasError || undefined}
          aria-describedby={hasError ? errorId : undefined}
          placeholder={placeholder}
          className={cn(
            baseTextareaClasses,
            hasError
              ? 'border-danger focus:border-danger'
              : 'border-border-strong focus:border-accent',
          )}
          {...props}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-text-muted"
        >
          {submitting ? <Spinner /> : <SubmitIcon />}
        </div>
      </div>

      {hasError ? (
        <p id={errorId} data-testid="guess-input-error" className="font-mono text-xs text-danger">
          {error}
        </p>
      ) : null}

      <p
        data-testid="guess-input-hint"
        className="flex items-center gap-1.5 font-mono text-xs text-text-faint"
      >
        <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded-sm border border-border-strong bg-surface px-1 text-[11px] text-text-muted">
          ⌘
        </kbd>
        <span aria-hidden="true">+</span>
        <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded-sm border border-border-strong bg-surface px-1 text-[11px] text-text-muted">
          ↵
        </kbd>
        <span>to submit</span>
      </p>
    </div>
  );
});
