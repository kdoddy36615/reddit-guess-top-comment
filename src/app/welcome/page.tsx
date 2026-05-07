import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentPlayer } from '@/lib/auth/current-player';
import { OnboardClient } from './onboard-client';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Pick a name and play',
  robots: { index: false, follow: true },
};

export default async function WelcomePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const player = await getCurrentPlayer();
  // Returning visitor with a player row — bypass the prompt.
  if (player) redirect(next ?? '/');

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-semibold">Pick a name and play</h1>
      <p className="mt-2 text-zinc-600">
        No signup. Your name shows up on your reveal screen and any results you share.
      </p>
      <OnboardClient nextPath={next ?? '/'} />
      <p className="mt-6 text-sm text-zinc-500">
        Already saved your scores?{' '}
        <Link
          href={`/sign-in?next=${encodeURIComponent(next ?? '/')}`}
          className="underline hover:text-zinc-700"
        >
          Sign in
        </Link>
      </p>
    </main>
  );
}
