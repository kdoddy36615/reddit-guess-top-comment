import { createHash } from 'node:crypto';

/**
 * Deterministic 8-char URL-safe token for a (player, round) pair.
 *
 * Used to build /round/[id]/result/[token] share links. Stability matters —
 * a player who shared their result yesterday must reach the same URL today,
 * so this is a pure hash with no salt or expiry.
 */
export function shareToken(playerId: string, roundId: string): string {
  return createHash('sha256').update(`${playerId}:${roundId}`).digest('base64url').slice(0, 8);
}
