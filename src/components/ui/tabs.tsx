'use client';

import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { cn } from '@/lib/cn';

interface TabsCtx {
  value: string;
  setValue: (v: string) => void;
  baseId: string;
  registerTrigger: (value: string, node: HTMLButtonElement | null) => void;
  focusAdjacent: (currentValue: string, dir: 1 | -1) => void;
}

const TabsContext = createContext<TabsCtx | null>(null);

function useTabsCtx(component: string) {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error(`<${component}> must be used inside <Tabs>`);
  return ctx;
}

export interface TabsProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
}

export const Tabs = forwardRef<HTMLDivElement, TabsProps>(function Tabs(
  { className, defaultValue, value: valueProp, onValueChange, children, ...props },
  ref,
) {
  const [internal, setInternal] = useState(defaultValue ?? '');
  const isControlled = valueProp !== undefined;
  const value = isControlled ? (valueProp as string) : internal;
  const baseId = useId();
  const triggersRef = useRef<Map<string, HTMLButtonElement>>(new Map());

  const setValue = useCallback(
    (next: string) => {
      if (!isControlled) setInternal(next);
      onValueChange?.(next);
    },
    [isControlled, onValueChange],
  );

  const registerTrigger = useCallback((triggerValue: string, node: HTMLButtonElement | null) => {
    if (node) triggersRef.current.set(triggerValue, node);
    else triggersRef.current.delete(triggerValue);
  }, []);

  const focusAdjacent = useCallback(
    (currentValue: string, dir: 1 | -1) => {
      const order = Array.from(triggersRef.current.keys());
      if (order.length === 0) return;
      const idx = order.indexOf(currentValue);
      const nextIdx = (idx + dir + order.length) % order.length;
      const nextValue = order[nextIdx];
      const node = triggersRef.current.get(nextValue);
      if (node) node.focus();
      setValue(nextValue);
    },
    [setValue],
  );

  const ctx = useMemo<TabsCtx>(
    () => ({ value, setValue, baseId, registerTrigger, focusAdjacent }),
    [value, setValue, baseId, registerTrigger, focusAdjacent],
  );

  return (
    <TabsContext.Provider value={ctx}>
      <div ref={ref} className={cn('w-full', className)} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
});

export interface TabsListProps extends React.HTMLAttributes<HTMLDivElement> {}

export const TabsList = forwardRef<HTMLDivElement, TabsListProps>(function TabsList(
  { className, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      role="tablist"
      className={cn('inline-flex flex-wrap items-center gap-2', className)}
      {...props}
    />
  );
});

export interface TabsTriggerProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'value'> {
  value: string;
}

export const TabsTrigger = forwardRef<HTMLButtonElement, TabsTriggerProps>(function TabsTrigger(
  { value, className, onClick, onKeyDown, ...props },
  ref,
) {
  const ctx = useTabsCtx('TabsTrigger');
  const active = ctx.value === value;
  const localRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    ctx.registerTrigger(value, localRef.current);
    return () => ctx.registerTrigger(value, null);
  }, [ctx, value]);

  return (
    <button
      type="button"
      ref={(node) => {
        localRef.current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) ref.current = node;
      }}
      role="tab"
      id={`${ctx.baseId}-trigger-${value}`}
      aria-selected={active}
      aria-controls={`${ctx.baseId}-panel-${value}`}
      tabIndex={active ? 0 : -1}
      onClick={(e) => {
        ctx.setValue(value);
        onClick?.(e);
      }}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          ctx.focusAdjacent(value, 1);
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          ctx.focusAdjacent(value, -1);
        }
        onKeyDown?.(e);
      }}
      className={cn(
        'inline-flex items-center justify-center rounded-pill border px-3 py-1.5 font-medium text-sm transition-colors duration-[var(--duration-fast,120ms)] ease-[var(--ease-out)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:pointer-events-none disabled:opacity-50',
        active
          ? 'bg-accent-soft text-accent border-accent'
          : 'bg-surface text-text-muted border-border-strong hover:bg-surface-2 hover:text-text',
        className,
      )}
      {...props}
    />
  );
});

export interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

export const TabsContent = forwardRef<HTMLDivElement, TabsContentProps>(function TabsContent(
  { value, className, ...props },
  ref,
) {
  const ctx = useTabsCtx('TabsContent');
  const active = ctx.value === value;
  if (!active) return null;
  return (
    <div
      ref={ref}
      role="tabpanel"
      id={`${ctx.baseId}-panel-${value}`}
      aria-labelledby={`${ctx.baseId}-trigger-${value}`}
      className={cn('mt-3 focus-visible:outline-none', className)}
      {...props}
    />
  );
});
