'use client';

import { Flag } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { CommentCard } from '@/components/game/comment-card';
import { GuessInput } from '@/components/game/guess-input';
import { NicknamePrompt } from '@/components/game/nickname-prompt';
import { RoundCard } from '@/components/game/round-card';
import { ScoreReveal } from '@/components/game/score-reveal';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Toaster, useToast } from '@/components/ui/toast';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { type ReactionBand, reactionFor } from '@/scoring/reaction';

type RevealState = {
  guess: string;
  score: number;
  band: ReactionBand;
  topComment: { text: string; upvotes: string };
};

export interface DailyPlayClientProps {
  sessionId: string;
  roundId: string;
  /** True once a `players` row exists for the current auth user. */
  hasPlayer: boolean;
  /** Pre-generated nickname suggestion shown in the inline NicknamePrompt. */
  autoNickname: string;
  /** 1-based round number being played or revealed (`guessedCount + 1` for guessing, `totalRounds` on the post-final reveal). */
  roundNumber: number;
  totalRounds: number;
  round: {
    subreddit: string;
    title: string;
    upvotes: string;
    age: string;
    body?: string | null;
    imageUrl?: string | null;
  };
  /**
   * When non-null, the page hydrates the reveal layout directly (post-submit
   * reload, or — for the final round — the persisted post-submit-pre-finish
   * state). Absent on first render of a `guessing` round.
   */
  revealInitial?: RevealState;
}

