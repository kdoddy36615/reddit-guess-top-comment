'use client';

import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import type { SubredditStat } from '@/lib/account/stats';
import { MIN_PASSWORD_LENGTH, validateUpgradeForm } from '@/lib/auth/upgrade-validation';
import { cn } from '@/lib/cn';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export type AccountStats = {
  bestDailyRun: { totalScore: number; dailyRoomId: string } | null;
  streak: { count: number; active: boolean };
  weekly: { completed: number; window: number };
  lifetimeGuesses: number;
  topSubs: SubredditStat[];
};

export interface AccountClientProps {
  isAnonymous: boolean;
  email: string | null;
  nickname: string | null;
  stats: AccountStats | null;
}

export function AccountClient({ isAnonymous, email, nickname, stats }: AccountClientProps) {
  return (
    <section data-testid="account" className="space-y-10 py-8">
      <header className="space-y-1">
        <p className="font-mono text-xs uppercase tracking-wider text-text-faint">your account</p>
        <h1 className="font-display text-2xl font-semibold leading-tight text-text">
          {nickname?.trim() || 'anon'}
        </h1>
        {email ? <p className="font-mono text-sm text-text-muted">{email}</p> : null}
      </header>

      {isAnonymous || !stats ? <UpgradeCard /> : <StatsGrid stats={stats} />}

      <SettingsSection isAnonymous={isAnonymous} />
    </section>
  );
}

