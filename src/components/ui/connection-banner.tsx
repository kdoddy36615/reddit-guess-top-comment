import { cn } from '@/lib/cn';
import type { ConnectionStatus } from '@/lib/realtime';

export interface ConnectionBannerProps {
  status: ConnectionStatus;
  /** Reconnect attempt count, surfaced in the reconnecting message. */
  attempt?: number;
  /** Override the default copy. */
  message?: string;
  className?: string;
}

function defaultMessage(status: ConnectionStatus, attempt?: number): string {
  if (status === 'reconnecting') {
    return attempt && attempt > 0 ? `reconnecting… (attempt ${attempt})` : 'reconnecting…';
  }
  return 'connection lost — trying to reach the room';
}

export function ConnectionBanner({ status, attempt, message, className }: ConnectionBannerProps) {
  if (status === 'live') return null;

  const isDanger = status === 'disconnected';
  const text = message ?? defaultMessage(status, attempt);

  return (
    <div
      data-connection-banner
      data-status={status}
      role={isDanger ? 'alert' : 'status'}
      aria-live={isDanger ? 'assertive' : 'polite'}
      className={cn(
        'fixed top-0 right-0 left-0 z-50 flex items-center justify-center gap-2 border-b px-4 py-2 text-center font-mono text-xs',
        // Motion-safe slide-in; reduced-motion users see the banner appear
        // statically (no transform). DESIGN.md §"/r/[code]".
        'motion-safe:animate-[banner-in_220ms_var(--ease-out)]',
        isDanger
          ? 'border-danger/60 bg-surface-2 text-danger'
          : 'border-warning/60 bg-surface-2 text-warning',
        className,
      )}
    >
      <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-current" />
      <span>{text}</span>
    </div>
  );
}
