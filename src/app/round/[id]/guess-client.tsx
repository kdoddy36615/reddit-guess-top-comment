'use client';

import { useState } from 'react';
import type { ScoreBreakdown } from '@/scoring';
import type { ReactionBand } from '@/scoring/reaction';

type GuessResponse = {
  sessionId: string;
  score: number;
  reaction: { band: ReactionBand; label: string; message: string };
  breakdown?: ScoreBreakdown;
  alreadyGuessed?: boolean;
};

const BAND_COLOR: Record<ReactionBand, string> = {
  way_off: 'bg-red-100 text-red-900 border-red-300',
  almost: 'bg-amber-100 text-amber-900 border-amber-300',
  close: 'bg-emerald-100 text-emerald-900 border-emerald-300',
  bullseye: 'bg-violet-200 text-violet-950 border-violet-400',
};

export function GuessClient({ roundId }: { roundId: string }) {
  const [guess, setGuess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GuessResponse | null>(null);
  const [topComment, setTopComment] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!guess.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/guess', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ roundId, guess }),
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

  if (result) {
    return (
      <div className="mt-6 space-y-4" data-testid="reveal">
        <div
          className={`rounded-lg border p-4 ${BAND_COLOR[result.reaction.band]}`}
          data-testid="score-card"
        >
          <div className="text-sm font-medium">{result.reaction.label}</div>
          <div className="text-4xl font-bold tabular-nums" data-testid="score">
            {result.score}
          </div>
          <div className="mt-1 text-sm">{result.reaction.message}</div>
          <div className="mt-3 border-t border-current/20 pt-3 text-sm">
            <div className="text-xs uppercase opacity-70">Your guess</div>
            <p className="mt-0.5 italic" data-testid="your-guess">
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
          <div className="rounded-lg border border-zinc-200 bg-white p-4">
            <div className="mb-1 text-xs uppercase text-zinc-500">Top comment</div>
            <p className="whitespace-pre-wrap text-zinc-900" data-testid="top-comment">
              {topComment}
            </p>
          </div>
        )}
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
        disabled={submitting}
        placeholder="What did the top comment say?"
        value={guess}
        onChange={(e) => setGuess(e.target.value)}
        className="w-full rounded-lg border border-zinc-300 px-4 py-3 text-lg outline-none focus:border-zinc-900"
      />
      <button
        type="submit"
        disabled={submitting || !guess.trim()}
        className="w-full rounded-lg bg-zinc-900 px-4 py-3 text-white disabled:opacity-50"
      >
        {submitting ? 'Scoring…' : 'Submit guess'}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}
