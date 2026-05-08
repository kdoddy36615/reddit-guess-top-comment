'use client';

import type { RealtimeChannel } from '@supabase/supabase-js';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { LeaderboardRow } from '@/components/game/leaderboard-row';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConnectionBanner } from '@/components/ui/connection-banner';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/cn';
import {
  type ConnectionStatus,
  ROOM_BROADCAST_EVENTS,
  roomChannel,
  subscribeRoomChannel,
} from '@/lib/realtime';
import type { MatchSummary } from '@/lib/rooms/end-screen';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export interface EndClientProps {
  code: string;
  viewerId: string;
  viewerNickname: string;
  /** Computed match summary (winner + standings + highlights). */
  summary: MatchSummary;
  /** True when the viewer is the host of a host-mode room — controls replay CTA visibility. */
  isHost: boolean;
  /** Random rooms get the [Find another match] CTA; host rooms get [Play again]. */
  mode: 'random' | 'host';
}

interface ReplayBroadcastPayload {
  kind: 'replay';
}

export function EndClient({
  code,
  viewerId,
  viewerNickname,
  summary,
  isHost,
  mode,
}: EndClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const channelRef = useRef<RealtimeChannel | null>(null);

  const [connection, setConnection] = useState<ConnectionStatus>('reconnecting');
  const [replayPending, setReplayPending] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    const channel = roomChannel(supabase, { code, playerId: viewerId });
    channelRef.current = channel;

    channel.on('broadcast', { event: ROOM_BROADCAST_EVENTS.state }, ({ payload }) => {
      const p = payload as Partial<ReplayBroadcastPayload>;
      if (p?.kind === 'replay') {
        // Host kicked off another match — peers in /end refresh and the SSR
        // page redirects them back to /r/[code] (room status is now `lobby`).
        router.refresh();
      }
    });

    subscribeRoomChannel(channel, async (status) => {
      setConnection(status);
      if (status === 'live') {
        await channel.track({ id: viewerId, nickname: viewerNickname, joinedAt: Date.now() });
      }
    });

    return () => {
      channelRef.current = null;
      channel.unsubscribe();
    };
  }, [code, viewerId, viewerNickname, router]);

  const onPlayAgain = useCallback(async () => {
    if (replayPending) return;
    setReplayPending(true);
    try {
      const res = await fetch(`/api/rooms/${code}/replay`, { method: 'POST' });
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { error?: string } | null;
        toast({
          title: "Couldn't start a replay",
          description: payload?.error ?? 'Try again in a moment.',
          variant: 'error',
        });
        setReplayPending(false);
        return;
      }
      const channel = channelRef.current;
      if (channel) {
        const payload: ReplayBroadcastPayload = { kind: 'replay' };
        await channel.send({
          type: 'broadcast',
          event: ROOM_BROADCAST_EVENTS.state,
          payload,
        });
      }
      router.replace(`/r/${code}`);
    } catch (err) {
      toast({
        title: 'Network error',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'error',
      });
      setReplayPending(false);
    }
  }, [code, replayPending, router, toast]);

  const winner = summary.winner;

  return (
    <section data-testid="room-end" className="space-y-8 py-8">
      <ConnectionBanner status={connection} />

      <header className="space-y-3 text-center">
        <p className="font-mono text-xs uppercase tracking-wider text-text-faint">
          room <span className="uppercase text-accent-2">{code}</span> · match over
        </p>
        <p className="font-display text-lg italic text-text-muted">winner</p>
        <p
          data-testid="winner-name"
          className="font-display text-[48px] font-bold leading-none text-accent md:text-[72px]"
        >
          {winner.playerName}
        </p>
        <p
          data-testid="winner-score"
          className="font-mono text-sm uppercase tracking-wider text-text-faint"
        >
          {winner.totalScore.toLocaleString()} pts
        </p>
      </header>

      <section className="space-y-2">
        <h2 className="font-mono text-xs uppercase tracking-wider text-text-faint">
          final standings
        </h2>
        <ol data-testid="standings" className="space-y-2">
          {summary.standings.map((s, i) => (
            <li key={s.playerId}>
              <LeaderboardRow
                data-testid={`standing-${s.playerId}`}
                rank={s.rank}
                name={s.playerName}
                score={s.totalScore}
                variant={s.playerId === viewerId ? 'you' : 'default'}
                slot={i}
              />
            </li>
          ))}
        </ol>
      </section>

      <section className="space-y-2" data-testid="highlights">
        <h2 className="font-mono text-xs uppercase tracking-wider text-text-faint">
          per-round highlights
        </h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <HighlightCard
            data-testid="highlight-top-score"
            label="top score"
            value={
              summary.highlights.topScore
                ? `${summary.highlights.topScore.score} · round ${
                    summary.highlights.topScore.roundIndex + 1
                  }`
                : '—'
            }
            who={summary.highlights.topScore?.playerName ?? null}
          />
          <HighlightCard
            data-testid="highlight-biggest-miss"
            label="biggest miss"
            value={
              summary.highlights.biggestMiss
                ? `${summary.highlights.biggestMiss.score} · round ${
                    summary.highlights.biggestMiss.roundIndex + 1
                  }`
                : '—'
            }
            who={summary.highlights.biggestMiss?.playerName ?? null}
          />
          <HighlightCard
            data-testid="highlight-fastest-submit"
            label="fastest submit"
            value={
              summary.highlights.fastestSubmit
                ? `first in ${summary.highlights.fastestSubmit.firstSubmitRounds} rounds`
                : '—'
            }
            who={summary.highlights.fastestSubmit?.playerName ?? null}
          />
        </div>
      </section>

      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center">
        {mode === 'host' ? (
          isHost ? (
            <Button
              type="button"
              variant="primary"
              size="lg"
              onClick={onPlayAgain}
              loading={replayPending}
              disabled={replayPending}
              data-testid="end-play-again"
            >
              Play again
            </Button>
          ) : (
            <p
              data-testid="end-waiting-host"
              className="text-center font-mono text-sm text-text-muted"
            >
              waiting for the host to start another match…
            </p>
          )
        ) : (
          <Link
            href="/rooms"
            data-testid="end-find-another"
            className={buttonVariants({ variant: 'primary', size: 'lg' })}
          >
            Find another match
          </Link>
        )}
        <Link
          href="/"
          data-testid="end-home"
          className={buttonVariants({ variant: 'secondary', size: 'lg' })}
        >
          Back to home
        </Link>
      </div>
    </section>
  );
}

interface HighlightCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: string;
  who: string | null;
}

function HighlightCard({ label, value, who, className, ...rest }: HighlightCardProps) {
  return (
    <Card className={cn('space-y-1', className)} {...rest}>
      <p className="font-mono text-xs uppercase tracking-wider text-text-faint">{label}</p>
      <p className="font-display text-md font-semibold text-text">{value}</p>
      <p className="font-mono text-xs text-accent-2">{who ?? 'no submissions'}</p>
    </Card>
  );
}
