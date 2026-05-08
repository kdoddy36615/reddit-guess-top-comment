import type { Redirect } from 'next/dist/lib/load-custom-routes';

/**
 * Legacy URL redirects per PRD #16 §Redirect map.
 *
 * Uses `statusCode: 301` (not `permanent: true`, which Next emits as 308) so
 * old links return the spec'd 301. Query strings are passed through to the
 * destination automatically — `/archive?page=2` lands at `/?page=2`.
 */
export const legacyRedirects: Redirect[] = [
  { source: '/round/:id', destination: '/play/solo', statusCode: 301 },
  { source: '/round/:id/result/:token', destination: '/play/solo', statusCode: 301 },
  { source: '/archive', destination: '/', statusCode: 301 },
  { source: '/welcome', destination: '/play/solo', statusCode: 301 },
  { source: '/sign-in', destination: '/login', statusCode: 301 },
  { source: '/daily', destination: '/play/daily', statusCode: 301 },
];
