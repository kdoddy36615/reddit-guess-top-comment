'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Toaster, useToast } from '@/components/ui/toast';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

/**
 * Tiny client island that establishes an anonymous Supabase session on first
 * visit and refreshes the route so SSR can render the real /play/solo content.
 *
 * Server Components can't write auth cookies, so we delegate the
 * `signInAnonymously()` call to the browser client and trigger `router.refresh()`
 * once the cookie is set.
 */
export function AnonBootstrap() {
  const router = useRouter();
  const { toast } = useToast();
  const startedRef = useRef(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    let cancelled = false;
    (async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const existing = await supabase.auth.getUser();
        if (!existing.data.user) {
          const { error } = await supabase.auth.signInAnonymously();
          if (error) throw error;
        }
        if (cancelled) return;
        router.refresh();
      } catch (err) {
        if (cancelled) return;
        toast({
          title: 'Could not start a session',
          description: err instanceof Error ? err.message : 'Try refreshing the page.',
          variant: 'error',
        });
        setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router, toast]);

  return (
    <div
      data-testid="anon-bootstrap"
      className="py-12 text-center font-mono text-sm text-text-muted"
    >
      {failed ? 'Could not start a session. Refresh the page to try again.' : 'starting up…'}
      <Toaster />
    </div>
  );
}
