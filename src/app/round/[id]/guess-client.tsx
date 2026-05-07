'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { SaveScoresCta } from '@/components/save-scores-cta';
import type { ScoreBreakdown } from '@/scoring';
import type { ReactionBand } from '@/scoring/reaction';

type GuessResponse = {
  sessionId: string;
  score: number;
  reaction: { band: ReactionBand; label: string; message: string };
  breakdown?: ScoreBreakdown;
  shareToken?: string;
  alreadyGuessed?: boolean;
};

const BAND_COLOR: Record<ReactionBand, string> = {
  way_off: 'bg-red-100 text-red-900 border-red-300',
  almost: 'bg-amber-100 text-amber-900 border-amber-300',
  close: 'bg-emerald-100 text-emerald-900 border-emerald-300',
  bullseye: 'bg-violet-200 text-violet-950 border-violet-400',
};

export function GuessClient({
  roundId,
  sessionId,
  variant = 'solo',
  advanceHref,
  finalSummary,
  isAnonymous = false,
}: {
  roundId: string;
  sessionId: string;
  variant?: 'solo' | 'daily';
  advanceHref?: string;
  // When set, this round is the final one in the session. After submission,
  // the "Next round" button is replaced with a completion summary panel.
  finalSummary?: { totalRounds: number; priorTotalScore: number };
  // When true, the post-reveal screen offers a "Save my scores" upgrade CTA.
  isAnonymous?: boolean;
}) {
  const router = useRouter();
  const [guess, setGuess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GuessResponse | null>(null);
  const [topComment, setTopComment] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!guess.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/guess', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(
          variant === 'daily' ? { roundId, guess, sessionId } : { roundId, guess },
        ),
      });
      if (!res.ok) {
        setError(`Submit failed (${res.status})`);
        return;
      }
      const data = (await res.json()) as GuessResponse;
      setResult(data);

      const revealRes = await fetch(`/api/round/${roundId}/reveal?sessionId=${data.sessionId}`);
      if (revealRes.ok) {
        const reveal = (await revealRes.json()) as { topCommentText: string };
        setTopComment(reveal.topCommentText);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setSubmitting(false);
    }
  }

  async function onShare() {
    if (!result?.shareToken) return;
    const url = `${window.location.origin}/round/${roundId}/result/${result.shareToken}`;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      }
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch {
      // Clipboard blocked — surface the URL inline so the user can copy manually.
      window.prompt('Copy this share URL:', url);
    }
  }

  async function advance() {
    setAdvancing(true);
    setError(null);
    try {
      if (advanceHref) {
        router.push(advanceHref);
        router.refresh();
        return;
      }
      const res = await fetch('/api/session/next', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });
      if (!res.ok) {
        setError(`Could not load next round (${res.status})`);
        return;
      }
      const data = (await res.json()) as { roundId: string | null };
      if (!data.roundId) {
        setError("You've played every available round. Check back later!");
        return;
      }
      router.push(`/round/${data.roundId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setAdvancing(false);
    }
  }

  if (result) {
    return (
      <div className="mt-6 space-y-4" data-testid="reveal">
        <div
          className={`rounded-lg border p-5 ${BAND_COLOR[result.reaction.band]}`}
          data-testid="score-card"
        >
          <div className="text-base font-semibold">{result.reaction.label}</div>
          <div className="text-6xl font-bold tabular-nums leading-none" data-testid="score">
            {result.score}
          </div>
          <div className="mt-2 text-base">{result.reaction.message}</div>
          <div className="mt-4 border-t border-current/20 pt-3 text-base">
            <div className="text-xs font-semibold uppercase tracking-wide opacity-80">
              Your guess
            </div>
            <p className="mt-1 italic" data-testid="your-guess">
              “{guess}”
            </p>
          </div>
          {result.breakdown && result.breakdown.bonuses.length > 0 && (
            <ul className="mt-3 space-y-0.5 text-sm" data-testid="bonus-list">
              {result.breakdown.bonuses.map((b) => (
                <li key={b.type}>
                  +{b.points} {b.label}
                </li>
              ))}
            </ul>
          )}
        </div>
        {topComment !== null && (
          <div className="rounded-lg border border-zinc-200 bg-white p-5">
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-700">
              Top comment
            </div>
            <p
              className="whitespace-pre-wrap text-lg leading-snug text-zinc-900"
              data-testid="top-comment"
            >
              {topComment}
            </p>
          </div>
        )}
        {result.shareToken && (
          <button
            type="button"
            onClick={onShare}
            data-testid="share-result"
            className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-zinc-800 hover:bg-zinc-50"
          >
            {shareCopied ? 'Link copied!' : 'Share result'}
          </button>
        )}
        <SaveScoresCta isAnonymous={isAnonymous} />
        {finalSummary ? (
          <div
            className="rounded-lg border border-zinc-200 bg-white p-4 text-center"
            data-testid="final-summary"
          >
            <p className="text-lg font-semibold text-zinc-900">
              You finished today's daily — {finalSummary.totalRounds}/{finalSummary.totalRounds}
            </p>
            <p className="mt-1 text-sm text-zinc-700">
              Total score:{' '}
              <span className="font-semibold tabular-nums">
                {finalSummary.priorTotalScore + result.score}
              </span>
            </p>
            <p className="mt-2 text-xs text-zinc-500">Come back tomorrow for the next one.</p>
          </div>
        ) : (
          <button
            type="button"
            onClick={advance}
            disabled={advancing}
            data-testid="next-round"
            className="w-full rounded-lg bg-zinc-900 px-4 py-3 text-white disabled:opacity-50"
          >
            {advancing ? 'Loading…' : 'Next round'}
          </button>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-3">
      <label htmlFor="guess" className="sr-only">
        Your guess
      </label>
      <input
        id="guess"
        name="guess"
        type="text"
        autoComplete="off"
        disabled={submitting || advancing}
        placeholder="What did the top comment say?"
        value={guess}
        onChange={(e) => setGuess(e.target.value)}
        className="w-full rounded-lg border border-zinc-300 px-4 py-3 text-lg outline-none focus:border-zinc-900"
      />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting || advancing || !guess.trim()}
          className="flex-1 rounded-lg bg-zinc-900 px-4 py-3 text-white disabled:opacity-50"
        >
          {submitting ? 'Scoring…' : 'Submit guess'}
        </button>
        {variant === 'solo' && (
          <button
            type="button"
            onClick={advance}
            disabled={submitting || advancing}
            data-testid="skip-round"
            className="rounded-lg border border-zinc-300 px-4 py-3 text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
          >
            {advancing ? '…' : 'Skip'}
          </button>
        )}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}