export function DailyPlayClient({
  sessionId,
  roundId,
  hasPlayer,
  autoNickname,
  roundNumber,
  totalRounds,
  round,
  revealInitial,
}: DailyPlayClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [guess, setGuess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [nicknamePending, setNicknamePending] = useState(false);
  const [reveal, setReveal] = useState<RevealState | null>(revealInitial ?? null);
  const [advancing, setAdvancing] = useState(false);
  const [reportStatus, setReportStatus] = useState<
    'idle' | 'sending' | 'reported' | 'already' | 'error'
  >('idle');

  const isFinalRound = roundNumber >= totalRounds;
  // Pip "current" stays on the round we just revealed so all five pips don't
  // jump to "done" until the player actually finishes.
  const pipCurrent = Math.min(roundNumber, totalRounds);

  async function handleNicknameSubmit(nickname: string) {
    setNicknamePending(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const existing = await supabase.auth.getUser();
      if (!existing.data.user) {
        const { error } = await supabase.auth.signInAnonymously();
        if (error) throw error;
      }
      const res = await fetch('/api/auth/onboard', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ nickname }),
      });
      if (!res.ok) {
        throw new Error(`Saving nickname failed (${res.status})`);
      }
      router.refresh();
    } catch (err) {
      toast({
        title: 'Could not save nickname',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'error',
      });
      setNicknamePending(false);
    }
  }

  async function submitGuess() {
    const trimmed = guess.trim();
    if (!trimmed || submitting) return;
    if (!hasPlayer) {
      toast({ title: 'Pick a nickname before submitting your guess.', variant: 'error' });
      return;
    }
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
      const data = (await res.json()) as {
        sessionId: string;
        score: number;
        topComment?: { text: string; upvotes: string };
      };
      const band = reactionFor(data.score).band;
      setReveal({
        guess: trimmed,
        score: data.score,
        band,
        topComment: data.topComment ?? { text: '', upvotes: '0' },
      });
      setSubmitting(false);
    } catch (err) {
      toast({
        title: 'Network error',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'error',
      });
      setSubmitting(false);
    }
  }

  async function handleNextOrFinish() {
    if (advancing) return;
    setAdvancing(true);
    try {
      if (isFinalRound) {
        const res = await fetch('/api/play/daily/complete', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        });
        if (!res.ok) {
          toast({ title: `Could not finalize daily (${res.status})`, variant: 'error' });
          setAdvancing(false);
          return;
        }
        // `?just=1` flags the just-finished render so the summary screen plays
        // the score-up + staggered fade-up animations. Revisits (no query)
        // skip animations per DESIGN.md §5.
        router.replace('/play/daily/end?just=1');
      } else {
        // Rounds 1–4: progress.currentRoundId already points at the next
        // unguessed round once the guess for this round was inserted, so a
        // simple SSR refresh advances us. No state mutation needed here.
        setReveal(null);
        setGuess('');
        setReportStatus('idle');
        router.refresh();
      }
    } catch (err) {
      toast({
        title: 'Network error',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'error',
      });
      setAdvancing(false);
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
      toast({
        title: data.alreadyReported ? 'Already reported.' : 'Reported — thanks.',
      });
    } catch (err) {
      setReportStatus('error');
      toast({
        title: 'Network error',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'error',
      });
    }
  }

  const header = (
    <div className="flex items-center justify-between">
      <Progress current={pipCurrent} total={totalRounds} data-testid="daily-progress" />
      <p className="font-mono text-xs uppercase tracking-wider text-text-faint">
        round {pipCurrent} / {totalRounds}
      </p>
    </div>
  );

  if (reveal) {
    const flagLabel =
      reportStatus === 'reported'
        ? 'reported'
        : reportStatus === 'already'
          ? 'already reported'
          : reportStatus === 'sending'
            ? 'reporting…'
            : 'flag';
    const flagDisabled =
      reportStatus === 'sending' ||
      reportStatus === 'reported' ||
      reportStatus === 'already' ||
      advancing;
    const advanceLabel = isFinalRound ? 'finish →' : 'next round →';
    return (
      <div className="space-y-6 py-6" data-testid="daily-reveal">
        {header}
        <ScoreReveal guess={reveal.guess} score={reveal.score} band={reveal.band} matchedRank={1} />

        <div className="space-y-1">
          <p className="font-mono text-xs uppercase tracking-wider text-text-faint">
            r/{round.subreddit} · the actual thread
          </p>
          <p className="font-display text-base text-text-muted">{round.title}</p>
        </div>

        {reveal.topComment.text ? (
          <CommentCard
            rank={1}
            user="redditor"
            upvotes={reveal.topComment.upvotes}
            text={reveal.topComment.text}
          />
        ) : null}

        <div className="flex items-center justify-between gap-3 pt-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleFlag}
            disabled={flagDisabled}
            data-testid="daily-flag"
            aria-label="Report this round"
          >
            <Flag className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{flagLabel}</span>
          </Button>
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={handleNextOrFinish}
            disabled={advancing}
            loading={advancing}
            data-testid="daily-next-round"
          >
            {advancing ? 'loading…' : advanceLabel}
          </Button>
        </div>

        <Toaster />
      </div>
    );
  }

  const guessDisabled = !hasPlayer;
  const submitDisabled = guessDisabled || submitting || guess.trim().length === 0;

  return (
    <div className="space-y-4 py-6">
      {header}
      <RoundCard
        subreddit={round.subreddit}
        age={round.age}
        upvotes={round.upvotes}
        title={round.title}
        body={round.body ?? undefined}
        imageUrl={round.imageUrl ?? undefined}
      />

      {!hasPlayer ? (
        <NicknamePrompt
          initialNickname={autoNickname}
          onSubmit={handleNicknameSubmit}
          pending={nicknamePending}
        />
      ) : null}

      <p className="font-hand text-lg text-text-muted">what do you think the top comment said?</p>
      <GuessInput
        value={guess}
        onChange={setGuess}
        onSubmit={submitGuess}
        submitting={submitting}
        disabled={guessDisabled}
      />

      <div className="flex justify-end">
        <Button
          type="button"
          variant="primary"
          size="md"
          onClick={submitGuess}
          disabled={submitDisabled}
          loading={submitting}
          data-testid="daily-submit-guess"
        >
          {submitting ? 'scoring…' : 'guess →'}
        </Button>
      </div>

      <Toaster />
    </div>
  );
}
