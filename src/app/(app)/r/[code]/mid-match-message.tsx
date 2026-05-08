import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { RoomStatus } from '@/db/rooms';

export interface MidMatchMessageProps {
  status: Extract<RoomStatus, 'live' | 'ended'>;
  code: string;
}

/**
 * Mid-match-join landing card. Per DESIGN.md §"/r/[code]", players who hit a
 * room URL after the match has started see "match in progress"; after the
 * match has ended they see "match over". No game state is leaked — this is a
 * static informational screen.
 */
export function MidMatchMessage({ status, code }: MidMatchMessageProps) {
  const isLive = status === 'live';
  const heading = isLive ? 'Match in progress' : 'Match over';
  const blurb = isLive
    ? "This room's match has already started, so we can't seat new players. Try a fresh room or jump into a random match."
    : "This room's match has ended. The host can replay, or you can start something new.";
  return (
    <section data-testid="mid-match-message" data-status={status} className="space-y-6 py-12">
      <header className="space-y-1">
        <p className="font-mono text-xs uppercase tracking-wider text-text-faint">
          room {code.toLowerCase()}
        </p>
        <h1 className="font-display text-2xl font-semibold leading-tight text-text">{heading}</h1>
      </header>
      <Card className="space-y-4">
        <p className="text-sm text-text-muted">{blurb}</p>
        <div className="flex gap-3">
          <Link href="/rooms" className={buttonVariants({ variant: 'primary', size: 'lg' })}>
            Back to rooms
          </Link>
        </div>
      </Card>
    </section>
  );
}
