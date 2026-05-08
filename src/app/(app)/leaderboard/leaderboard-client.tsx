'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { LeaderboardRow } from '@/components/game/leaderboard-row';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatResetsIn } from '@/lib/format/resets-in';

export type Timeframe = 'today' | 'week' | 'all-time';

export type BoardRow = {
  playerId: string;
  rank: number;
  name: string;
  score: number;
};

export type TimeframeBoard = {
  /** Top-N rows (already ranked, ties broken upstream). */
  topRows: BoardRow[];
  /**
   * Surrounding window when the viewer is off-screen for this timeframe.
   * `null` when the viewer is on-screen, has no run, or is anonymous.
   */
  youWindow: BoardRow[] | null;
  /** Distinct player count contributing to this timeframe's board. */
  totalPlayers: number;
};

export interface LeaderboardClientProps {
  /** ISO date label like `2026-05-08`. Used in the today header subtitle. */
  dateLabel: string;
  /** Wall-clock time used to seed the today resets-in countdown. */
  initialNow: string;
  /** The current viewer's `players.id`, or `null` if not signed in. */
  currentPlayerId: string | null;
  /**
   * True when the viewer is anonymous (no auth user OR anonymous-auth user
   * without a permanent identity). Drives the "sign in to compete" CTA.
   */
  isAnonymous: boolean;
  /** Pre-computed board data for each timeframe. */
  boards: Record<Timeframe, TimeframeBoard>;
  /** Initial selected tab — chosen server-side from `?tab=`. */
  initialTab: Timeframe;
}

const TABS: { value: Timeframe; label: string }[] = [
  { value: 'today', label: 'today' },
  { value: 'week', label: 'week' },
  { value: 'all-time', label: 'all-time' },
];

const HEADINGS: Record<Timeframe, string> = {
  today: "today's board",
  week: 'this week',
  'all-time': 'all-time',
};

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
  initialNow,
  currentPlayerId,
  isAnonymous,
  boards,
  initialTab,
}: LeaderboardClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [active, setActive] = useState<Timeframe>(initialTab);

  const onTabChange = useCallback(
    (next: string) => {
      const tab = next as Timeframe;
      setActive(tab);
      // Default tab stays out of the URL so canonical /leaderboard remains clean.
      const params = new URLSearchParams(searchParams?.toString() ?? '');
      if (tab === 'today') {
        params.delete('tab');
      } else {
        params.set('tab', tab);
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const board = boards[active];

  return (
    <section className="space-y-4 py-6" data-testid="leaderboard">
      <header className="space-y-2">
        <div className="flex items-baseline justify-between gap-3">
          <h1 className="font-display text-3xl font-semibold text-text">{HEADINGS[active]}</h1>
          {active === 'today' ? <ResetsInCountdown initialNow={initialNow} /> : null}
        </div>
        <p className="font-mono text-xs text-text-faint">
          {active === 'today' ? `${dateLabel} · ` : ''}
          {board.totalPlayers.toLocaleString()} player{board.totalPlayers === 1 ? '' : 's'}
        </p>
      </header>

      <Tabs value={active} onValueChange={onTabChange}>
        <TabsList aria-label="Leaderboard timeframe">
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value} data-testid={`leaderboard-tab-${t.value}`}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="space-y-2" data-testid="leaderboard-list">
        {board.topRows.length === 0 ? (
          <p
            className="rounded-md bg-surface-2 px-4 py-6 text-center font-mono text-sm text-text-muted"
            data-testid="leaderboard-empty"
          >
            no runs yet — be the first.
          </p>
        ) : (
          board.topRows.map((row, i) => (
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

        {board.youWindow ? (
          <>
            <hr
              aria-label="off-screen window"
              data-testid="leaderboard-window-divider"
              className="my-2 border-0 border-border-strong border-t border-dashed"
            />
            {board.youWindow.map((row, i) => (
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
