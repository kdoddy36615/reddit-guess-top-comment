import type { Metadata } from 'next';
import { getPlayerByAuthId } from '@/db/players';
import { getRoundForPlay } from '@/db/rounds';
import { advanceSession, getOrCreateActiveSoloSession } from '@/db/sessions';
import { formatPostAge, formatUpvotes } from '@/lib/format/reddit-meta';
import { generateNickname } from '@/lib/nickname/generate';
import { pickRound } from '@/lib/round-selection';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { createSsrClient } from '@/lib/supabase/ssr';
import { AnonBootstrap } from './anon-bootstrap';
import { SoloPlayClient } from './play-client';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Play solo · Reddit Guess Top Comment',
  description: 'Guess what Reddit said. One round at a time.',
};

export default async function SoloPlayPage() {
  const ssr = await createSsrClient();
  const {
    data: { user },
  } = await ssr.auth.getUser();

  // First-visit path: no anon auth user yet. Delegate to a tiny client island
  // that calls signInAnonymously() and refreshes — server components can't
  // write auth cookies. Honors AC: "Anonymous Supabase session created on first
  // visit if absent."
  if (!user) {
    return <AnonBootstrap />;
  }

  const player = await getPlayerByAuthId(ssr, user.id);
  const db = createServiceRoleClient();

  // Server-authoritative round selection (architectural commitment #1).
  // With a player: reuse their active solo session's current round, advancing
  // if needed. Without a player (post-anon-signin, pre-onboard): pick a
  // uniform-random eligible round to display alongside the inline
  // NicknamePrompt. The session row gets created on first guess submit
  // (`/api/guess` resolves it via `findOrCreateSoloSession`).
  let roundId: string | null = null;

  if (player) {
    const sessionId = await getOrCreateActiveSoloSession(db, player.id);
    const sessionRow = await db
      .from('game_sessions')
      .select('current_round_id, current_round_state')
      .eq('id', sessionId)
      .maybeSingle();
    if (sessionRow.error) throw sessionRow.error;

    const current = sessionRow.data;
    if (current?.current_round_state === 'guessing' && current.current_round_id) {
      roundId = current.current_round_id;
    } else {
      const next = await advanceSession(db, { sessionId });
      roundId = next?.roundId ?? null;
    }
  } else {
    const eligible = await db.from('rounds').select('id').eq('status', 'auto_published');
    if (eligible.error) throw eligible.error;
    const picked = pickRound((eligible.data ?? []) as { id: string }[], Math.random);
    roundId = picked?.id ?? null;
  }

  if (!roundId) {
    return (
      <div className="py-12 text-center font-mono text-sm text-text-muted">
        no rounds available right now. check back soon.
      </div>
    );
  }

  const round = await getRoundForPlay(db, roundId);
  if (!round) {
    return (
      <div className="py-12 text-center font-mono text-sm text-text-muted">round unavailable.</div>
    );
  }

  // sessionId stays server-side. `/api/guess` resolves the session via
  // `findOrCreateSoloSession({ playerId, roundId })` when no sessionId is
  // supplied, which sidesteps the `isRoundInSession` check (orphan sessions
  // created by `getOrCreateActiveSoloSession` lack the `session_rounds` linkage
  // until they're advanced). The round itself is still server-authoritative.
  return (
    <SoloPlayClient
      roundId={round.id}
      sessionId={null}
      hasPlayer={Boolean(player)}
      autoNickname={generateNickname()}
      round={{
        subreddit: round.subreddit,
        title: round.title,
        upvotes: formatUpvotes(round.postScore),
        age: formatPostAge(round.createdUtcSeconds),
        body: round.body,
      }}
    />
  );
}
