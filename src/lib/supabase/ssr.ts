import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { env } from '@/config/env';
import type { Database } from './database.types';

/**
 * Server-side Supabase client wired to Next's cookie store. Use in:
 *   - Server Components (read-only, set/remove no-op)
 *   - Route Handlers and Server Functions (read+write)
 *
 * Reads the user's JWT from cookies, so RLS policies see `auth.uid()`.
 */
export async function createSsrClient() {
  const cookieStore = await cookies();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error('Supabase SSR client is not configured.');
  }
  return createServerClient<Database>(url, anon, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => {
        try {
          for (const { name, value, options } of toSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components can't set cookies; ignore. Route handlers and
          // server actions do work because they run after rendering.
        }
      },
    },
  });
}
