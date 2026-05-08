'use client';

import type { RealtimeChannel } from '@supabase/supabase-js';
import { Flag } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CommentCard } from '@/components/game/comment-card';
import { GuessInput } from '@/components/game/guess-input';
import { PlayerChip, type PlayerChipState } from '@/components/game/player-chip';
import { RoundCard } from '@/components/game/round-card';
import { RoundTimer } from '@/components/game/round-timer';
import { ScoreReveal } from '@/components/game/score-reveal';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConnectionBanner } from '@/components/ui/connection-banner';
import { useToast } from '@/components/ui/toast';
import type { RoomPlayer } from '@/db/rooms';
import {
  broadcastState,
  broadcastSubmission,
  type ConnectionStatus,
  ROOM_BROADCAST_EVENTS,
  type RoundStatePayload,
  roomChannel,
  type SubmissionPayload,
  subscribeRoomChannel,
} from '@/lib/realtime';
import { REVEAL_HOLD_MS } from '@/lib/rooms/round-flow';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { reactionFor } from '@/scoring/reaction';

type RoundState = 'guessing' | 'revealed' | 'session_complete';

export interface RoomPlayClientProps {
  code: string;
  sessionId: string;
  viewerId: string;
  viewerNickname: string;
  timerSeconds: number;
  totalRounds: number;
  roundIndex: number;
  roundId: string;
  round: {
    subreddit: string;
    title: string;
    upvotes: string;
    age: string;
    body: string | null;
  };
  roundState: RoundState;
  roundStartedAt: string | null;
  revealedAt: string | null;
  initialPlayers: RoomPlayer[];
  initialSubmittedIds: string[];
  viewerPriorGuess: { text: string; score: number } | null;
  revealInitial: {
    topComment: { text: string; upvotes: string };
    revealedAt: string;
    submitted: { playerId: string; score: number }[];
  } | null;
}

const TICK_MS = 250;