function StatsGrid({ stats }: { stats: AccountStats }) {
  return (
    <section data-testid="stats-grid" aria-labelledby="stats-heading" className="space-y-3">
      <h2 id="stats-heading" className="font-mono text-xs uppercase tracking-wider text-text-faint">
        stats
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <StatCard label="Best daily run" testId="stat-best-run">
          {stats.bestDailyRun ? (
            <>
              <p className="font-display text-2xl font-semibold tabular-nums text-text">
                {stats.bestDailyRun.totalScore}
              </p>
              <p className="font-mono text-xs text-text-faint">
                {stats.bestDailyRun.dailyRoomId.replace(/^daily-/, '')}
              </p>
            </>
          ) : (
            <p className="text-sm text-text-muted">No daily runs yet.</p>
          )}
        </StatCard>

        <StatCard label="Daily streak" testId="stat-streak">
          <p
            className={cn(
              'font-display text-2xl font-semibold tabular-nums',
              stats.streak.active ? 'text-accent-2' : 'text-text',
            )}
          >
            {stats.streak.count} {stats.streak.count === 1 ? 'day' : 'days'}
            {stats.streak.active ? (
              <span role="img" aria-label="active streak" className="ml-2">
                🔥
              </span>
            ) : null}
          </p>
          <p className="font-mono text-xs text-text-faint">
            {stats.streak.active ? 'keep it going.' : 'play today to start a streak.'}
          </p>
        </StatCard>

        <StatCard label="This week" testId="stat-weekly">
          <p className="font-display text-2xl font-semibold tabular-nums text-text">
            {stats.weekly.completed}
            <span className="text-text-muted">/</span>
            {stats.weekly.window}
          </p>
          <p className="font-mono text-xs text-text-faint">dailies completed</p>
        </StatCard>

        <StatCard label="Lifetime guesses" testId="stat-lifetime-guesses">
          <p className="font-display text-2xl font-semibold tabular-nums text-text">
            {stats.lifetimeGuesses.toLocaleString()}
          </p>
          <p className="font-mono text-xs text-text-faint">submitted across all rounds</p>
        </StatCard>

        <Card className="sm:col-span-2" data-testid="stat-top-subs">
          <p className="font-mono text-xs uppercase tracking-wider text-text-faint">
            Top subreddits by accuracy
          </p>
          {stats.topSubs.length === 0 ? (
            <p className="mt-2 text-sm text-text-muted">Play some rounds to see your specialty.</p>
          ) : (
            <ol className="mt-3 space-y-2">
              {stats.topSubs.map((s, i) => (
                <li
                  key={s.subreddit}
                  className="flex items-baseline gap-3 rounded-md border border-border bg-surface px-3 py-2"
                  data-testid="top-sub-row"
                >
                  <span className="font-mono text-xs text-text-faint tabular-nums">#{i + 1}</span>
                  <span className="flex-1 font-mono text-sm text-accent">r/{s.subreddit}</span>
                  <span className="font-mono text-xs text-text-faint tabular-nums">
                    {s.plays} {s.plays === 1 ? 'play' : 'plays'}
                  </span>
                  <span className="font-display text-md font-semibold tabular-nums text-text">
                    {s.averageScore}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>
    </section>
  );
}

function StatCard({
  label,
  testId,
  children,
}: {
  label: string;
  testId: string;
  children: React.ReactNode;
}) {
  return (
    <Card data-testid={testId}>
      <p className="font-mono text-xs uppercase tracking-wider text-text-faint">{label}</p>
      <div className="mt-2 space-y-1">{children}</div>
    </Card>
  );
}

function UpgradeCard() {
  return (
    <Card data-testid="upgrade-card" className="space-y-2 border-accent-soft bg-accent-soft/30">
      <p className="font-mono text-xs uppercase tracking-wider text-accent">save your scores</p>
      <p className="font-display text-md font-semibold text-text">
        You're playing as an anonymous guest.
      </p>
      <p className="text-sm text-text-muted">
        Add an email and password below to keep your daily runs, leaderboard rank, and streak across
        devices.
      </p>
    </Card>
  );
}

function SettingsSection({ isAnonymous }: { isAnonymous: boolean }) {
  return (
    <section
      data-testid="settings-section"
      aria-labelledby="settings-heading"
      className="space-y-3"
    >
      <h2
        id="settings-heading"
        className="font-mono text-xs uppercase tracking-wider text-text-faint"
      >
        settings
      </h2>
      {isAnonymous ? (
        <UpgradeForm />
      ) : (
        <div className="space-y-3">
          <ChangePasswordForm />
          <SignOutCard />
          <DeleteAccountCard permanent />
        </div>
      )}
    </section>
  );
}

function UpgradeForm() {
  const router = useRouter();
  const { toast } = useToast();
  const emailId = useId();
  const passwordId = useId();
  const errorId = useId();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validation = validateUpgradeForm({ email, password });
    if (!validation.ok) {
      setError(validation.error);
      toast({ title: 'Check the form', description: validation.error, variant: 'error' });
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const supabase = getSupabaseBrowserClient();
      // Per architectural commitment #3, the anonymous → permanent upgrade
      // keeps the same auth.users row so player history follows the user.
      // The Supabase JS SDK's linkIdentity() only supports OAuth providers;
      // for email + password we use updateUser(), which Supabase documents
      // as the anon-upgrade path and which preserves auth.uid() in place.
      const { error: upgradeError } = await supabase.auth.updateUser({
        email: email.trim(),
        password,
      });
      if (upgradeError) {
        setError(upgradeError.message);
        toast({
          title: 'Upgrade failed',
          description: upgradeError.message,
          variant: 'error',
        });
        return;
      }
      toast({
        title: 'Account saved',
        description: 'Your scores will follow this email + password from now on.',
      });
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upgrade failed';
      setError(message);
      toast({ title: 'Upgrade failed', description: message, variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  }

  const hasError = error !== null;
  return (
    <Card data-testid="upgrade-form" className="space-y-4">
      <form onSubmit={onSubmit} className="space-y-3" noValidate>
        <div className="space-y-1.5">
          <label htmlFor={emailId} className="block font-medium text-sm text-text-muted">
            Email
          </label>
          <Input
            id={emailId}
            name="email"
            type="email"
            autoComplete="email"
            required
            disabled={submitting}
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={hasError}
            aria-describedby={hasError ? errorId : undefined}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor={passwordId} className="block font-medium text-sm text-text-muted">
            Password
          </label>
          <Input
            id={passwordId}
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={MIN_PASSWORD_LENGTH}
            disabled={submitting}
            placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={hasError}
            aria-describedby={hasError ? errorId : undefined}
          />
        </div>
        {error ? (
          <p id={errorId} role="alert" className="text-danger text-sm" data-testid="upgrade-error">
            {error}
          </p>
        ) : null}
        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full"
          loading={submitting}
          disabled={submitting}
          data-testid="upgrade-submit"
        >
          {submitting ? 'Saving…' : 'Save my scores'}
        </Button>
      </form>
    </Card>
  );
}

function ChangePasswordForm() {
  const { toast } = useToast();
  const passwordId = useId();
  const errorId = useId();
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < MIN_PASSWORD_LENGTH) {
      const msg = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
      setError(msg);
      toast({ title: 'Check the form', description: msg, variant: 'error' });
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message);
        toast({
          title: 'Could not update password',
          description: updateError.message,
          variant: 'error',
        });
        return;
      }
      setPassword('');
      toast({
        title: 'Password updated',
        description: 'Use the new password next time you log in.',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Update failed';
      setError(message);
      toast({ title: 'Could not update password', description: message, variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  }

  const hasError = error !== null;
  return (
    <Card data-testid="change-password-form" className="space-y-3">
      <div>
        <p className="font-display text-md font-semibold text-text">Change password</p>
        <p className="text-sm text-text-muted">
          Pick a new password — at least {MIN_PASSWORD_LENGTH} characters.
        </p>
      </div>
      <form onSubmit={onSubmit} className="space-y-3" noValidate>
        <div className="space-y-1.5">
          <label htmlFor={passwordId} className="block font-medium text-sm text-text-muted">
            New password
          </label>
          <Input
            id={passwordId}
            type="password"
            autoComplete="new-password"
            required
            minLength={MIN_PASSWORD_LENGTH}
            disabled={submitting}
            placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={hasError}
            aria-describedby={hasError ? errorId : undefined}
          />
        </div>
        {error ? (
          <p
            id={errorId}
            role="alert"
            className="text-danger text-sm"
            data-testid="change-password-error"
          >
            {error}
          </p>
        ) : null}
        <Button
          type="submit"
          variant="secondary"
          size="md"
          loading={submitting}
          disabled={submitting}
          data-testid="change-password-submit"
        >
          {submitting ? 'Updating…' : 'Update password'}
        </Button>
      </form>
    </Card>
  );
}

function SignOutCard() {
  const router = useRouter();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  async function onClick() {
    setSubmitting(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) {
        toast({
          title: 'Sign out failed',
          description: signOutError.message,
          variant: 'error',
        });
        return;
      }
      router.replace('/');
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="flex items-center justify-between gap-3" data-testid="sign-out-card">
      <div>
        <p className="font-display text-md font-semibold text-text">Sign out</p>
        <p className="text-sm text-text-muted">End this session on this device.</p>
      </div>
      <Button
        type="button"
        variant="secondary"
        size="md"
        onClick={onClick}
        loading={submitting}
        disabled={submitting}
        data-testid="sign-out-button"
      >
        {submitting ? 'Signing out…' : 'Sign out'}
      </Button>
    </Card>
  );
}

function DeleteAccountCard({ permanent }: { permanent: boolean }) {
  const router = useRouter();
  const { toast } = useToast();
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function onConfirm() {
    setSubmitting(true);
    try {
      const res = await fetch('/api/account/delete', { method: 'POST' });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        toast({
          title: 'Could not delete account',
          description: body?.error ?? 'Try again later.',
          variant: 'error',
        });
        return;
      }
      router.replace('/');
      router.refresh();
    } finally {
      setSubmitting(false);
      setConfirming(false);
    }
  }

  if (!permanent) return null;

  return (
    <Card className="space-y-3 border-danger/40" data-testid="delete-account-card">
      <div>
        <p className="font-display text-md font-semibold text-danger">Delete account</p>
        <p className="text-sm text-text-muted">
          Removes your account and every guess, daily run, and report attached to it. This cannot be
          undone.
        </p>
      </div>
      {confirming ? (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="danger"
            size="md"
            onClick={onConfirm}
            loading={submitting}
            disabled={submitting}
            data-testid="delete-account-confirm"
          >
            {submitting ? 'Deleting…' : 'Yes, delete everything'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="md"
            onClick={() => setConfirming(false)}
            disabled={submitting}
            data-testid="delete-account-cancel"
          >
            Cancel
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="danger"
          size="md"
          onClick={() => setConfirming(true)}
          data-testid="delete-account-button"
        >
          Delete account
        </Button>
      )}
    </Card>
  );
}
