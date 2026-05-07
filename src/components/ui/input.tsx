import { forwardRef } from 'react';
import { cn } from '@/lib/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

const baseClasses =
  'w-full bg-surface-3 border rounded-md px-4 py-3 text-base text-text placeholder:text-text-faint focus:outline-none focus:shadow-[var(--shadow-glow)] focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg transition-[border-color,box-shadow] duration-[var(--duration-base,200ms)] disabled:opacity-50 disabled:cursor-not-allowed';

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, error, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      aria-invalid={error || undefined}
      className={cn(
        baseClasses,
        error ? 'border-danger focus:border-danger' : 'border-border-strong focus:border-accent',
        className,
      )}
      {...props}
    />
  );
});
