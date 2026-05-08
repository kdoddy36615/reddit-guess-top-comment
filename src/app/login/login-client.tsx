'use client';

import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { validateUpgradeForm } from '@/lib/auth/upgrade-validation';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export function LoginClient({ nextPath }: { nextPath: string }) {
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
      toast({
        title: 'Check the form',
        description: validation.error,
        variant: 'error',
      });
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) {
        setError(signInError.message);
        toast({
          title: 'Could not log in',
          description: signInError.message,
          variant: 'error',
        });
        return;
      }
      router.replace(nextPath);
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Log-in failed';
      setError(message);
      toast({ title: 'Could not log in', description: message, variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  }

  const hasError = error !== null;

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-3" noValidate>
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
          autoComplete="current-password"
          required
          disabled={submitting}
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={hasError}
          aria-describedby={hasError ? errorId : undefined}
        />
      </div>

      {error ? (
        <p id={errorId} data-testid="login-error" role="alert" className="text-danger text-sm">
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
        data-testid="login-submit"
      >
        {submitting ? 'Logging in…' : 'Log in'}
      </Button>
    </form>
  );
}
