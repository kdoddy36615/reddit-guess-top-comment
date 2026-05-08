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
import { Toaster, useToast } from '@/components/ui/toast';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { type ReactionBand, reactionFor } from '@/scoring/reaction';

type RevealState = {
  guess: string;
  score: number;
  band: ReactionBand;
  topComment: { text: string; upvotes: string };
};

export interface SoloPlayClientProps {
  roundId: string;
  /** Null when no player exists yet — server hasn't created a session in that case. */
  sessionId: string | null;
  /** True once a `players` row exists for the current auth user. */
  hasPlayer: boolean;
  /** Pre-generated nickname suggestion shown in the inline NicknamePrompt. */
  autoNickname: string;
  round: {
    subreddit: string;
    title: string;
    upvotes: string;
    age: string;
    body?: string | null;
    imageUrl?: string | null;
  };
  /**
   * When the session is already in the `revealed` state at SSR time (post-submit
   * reload), the page hydrates the reveal layout directly with the player's
   * prior guess + the top comment. Absent on first render of a `guessing` round.
   */
  revealInitial?: RevealState;
}

export function SoloPlayClient({
  roundId,
  sessionId: initialSessionId,
  hasPlayer,
  autoNickname,
  round,
  revealInitial,
}: SoloPlayClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [guess, setGuess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [nicknamePending, setNicknamePending] = useState(false);
  const [reveal, setReveal] = useState<RevealState | null>(revealInitial ?? null);
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId);
  const [advancing, setAdvancing] = useState(false);
  const [reportStatus, setReportStatus] = useState<
    'idle' | 'sending' | 'reported' | 'already' | 'error'
  >('idle');

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
      const body: { roundId: string; guess: string; sessionId?: string } = {
        roundId,
        guess: trimmed,
      };
      if (sessionId) body.sessionId = sessionId;
      const res = await fetch('/api/guess', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        toast({
          title: `Submit failed (${res.status})`,
          variant: 'error',
        });
        setSubmitting(false);
        return;
      }
      const data = (await res.json()) as {
        sessionId: string;
        score: number;
        topComment?: { text: string; upvotes: string };
      };
      const band = reactionFor(data.score).band;
      setSessionId(data.sessionId);
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

  async function handleNextRound() {
    if (advancing) return;
    setAdvancing(true);
    try {
      const body: { sessionId?: string } = {};
      if (sessionId) body.sessionId = sessionId;
      const res = await fetch('/api/session/next', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        toast({ title: `Could not load next round (${res.status})`, variant: 'error' });
        setAdvancing(false);
        return;
      }
      const data = (await res.json()) as { roundId: string | null };
      if (!data.roundId) {
        toast({
          title: "You've played every available round.",
          description: 'Check back later for fresh ones.',
          variant: 'error',
        });
        setAdvancing(false);
        return;
      }
      // Reset local state and let SSR re-render the new `guessing` round.
      setReveal(null);
      setGuess('');
      setReportStatus('idle');
      router.refresh();
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
    return (
      <div className="space-y-6 py-6" data-testid="solo-reveal">
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
            data-testid="solo-flag"
            aria-label="Report this round"
          >
            <Flag className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{flagLabel}</span>
          </Button>
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={handleNextRound}
            disabled={advancing}
            loading={advancing}
            data-testid="solo-next-round"
          >
            {advancing ? 'loading…' : 'next round →'}
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
          data-testid="solo-submit-guess"
        >
          {submitting ? 'scoring…' : 'guess →'}
        </Button>
      </div>

      <Toaster />
    </div>
  );
}
