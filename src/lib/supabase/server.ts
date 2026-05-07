import { createClient } from '@supabase/supabase-js';
import { env } from '@/config/env';
import type { Database } from './database.types';

/**
 * Service-role Supabase client. Bypasses RLS — use only in server-side code
 * (route handlers, cron handlers, server components). NEVER ship this to the
 * browser.
 */
export function createServiceRoleClient() {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Supabase service-role client is not configured.');
  }
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
