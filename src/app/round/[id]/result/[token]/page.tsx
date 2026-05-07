import { notFound, redirect } from 'next/navigation';
import { findGuessByShareToken } from '@/db/guesses';
import { getPublicRound } from '@/db/rounds';
import { findOrCreateSoloSession } from '@/db/sessions';
import { getCurrentPlayer } from '@/lib/auth/current-player';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { reactionFor } from '@/scoring/reaction';
import { GuessClient } from '../../guess-client';

export const dynamic = 'force-dynamic';

const BAND_COLOR: Record<string, string> = {
  way_off: 'bg-red-100 text-red-900 border-red-300',
  almost: 'bg-amber-100 text-amber-900 border-amber-300',
  close: 'bg-emerald-100 text-emerald-900 border-emerald-300',
  bullseye: 'bg-violet-200 text-violet-950 border-violet-400',
};

export default async function ResultPage({
  params,
}: {
  params: Promise<{ id: string; token: string }>;
}) {
  const { id, token } = await params;

  const player = await getCurrentPlayer();
  if (!player) {
    redirect(`/welcome?next=${encodeURIComponent(`/round/${id}/result/${token}`)}`);
  }

  const db = createServiceRoleClient();
  const round = await getPublicRound(db, id);
  if (!round) notFound();

  const friend = await findGuessByShareToken(db, { roundId: round.id, token });
  if (!friend) notFound();

  const reaction = reactionFor(friend.score);
  const session = await findOrCreateSoloSession(db, { playerId: player.id, roundId: round.id });

  return (
    <main className="mx-auto max-w-2xl p-6">
      <header className="mb-4 flex items-center justify-between">
        <p className="text-sm uppercase tracking-wide text-zinc-500">r/{round.subreddit}</p>
        <p className="text-sm text-zinc-600" data-testid="player-nickname">
          {player.nickname}
        </p>
      </header>

      <div
        className={`mb-6 rounded-lg border p-4 ${BAND_COLOR[reaction.band]}`}
        data-testid="friend-banner"
      >
        <div className="text-xs uppercase tracking-wide opacity-70">A friend's score</div>
        <div className="mt-1 text-lg font-semibold" data-testid="friend-score-line">
          {friend.nickname} got {friend.score}% — beat it!
        </div>
        <p className="mt-1 text-sm italic" data-testid="friend-guess">
          “{friend.guessText}”
        </p>
      </div>

      <h1 className="mt-2 text-3xl font-semibold leading-tight">{round.title}</h1>
      <p className="mt-4 text-zinc-600">Guess what the top comment said. One sentence is enough.</p>
      <GuessClient roundId={round.id} sessionId={session.id} />
    </main>
  );
}
