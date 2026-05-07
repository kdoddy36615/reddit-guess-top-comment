/**
 * Pure mapping from auth status + nickname → avatar-menu variant.
 *
 * Per DESIGN.md §"Avatar menu states" / PRD #16:
 *   - anonymous: no session, or anonymous session with no nickname yet
 *   - guest:     anonymous session that has picked a nickname
 *   - permanent: linkIdentity’d account (email/password attached)
 *
 * No I/O — this lives in src/lib/auth so the AvatarMenu component (and any
 * server component resolving the variant for SSR) can import it without
 * pulling in Supabase / DB code.
 */

export type AvatarMenuState = 'anonymous' | 'guest' | 'permanent';

export interface AvatarMenuStateInput {
  /**
   * `true` when the auth user is `signInAnonymously`'d.
   * `false` when the user has `linkIdentity`'d (permanent).
   * `null` when there is no auth session at all.
   */
  isAnonymous: boolean | null;
  /** The player's chosen nickname, or null/empty if not picked yet. */
  nickname: string | null;
}

export function getAvatarMenuState({
  isAnonymous,
  nickname,
}: AvatarMenuStateInput): AvatarMenuState {
  if (isAnonymous === false) return 'permanent';
  if (isAnonymous === true && nickname && nickname.trim().length > 0) return 'guest';
  return 'anonymous';
}
