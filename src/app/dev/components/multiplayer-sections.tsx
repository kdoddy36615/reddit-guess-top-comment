'use client';

import { useEffect, useState } from 'react';
import { PlayerChip, type PlayerChipState } from '@/components/game/player-chip';
import { RoundTimer } from '@/components/game/round-timer';

const PLAYER_STATES: PlayerChipState[] = ['typing', 'submitted', 'disconnected', 'kicked'];

export function PlayerChipSection() {
  return (
    <section id="player-chip" className="scroll-mt-20 space-y-6">
      <header>
        <h2 className="font-display text-2xl font-semibold text-text">PlayerChip</h2>
        <p className="font-mono text-xs text-text-faint">
          typing · submitted · disconnected · kicked · &apos;you&apos; (accent-2) — DESIGN.md
          §/r/[code] + §5
        </p>
      </header>

      <div className="space-y-4">
        <div className="space-y-2">
          <p className="font-mono text-xs uppercase tracking-wider text-text-muted">state matrix</p>
          <div className="flex flex-wrap gap-2">
            {PLAYER_STATES.map((state, i) => (
              <PlayerChip key={state} name={`player_${i + 1}`} state={state} slot={i} />
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <p className="font-mono text-xs uppercase tracking-wider text-text-muted">
            &apos;you&apos; highlight
          </p>
          <div className="flex flex-wrap gap-2">
            {PLAYER_STATES.map((state) => (
              <PlayerChip key={state} name="me" state={state} isYou />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function useMockNow(startMs: number) {
  // Lets a single dev page render multiple "live" timers without spawning a
  // bunch of setIntervals — we drive them all from one state tick.
  const [now, setNow] = useState(startMs);
  useEffect(() => {
    const id = setInterval(() => setNow((n) => n + 1000), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export function RoundTimerSection() {
  // Anchor each example off a mock "now" so the page loads with predictable
  // state samples, but the live one in the corner still ticks.
  const baseNow = useMockNow(0);

  // Anchor "now" at 0, then derive endsAt for each example so the readout is
  // deterministic on mount but still ticks in the browser.
  const liveEndsAt = Date.now() + 30_000;
  // Static examples per state — these are remounted each second by the mock
  // now, which keeps them visually fresh during long visual reviews without
  // running real wall-clock timers in tests.
  const activeEndsAt = Date.now() + 22_000 + (baseNow % 1);
  const expiringEndsAt = Date.now() + 4_000 + (baseNow % 1);
  const expiredEndsAt = Date.now() - 1_000;

  return (
    <section id="round-timer" className="scroll-mt-20 space-y-6">
      <header>
        <h2 className="font-display text-2xl font-semibold text-text">RoundTimer</h2>
        <p className="font-mono text-xs text-text-faint">
          active · expiring (last 5s) · expired · &apos;you&apos; (accent-2) — DESIGN.md §5/§6
        </p>
      </header>

      <div className="space-y-4">
        <div className="space-y-2">
          <p className="font-mono text-xs uppercase tracking-wider text-text-muted">
            state matrix (snapshot)
          </p>
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex flex-col items-center gap-1">
              <RoundTimer endsAt={activeEndsAt} durationSeconds={30} />
              <span className="font-mono text-xs text-text-faint">active</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <RoundTimer endsAt={expiringEndsAt} durationSeconds={30} />
              <span className="font-mono text-xs text-text-faint">expiring</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <RoundTimer endsAt={expiredEndsAt} durationSeconds={30} />
              <span className="font-mono text-xs text-text-faint">expired</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <RoundTimer endsAt={activeEndsAt} durationSeconds={30} variant="you" />
              <span className="font-mono text-xs text-text-faint">you (accent-2)</span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <p className="font-mono text-xs uppercase tracking-wider text-text-muted">live preview</p>
          <RoundTimer endsAt={liveEndsAt} durationSeconds={30} />
        </div>
      </div>
    </section>
  );
}
