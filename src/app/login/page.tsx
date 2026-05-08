import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Toaster } from '@/components/ui/toast';
import { getCurrentAuthStatus } from '@/lib/auth/current-player';
import { LoginClient } from './login-client';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Log in',
  robots: { index: false, follow: true },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const status = await getCurrentAuthStatus();
  if (status && !status.isAnonymous) {
    redirect(next ?? '/');
  }

  const safeNext = next?.startsWith('/') ? next : '/';

  return (
    <main className="mx-auto w-full max-w-md px-4 py-12 md:py-16">
      <header className="text-center">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-md text-text outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
        >
          <span aria-hidden="true" className="text-accent text-xl leading-none">
            ◆
          </span>
          <span className="font-display font-semibold text-lg tracking-tight">guesstop</span>
        </Link>
        <h1 className="mt-6 font-display font-semibold text-2xl text-text leading-tight">
          Welcome back.
        </h1>
        <p className="mt-2 text-sm text-text-muted">
          Log in to keep your scores in sync across devices.
        </p>
      </header>

      <LoginClient nextPath={safeNext} />

      <p className="mt-6 text-center text-sm text-text-muted">
        New here?{' '}
        <Link
          href="/signup"
          className="text-accent underline-offset-2 hover:underline focus-visible:underline"
        >
          Create an account
        </Link>
      </p>

      <Toaster />
    </main>
  );
}