export function RoomPlayClient(props: RoomPlayClientProps) {
  const {
    code,
    sessionId,
    viewerId,
    viewerNickname,
    timerSeconds,
    totalRounds,
    roundIndex,
    roundId,
    round,
    roundState: initialRoundState,
    roundStartedAt,
    revealedAt: initialRevealedAt,
    initialPlayers,
    initialSubmittedIds,
    viewerPriorGuess,
    revealInitial,
  } = props;

  const router = useRouter();
  const { toast } = useToast();
  const channelRef = useRef<RealtimeChannel | null>(null);

  const [connection, setConnection] = useState<ConnectionStatus>('reconnecting');
  const [presentIds, setPresentIds] = useState<Set<string>>(() => new Set([viewerId]));
  const [submittedIds, setSubmittedIds] = useState<Set<string>>(() => new Set(initialSubmittedIds));
  const [guess, setGuess] = useState(viewerPriorGuess?.text ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [reportStatus, setReportStatus] = useState<
    'idle' | 'sending' | 'reported' | 'already' | 'error'
  >('idle');
  const [now, setNow] = useState(() => Date.now());

  const transitionInFlight = useRef(false);
  const lastBroadcastStateKey = useRef<string>('');

  // Round timer endpoint — server-authoritative.
  const roundEndsAt = useMemo(() => {
    if (!roundStartedAt) return Date.now() + timerSeconds * 1000;
    return Date.parse(roundStartedAt) + timerSeconds * 1000;
  }, [roundStartedAt, timerSeconds]);

  const revealHoldEndsAt = useMemo(() => {
    if (!initialRevealedAt) return null;
    return Date.parse(initialRevealedAt) + REVEAL_HOLD_MS;
  }, [initialRevealedAt]);

  // Tick clock for timer + reveal countdown.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, []);

  // Realtime channel: presence + submission + state broadcasts.
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    const channel = roomChannel(supabase, { code, playerId: viewerId });
    channelRef.current = channel;

    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      setPresentIds(new Set(Object.keys(state)));
    });

    channel.on('broadcast', { event: ROOM_BROADCAST_EVENTS.submission }, ({ payload }) => {
      const p = payload as SubmissionPayload;
      if (p?.roundId === roundId) {
        setSubmittedIds((prev) => {
          if (prev.has(p.playerId)) return prev;
          const next = new Set(prev);
          next.add(p.playerId);
          return next;
        });
      }
    });

    channel.on('broadcast', { event: ROOM_BROADCAST_EVENTS.state }, ({ payload }) => {
      const p = payload as RoundStatePayload;
      if (p?.sessionId === sessionId) {
        // Server has progressed — re-fetch SSR snapshot.
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
  }, [code, viewerId, viewerNickname, roundId, sessionId, router]);

  const callTransition = useCallback(async () => {
    if (transitionInFlight.current) return;
    transitionInFlight.current = true;
    try {
      const res = await fetch(`/api/rooms/${code}/round/transition`, {
        method: 'POST',
      });
      if (!res.ok) return;
      const data = (await res.json()) as {
        result:
          | { kind: 'noop'; state: RoundState }
          | { kind: 'revealed'; revealedAt: string }
          | { kind: 'advanced'; roundId: string; roundIndex: number; startedAt: string }
          | { kind: 'completed' };
        sessionId: string;
      };
      if (data.result.kind === 'noop') return;

      // Broadcast the new state so peers refresh too. Dedupe by a key so two
      // tabs don't broadcast the same transition twice.
      const channel = channelRef.current;
      const key = JSON.stringify(data.result);
      if (channel && lastBroadcastStateKey.current !== key) {
        lastBroadcastStateKey.current = key;
        const stateName: RoundState =
          data.result.kind === 'completed'
            ? 'session_complete'
            : data.result.kind === 'revealed'
              ? 'revealed'
              : 'guessing';
        broadcastState(channel, {
          sessionId: data.sessionId,
          roundIndex,
          state: stateName,
        });
      }
      router.refresh();
    } catch {
      // Best-effort nudge; subsequent ticks retry.
    } finally {
      transitionInFlight.current = false;
    }
  }, [code, roundIndex, router]);

  // Server-authoritative auto-trigger: when our local clock crosses the round
  // end (guessing) or reveal-hold end (revealed), nudge the server. The
  // server is the source of truth — first call wins, others get noop.
  useEffect(() => {
    if (initialRoundState === 'guessing' && now >= roundEndsAt) {
      void callTransition();
    } else if (
      initialRoundState === 'revealed' &&
      revealHoldEndsAt !== null &&
      now >= revealHoldEndsAt
    ) {
      void callTransition();
    }
  }, [initialRoundState, now, roundEndsAt, revealHoldEndsAt, callTransition]);

  // After a local submission, also nudge once — the server may now be eligible
  // to flip to revealed (everyone's done).
  const maybeNudgeAfterSubmit = useCallback(() => {
    void callTransition();
  }, [callTransition]);

  async function submitGuess() {
    const trimmed = guess.trim();
    if (!trimmed || submitting) return;
    if (initialRoundState !== 'guessing') return;
    if (submittedIds.has(viewerId)) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/guess', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ roundId, guess: trimmed, sessionId }),
      });
      if (!res.ok) {
        toast({ title: `Submit failed (${res.status})`, variant: 'error' });
        setSubmitting(false);
        return;
      }
      // Optimistic local chip flip.
      setSubmittedIds((prev) => {
        const next = new Set(prev);
        next.add(viewerId);
        return next;
      });
      const channel = channelRef.current;
      if (channel) {
        broadcastSubmission(channel, { sessionId, roundId, playerId: viewerId });
      }
      setSubmitting(false);
      maybeNudgeAfterSubmit();
    } catch (err) {
      toast({
        title: 'Network error',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'error',
      });
      setSubmitting(false);
    }
  }

  async function handleFlag() {
    if (reportStatus === 'sending' || reportStatus === 'reported' || reportStatus === 'already') {
      return;
    }
    setReportStatus('sending');
    try {
      const res = await fetch('/api/report', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ roundId }),
      });
      if (!res.ok) {
        setReportStatus('error');
        toast({ title: `Report failed (${res.status})`, variant: 'error' });
        return;
      }
      const data = (await res.json()) as { alreadyReported?: boolean };
      setReportStatus(data.alreadyReported ? 'already' : 'reported');
      toast({ title: data.alreadyReported ? 'Already reported.' : 'Reported — thanks.' });
    } catch (err) {
      setReportStatus('error');
      toast({
        title: 'Network error',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'error',
      });
    }
  }

  const activePlayers = useMemo(() => initialPlayers.filter((p) => !p.is_kicked), [initialPlayers]);

  // Compute reveal-hold remaining (clamped to 0). Used for both display and
  // for initialRoundState==='revealed' but client may be reconnecting late.
  const revealRemainingMs = useMemo(() => {
    if (initialRoundState !== 'revealed') return null;
    if (!initialRevealedAt) return REVEAL_HOLD_MS;
    const ends = Date.parse(initialRevealedAt) + REVEAL_HOLD_MS;
    return Math.max(0, ends - now);
  }, [initialRoundState, initialRevealedAt, now]);

  const renderingReveal = initialRoundState === 'revealed';

  return (
    <section data-testid="room-play" className="space-y-5 py-6">
      <ConnectionBanner status={connection} />

      <header className="flex items-center justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-wider text-text-faint">
            Room <span className="uppercase text-accent-2">{code}</span>
          </p>
          <p data-testid="round-progress" className="font-display text-md font-semibold text-text">
            round {roundIndex + 1} / {totalRounds}
          </p>
        </div>
        {!renderingReveal ? (
          <RoundTimer endsAt={roundEndsAt} durationSeconds={timerSeconds} />
        ) : (
          <div
            data-testid="reveal-countdown"
            className="font-mono text-xs tabular-nums text-text-muted"
            aria-live="polite"
          >
            next in {Math.max(0, Math.ceil((revealRemainingMs ?? 0) / 1000))}s
          </div>
        )}
      </header>

      <RoundCard
        subreddit={round.subreddit}
        age={round.age}
        upvotes={round.upvotes}
        title={round.title}
        body={round.body ?? undefined}
      />

      <Card className="space-y-2">
        <p className="font-mono text-xs uppercase tracking-wider text-text-faint">
          players ({submittedIds.size}/{activePlayers.length} submitted)
        </p>
        <ul data-testid="play-players" className="flex flex-wrap gap-2">
          {activePlayers.map((p) => {
            const submitted = submittedIds.has(p.player_id);
            const present = presentIds.has(p.player_id);
            const state: PlayerChipState = submitted
              ? 'submitted'
              : present
                ? 'typing'
                : 'disconnected';
            return (
              <li key={p.player_id}>
                <PlayerChip
                  name={p.nickname ?? 'player'}
                  state={state}
                  isYou={p.player_id === viewerId}
                  data-testid={`play-chip-${p.player_id}`}
                />
              </li>
            );
          })}
        </ul>
      </Card>

      {!renderingReveal ? (
        <>
          <p className="font-hand text-lg text-text-muted">
            what do you think the top comment said?
          </p>
          <GuessInput
            value={guess}
            onChange={setGuess}
            onSubmit={submitGuess}
            submitting={submitting}
            disabled={submittedIds.has(viewerId)}
          />
          <div className="flex justify-end">
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={submitGuess}
              loading={submitting}
              disabled={submitting || submittedIds.has(viewerId) || guess.trim().length === 0}
              data-testid="play-submit"
            >
              {submittedIds.has(viewerId) ? 'submitted' : submitting ? 'scoring…' : 'guess →'}
            </Button>
          </div>
        </>
      ) : (
        <RevealView
          revealInitial={revealInitial}
          viewerPriorGuess={viewerPriorGuess}
          activePlayers={activePlayers}
          viewerId={viewerId}
          reportStatus={reportStatus}
          onFlag={handleFlag}
        />
      )}
    </section>
  );
}

