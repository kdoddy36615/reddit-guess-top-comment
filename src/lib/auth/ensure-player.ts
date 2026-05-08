import { createPlayer, getPlayerByAuthId, type Player } from '@/db/players';
import { generateNickname } from '@/lib/nickname/generate';
import { createSsrClient } from '@/lib/supabase/ssr';

/**
 * Resolve the calling player, creating an auto-nicknamed `players` row if the
 * auth user exists but hasn't onboarded yet. Used by `/rooms` action routes —
 * the room flow treats anonymous players as "drop in and play," so we mint a
 * generated nickname rather than gating behind a NicknamePrompt.
 *
 * Returns null when there's no auth user (the SSR page already handled
 * `signInAnonymously()`, so this is just a 401-able edge case).
 */
export async function ensureCurrentPlayer(): Promise<Player | null> {
  const supabase = await createSsrClient();
  const { data: userResp } = await supabase.auth.getUser();
  const authUser = userResp.user;
  if (!authUser) return null;

  const existing = await getPlayerByAuthId(supabase, authUser.id);
  if (existing) return existing;

  return createPlayer(supabase, {
    authUserId: authUser.id,
    nickname: generateNickname(),
  });
}
