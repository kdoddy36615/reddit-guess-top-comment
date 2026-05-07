import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentAuthStatus } from '@/lib/auth/current-player';
import { SignInClient } from './sign-in-client';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Sign in',
  robots: { index: false, follow: true },
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const status = await getCurrentAuthStatus();
  // Already permanently signed in — bypass the form.
  if (status && !status.isAnonymous) {
    redirect(next ?? '/');
  }

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-semibold">Sign in</h1>
      <p className="mt-2 text-zinc-600">
        Enter the email and password you used when you saved your scores.
      </p>
      <SignInClient nextPath={next ?? '/'} />
    </main>
  );
}