interface RevealViewProps {
  revealInitial: RoomPlayClientProps['revealInitial'];
  viewerPriorGuess: RoomPlayClientProps['viewerPriorGuess'];
  activePlayers: RoomPlayer[];
  viewerId: string;
  reportStatus: 'idle' | 'sending' | 'reported' | 'already' | 'error';
  onFlag: () => void;
}

function RevealView({
  revealInitial,
  viewerPriorGuess,
  activePlayers,
  viewerId,
  reportStatus,
  onFlag,
}: RevealViewProps) {
  const submittedMap = useMemo(() => {
    const m = new Map<string, number>();
    if (revealInitial) {
      for (const s of revealInitial.submitted) m.set(s.playerId, s.score);
    }
    return m;
  }, [revealInitial]);

  const youScore = viewerPriorGuess?.score ?? 0;
  const youGuess = viewerPriorGuess?.text ?? '';
  const youBand = reactionFor(youScore).band;

  const flagLabel =
    reportStatus === 'reported'
      ? 'reported'
      : reportStatus === 'already'
        ? 'already reported'
        : reportStatus === 'sending'
          ? 'reporting…'
          : 'flag';
  const flagDisabled =
    reportStatus === 'sending' || reportStatus === 'reported' || reportStatus === 'already';

  return (
    <div className="space-y-4" data-testid="room-reveal">
      <ScoreReveal guess={youGuess} score={youScore} band={youBand} matchedRank={1} />

      {revealInitial?.topComment.text ? (
        <CommentCard
          rank={1}
          user="redditor"
          upvotes={revealInitial.topComment.upvotes}
          text={revealInitial.topComment.text}
        />
      ) : null}

      <Card className="space-y-2">
        <p className="font-mono text-xs uppercase tracking-wider text-text-faint">this round</p>
        <ul data-testid="room-reveal-scores" className="grid grid-cols-1 gap-1 sm:grid-cols-2">
          {activePlayers.map((p) => {
            const score = submittedMap.get(p.player_id);
            const submitted = score !== undefined;
            const isYou = p.player_id === viewerId;
            return (
              <li
                key={p.player_id}
                data-testid={`reveal-row-${p.player_id}`}
                className="flex items-center justify-between rounded-md border border-border bg-surface px-3 py-2 font-mono text-xs"
              >
                <span className={isYou ? 'text-accent-2' : 'text-text'}>
                  {p.nickname ?? 'player'}
                </span>
                <span className={submitted ? 'text-text' : 'text-text-faint'}>
                  {submitted ? score : "didn't submit"}
                </span>
              </li>
            );
          })}
        </ul>
      </Card>

      <div className="flex items-center justify-between gap-3 pt-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onFlag}
          disabled={flagDisabled}
          data-testid="room-flag"
          aria-label="Report this round"
        >
          <Flag className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{flagLabel}</span>
        </Button>
      </div>
    </div>
  );
}
