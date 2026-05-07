import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { SCORING_CONFIG } from '@/config/scoring';
import { listRecentGuessesForRound } from '@/db/guesses';
import { getPublicRound, listMoreFromSubreddit } from '@/db/rounds';
import { findOrCreateSoloSession } from '@/db/sessions';
import { getCurrentPlayer } from '@/lib/auth/current-player';
import { buildQuizJsonLd } from '@/lib/seo/quiz-jsonld';
import { getSiteUrl } from '@/lib/site-url';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { GuessClient } from './guess-client';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const db = createServiceRoleClient();
  const round = await getPublicRound(db, id);
  if (!round) {
    return { title: 'Round not found' };
  }
  const canonical = `/round/${round.id}`;
  return {
    title: round.title,
    description: `Guess the top comment on this r/${round.subreddit} post — "${round.title}".`,
    alternates: { canonical },
    openGraph: {
      title: round.title,
      description: `Guess the top comment on this r/${round.subreddit} post.`,
      type: 'article',
      url: canonical,
    },
  };
}

export default async function RoundPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const player = await getCurrentPlayer();
  if (!player) {
    redirect(`/welcome?next=${encodeURIComponent(`/round/${id}`)}`);
  }

  const db = createServiceRoleClient();
  const round = await getPublicRound(db, id);
  if (!round) notFound();

  const [session, rawRecentGuesses, moreFromSubreddit] = await Promise.all([
    findOrCreateSoloSession(db, { playerId: player.id, roundId: round.id }),
    listRecentGuessesForRound(db, {
      roundId: round.id,
      // Over-fetch so dedup-by-text still leaves us with up to 5 unique entries.
      limit: 20,
      minScore: SCORING_CONFIG.recentGuessesMinScore,
    }),
    listMoreFromSubreddit(db, {
      subreddit: round.subreddit,
      excludeRoundId: round.id,
      limit: 6,
    }),
  ]);

  const recentGuesses: { guessText: string }[] = [];
  const seen = new Set<string>();
  for (const g of rawRecentGuesses) {
    const key = g.guessText.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    recentGuesses.push(g);
    if (recentGuesses.length === 5) break;
  }

  const jsonLd = buildQuizJsonLd({
    title: round.title,
    subreddit: round.subreddit,
    url: `${getSiteUrl()}/round/${round.id}`,
  });

  return (
    <main className="mx-auto max-w-2xl p-6">
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: schema.org JSON-LD must be inlined
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <header className="mb-6 flex items-center justify-between">
        <p className="text-sm uppercase tracking-wide text-zinc-500">r/{round.subreddit}</p>
        <p className="text-sm text-zinc-600" data-testid="player-nickname">
          {player.nickname}
        </p>
      </header>
      <h1 className="mt-2 text-3xl font-semibold leading-tight">{round.title}</h1>
      <p className="mt-4 text-zinc-600">Guess what the top comment said. One sentence is enough.</p>
      <GuessClient roundId={round.id} sessionId={session.id} />

      {recentGuesses.length > 0 && (
        <aside aria-labelledby="recent-guesses-heading" className="mt-10 border-t pt-6">
          <h2
            id="recent-guesses-heading"
            className="text-sm font-semibold uppercase tracking-wide text-zinc-500"
          >
            Recent guesses
          </h2>
          <ul className="mt-3 space-y-2 text-zinc-700">
            {recentGuesses.map((g) => (
              <li key={g.guessText} className="text-sm italic">
                "{g.guessText}"
              </li>
            ))}
          </ul>
        </aside>
      )}

      {moreFromSubreddit.length > 0 && (
        <aside aria-labelledby="more-from-sub-heading" className="mt-10 border-t pt-6">
          <h2
            id="more-from-sub-heading"
            className="text-sm font-semibold uppercase tracking-wide text-zinc-500"
          >
            More from r/{round.subreddit}
          </h2>
          <ul className="mt-3 space-y-2">
            {moreFromSubreddit.map((r) => (
              <li key={r.id}>
                <Link href={`/round/${r.id}`} className="text-sm text-blue-700 hover:underline">
                  {r.title}
                </Link>
              </li>
            ))}
          </ul>
        </aside>
      )}

      <p className="mt-10 text-sm text-zinc-500">
        <Link href="/archive" className="hover:underline">
          Browse all rounds →
        </Link>
      </p>
    </main>
  );
}
