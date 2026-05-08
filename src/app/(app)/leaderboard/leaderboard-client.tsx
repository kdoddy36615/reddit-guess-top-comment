'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { LeaderboardRow } from '@/components/game/leaderboard-row';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatResetsIn } from '@/lib/format/resets-in';

export type BoardRow = {
  playerId: string;
  rank: number;
  name: string;
  score: number;
};

export interface LeaderboardClientProps {
  /** ISO date label like `2026-05-08`. */
  dateLabel: string;
  /** Total number of players who have a row on today's board. */
  totalPlayers: number;
  /** Top-N rows (ranked desc, ties by `completed_at` asc). */
  topRows: BoardRow[];
  /**
   * The player's surrounding window when they are off-screen (rank > top-N
   * cutoff). `null` when the player is on-screen, has no run yet, or is
   * anonymous.
   */
  youWindow: BoardRow[] | null;
  /** The current viewer's `players.id`, or `null` if not signed in. */
  currentPlayerId: string | null;
  /**
   * True when the viewer is anonymous (no auth user OR anonymous-auth user
   * without a permanent identity). Drives the "sign in to compete" CTA.
   */
  isAnonymous: boolean;
  /** Wall-clock time used to seed the resets-in countdown on first render. */
  initialNow: string;
}

const TABS = [
  { value: 'today', label: 'today', disabled: false },
  { value: 'week', label: 'week', disabled: true },
  { value: 'all-time', label: 'all-time', disabled: true },
] as const;

function ResetsInCountdown({ initialNow }: { initialNow: string }) {
  const [label, setLabel] = useState(() => formatResetsIn(new Date(initialNow)));
  useEffect(() => {
    // Tick every 30s — `formatResetsIn` is minute-resolution, so tighter ticks
    // would just re-render the same string. SSR seeds the initial label via
    // `initialNow`; we don't tick on mount so the first paint matches what the
    // server rendered (no hydration churn).
    const id = setInterval(() => setLabel(formatResetsIn(new Date())), 30_000);
    return () => clearInterval(id);
  }, []);
  return (
    <span data-testid="resets-in" className="font-mono text-sm text-text-muted tabular-nums">
      resets in {label}
    </span>
  );
}

export function LeaderboardClient({
  dateLabel,
  totalPlayers,
  topRows,
  youWindow,
  currentPlayerId,
  isAnonymous,
  initialNow,
}: LeaderboardClientProps) {
  return (
    <section className="space-y-4 py-6" data-testid="leaderboard">
      <header className="space-y-2">
        <div className="flex items-baseline justify-between gap-3">
          <h1 className="font-display text-3xl font-semibold text-text">today's board</h1>
          <ResetsInCountdown initialNow={initialNow} />
        </div>
        <p className="font-mono text-xs text-text-faint">
          {dateLabel} · {totalPlayers.toLocaleString()} player{totalPlayers === 1 ? '' : 's'}
        </p>
      </header>

      <Tabs defaultValue="today">
        <TabsList aria-label="Leaderboard timeframe">
          {TABS.map((t) => (
            <TabsTrigger
              key={t.value}
              value={t.value}
              disabled={t.disabled}
              aria-disabled={t.disabled || undefined}
              data-testid={`leaderboard-tab-${t.value}`}
            >
              {t.label}
              {t.disabled ? <span className="sr-only"> (coming soon)</span> : null}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="space-y-2" data-testid="leaderboard-list">
        {topRows.length === 0 ? (
          <p
            className="rounded-md bg-surface-2 px-4 py-6 text-center font-mono text-sm text-text-muted"
            data-testid="leaderboard-empty"
          >
            no runs yet today — be the first.
          </p>
        ) : (
          topRows.map((row, i) => (
            <LeaderboardRow
              key={row.playerId}
              rank={row.rank}
              name={row.name}
              score={row.score}
              variant={row.playerId === currentPlayerId ? 'you' : 'default'}
              slot={i}
              data-testid="leaderboard-top-row"
            />
          ))
        )}

        {youWindow ? (
          <>
            <hr
              aria-label="off-screen window"
              data-testid="leaderboard-window-divider"
              className="my-2 border-0 border-border-strong border-t border-dashed"
            />
            {youWindow.map((row, i) => (
              <LeaderboardRow
                key={`window-${row.playerId}`}
                rank={row.rank}
                name={row.name}
                score={row.score}
                variant={row.playerId === currentPlayerId ? 'you' : 'default'}
                slot={i}
                data-testid="leaderboard-window-row"
              />
            ))}
          </>
        ) : null}
      </div>

      {isAnonymous ? (
        <Link
          href="/sign-in"
          data-testid="leaderboard-sign-in-cta"
          className="block rounded-md bg-surface-2 px-4 py-3 text-center font-medium text-accent text-sm hover:bg-surface-3"
        >
          sign in to compete →
        </Link>
      ) : null}
    </section>
  );
}
