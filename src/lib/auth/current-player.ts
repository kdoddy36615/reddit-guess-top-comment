import { getPlayerByAuthId, type Player } from '@/db/players';
import { createSsrClient } from '@/lib/supabase/ssr';

/**
 * Resolves the current player from the auth cookie.
 *
 * Returns null when:
 *   - no auth user (cookie absent or invalid), or
 *   - auth user exists but no `players` row yet (mid-onboarding).
 *
 * Callers decide whether to redirect to onboarding or 401.
 */
export async function getCurrentPlayer(): Promise<Player | null> {
  const supabase = await createSsrClient();
  const { data: userResp } = await supabase.auth.getUser();
  const authUser = userResp.user;
  if (!authUser) return null;
  return getPlayerByAuthId(supabase, authUser.id);
}
