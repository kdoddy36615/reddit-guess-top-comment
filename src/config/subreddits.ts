/**
 * Subreddit allowlist for the ingest script. Adding a sub here + re-running
 * `pnpm ingest` is the entire onboarding flow for new content sources.
 *
 * All entries must be text-first; image/video subs (r/funny, r/facepalm) are
 * intentionally excluded — they need media to make sense.
 */
export const SUBREDDIT_ALLOWLIST = [
  'tifu',
  'AskReddit',
  'AmItheAsshole',
  'MaliciousCompliance',
  'Showerthoughts',
] as const;

export type AllowedSubreddit = (typeof SUBREDDIT_ALLOWLIST)[number];
