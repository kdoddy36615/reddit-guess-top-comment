'use client';

import { createContext, forwardRef, useContext, useEffect, useId, useRef } from 'react';
import { cn } from '@/lib/cn';

interface DialogCtx {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  labelId: string;
  descriptionId: string;
}

const DialogContext = createContext<DialogCtx | null>(null);

function useDialogCtx() {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error('Dialog subcomponent used outside of <Dialog>');
  return ctx;
}

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  const labelId = useId();
  const descriptionId = useId();
  return (
    <DialogContext.Provider value={{ open, onOpenChange, labelId, descriptionId }}>
      {children}
    </DialogContext.Provider>
  );
}

export interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {}

export const DialogContent = forwardRef<HTMLDivElement, DialogContentProps>(function DialogContent(
  { className, children, ...props },
  ref,
) {
  const ctx = useDialogCtx();
  const { open, onOpenChange } = ctx;
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: open transition only
  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = (document.activeElement as HTMLElement) ?? null;
    const node = contentRef.current;
    if (node) {
      const focusable = node.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      (focusable ?? node).focus();
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onOpenChange(false);
      }
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      previouslyFocused.current?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center px-4',
        'motion-safe:animate-[dialog-overlay-in_var(--duration-base,200ms)_var(--ease-out)]',
      )}
    >
      <button
        type="button"
        data-testid="dialog-overlay"
        aria-label="close dialog"
        onClick={() => onOpenChange(false)}
        className="absolute inset-0 bg-bg/80 backdrop-blur-sm"
      />
      <div
        ref={(node) => {
          contentRef.current = node;
          if (typeof ref === 'function') ref(node);
          else if (ref) ref.current = node;
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={ctx.labelId}
        aria-describedby={ctx.descriptionId}
        tabIndex={-1}
        className={cn(
          'relative w-full max-w-md rounded-xl border border-border-strong bg-surface-2 p-6 text-text shadow-[var(--shadow-md)] outline-none',
          'motion-safe:animate-[dialog-content-in_var(--duration-base,200ms)_var(--ease-out)]',
          className,
        )}
        {...props}
      >
        {children}
      </div>
    </div>
  );
});

export interface DialogTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}

export const DialogTitle = forwardRef<HTMLHeadingElement, DialogTitleProps>(function DialogTitle(
  { className, id, ...props },
  ref,
) {
  const ctx = useDialogCtx();
  return (
    <h2
      ref={ref}
      id={id ?? ctx.labelId}
      className={cn('font-display text-lg font-semibold leading-tight text-text', className)}
      {...props}
    />
  );
});

export interface DialogDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}

export const DialogDescription = forwardRef<HTMLParagraphElement, DialogDescriptionProps>(
  function DialogDescription({ className, id, ...props }, ref) {
    const ctx = useDialogCtx();
    return (
      <p
        ref={ref}
        id={id ?? ctx.descriptionId}
        className={cn('mt-2 text-sm text-text-muted', className)}
        {...props}
      />
    );
  },
);
