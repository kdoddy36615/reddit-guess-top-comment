'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/cn';

export type ToastVariant = 'default' | 'error';

export interface ToastInput {
  title: string;
  description?: string;
  variant?: ToastVariant;
  durationMs?: number;
}

interface ToastItem extends ToastInput {
  id: string;
  variant: ToastVariant;
  durationMs: number;
}

const DEFAULT_DURATION_MS = 4000;
const ERROR_DURATION_MS = 6000;

type Listener = (toasts: ToastItem[]) => void;

let toasts: ToastItem[] = [];
const listeners = new Set<Listener>();

function emit() {
  for (const l of listeners) l(toasts);
}

function add(input: ToastInput): string {
  const id = `t_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const variant: ToastVariant = input.variant ?? 'default';
  const durationMs =
    input.durationMs ?? (variant === 'error' ? ERROR_DURATION_MS : DEFAULT_DURATION_MS);
  toasts = [...toasts, { ...input, id, variant, durationMs }];
  emit();
  return id;
}

function dismiss(id: string) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

/** Test-only: clear any pending toasts. Not intended for product code. */
export function __resetToasts() {
  toasts = [];
  emit();
}

export function useToast() {
  return {
    toast: (input: ToastInput) => add(input),
    dismiss,
  };
}

function useToastSubscription() {
  const [items, setItems] = useState<ToastItem[]>(() => toasts);
  useEffect(() => {
    const listener: Listener = (next) => setItems(next);
    listeners.add(listener);
    listener(toasts);
    return () => {
      listeners.delete(listener);
    };
  }, []);
  return items;
}

function ToastView({ item }: { item: ToastItem }) {
  useEffect(() => {
    const timer = setTimeout(() => dismiss(item.id), item.durationMs);
    return () => clearTimeout(timer);
  }, [item.id, item.durationMs]);

  return (
    <div
      data-toast-item
      role={item.variant === 'error' ? 'alert' : 'status'}
      className={cn(
        'pointer-events-auto w-full max-w-sm rounded-lg border border-border-strong bg-surface-2 px-4 py-3 text-text shadow-[var(--shadow-md)]',
        'motion-safe:animate-[toast-in_var(--duration-base,200ms)_var(--ease-out)]',
        item.variant === 'error' && 'border-danger/60',
      )}
    >
      <p
        className={cn(
          'font-medium text-sm leading-snug',
          item.variant === 'error' ? 'text-danger' : 'text-text',
        )}
      >
        {item.title}
      </p>
      {item.description ? (
        <p className="mt-1 text-text-muted text-xs leading-snug">{item.description}</p>
      ) : null}
    </div>
  );
}

export function Toaster() {
  const items = useToastSubscription();
  return (
    <section
      aria-label="Notifications"
      aria-live="polite"
      className={cn(
        'pointer-events-none fixed z-50 flex flex-col gap-2',
        // mobile: bottom-center
        'bottom-4 left-1/2 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2',
        // desktop: top-right
        'sm:top-4 sm:right-4 sm:bottom-auto sm:left-auto sm:w-auto sm:translate-x-0',
      )}
    >
      {items.map((item) => (
        <ToastView key={item.id} item={item} />
      ))}
    </section>
  );
}
