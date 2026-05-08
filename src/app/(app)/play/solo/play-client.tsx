'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { GuessInput } from '@/components/game/guess-input';
import { NicknamePrompt } from '@/components/game/nickname-prompt';
import { RoundCard } from '@/components/game/round-card';
import { Button } from '@/components/ui/button';
import { Toaster, useToast } from '@/components/ui/toast';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

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
}

export function SoloPlayClient({
  roundId,
  sessionId,
  hasPlayer,
  autoNickname,
  round,
}: SoloPlayClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [guess, setGuess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [nicknamePending, setNicknamePending] = useState(false);

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
      // Reveal UI lands in slice 30; for now refresh so SSR can render the
      // session in its newly-`revealed` state.
      router.refresh();
    } catch (err) {
      toast({
        title: 'Network error',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'error',
      });
      setSubmitting(false);
    }
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
