import type { Metadata } from 'next';
import Link from 'next/link';
import { getCurrentPlayer } from '@/lib/auth/current-player';
import { StartPlayingButton } from './start-playing-button';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: { absolute: 'Guess the Top Comment — a Reddit guessing game' },
  description:
    'Read a Reddit post title. Guess what the top comment said. See how close you got. New rounds every day.',
  alternates: { canonical: '/' },
};

export default async function Home() {
  const player = await getCurrentPlayer();

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-6 p-6 text-center">
      <h1 className="text-4xl font-semibold leading-tight">Guess the top comment</h1>
      <p className="text-lg text-zinc-600">
        Read a Reddit post title. Guess what the top comment said. See how close you got.
      </p>
      <StartPlayingButton />
      {player && (
        <p className="text-sm text-zinc-500" data-testid="player-nickname">
          Playing as {player.nickname}
        </p>
      )}
      <nav className="flex gap-4 text-sm text-zinc-500">
        <Link href="/daily" className="hover:underline">
          Daily challenge
        </Link>
        <Link href="/archive" className="hover:underline">
          Browse all rounds
        </Link>
        <Link href="/sign-in" className="hover:underline">
          Sign in
        </Link>
      </nav>
    </main>
  );
}
