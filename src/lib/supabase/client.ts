'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './database.types';

let cached: ReturnType<typeof createBrowserClient<Database>> | null = null;

/**
 * Browser-side Supabase client. Used for `signInAnonymously()`,
 * `linkIdentity()`, and any client-side reads. Auth cookies are managed by
 * @supabase/ssr so they propagate to server-side clients.
 */
export function getSupabaseBrowserClient() {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error('Supabase browser client is not configured.');
  }
  cached = createBrowserClient<Database>(url, anon);
  return cached;
}
