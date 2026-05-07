import { notFound, redirect } from 'next/navigation';
import { getPublicRound } from '@/db/rounds';
import { findOrCreateSoloSession } from '@/db/sessions';
import { getCurrentPlayer } from '@/lib/auth/current-player';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { GuessClient } from './guess-client';

export const dynamic = 'force-dynamic';

export default async function RoundPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const player = await getCurrentPlayer();
  if (!player) {
    redirect(`/welcome?next=${encodeURIComponent(`/round/${id}`)}`);
  }

  const db = createServiceRoleClient();
  const round = await getPublicRound(db, id);
  if (!round) notFound();

  const session = await findOrCreateSoloSession(db, { playerId: player.id, roundId: round.id });

  return (
    <main className="mx-auto max-w-2xl p-6">
      <header className="mb-6 flex items-center justify-between">
        <p className="text-sm uppercase tracking-wide text-zinc-500">r/{round.subreddit}</p>
        <p className="text-sm text-zinc-600" data-testid="player-nickname">
          {player.nickname}
        </p>
      </header>
      <h1 className="mt-2 text-3xl font-semibold leading-tight">{round.title}</h1>
      <p className="mt-4 text-zinc-600">Guess what the top comment said. One sentence is enough.</p>
      <GuessClient roundId={round.id} sessionId={session.id} />
    </main>
  );
}
