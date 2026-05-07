import { z } from 'zod';

/**
 * Zod schemas for the Reddit JSON shapes we consume. These match both the
 * public `https://www.reddit.com/...json` endpoints (today, scrape-mode) and
 * the OAuth `https://oauth.reddit.com/...` endpoints (Phase 1.5). Same shape;
 * the swap touches only the client base URL + auth header.
 */

// --- Listings (top posts) -----------------------------------------------------

// `.passthrough()` keeps unknown keys (preview, gallery_data, media_metadata,
// is_gallery, thumbnail, domain, ...) so the orchestrator can store the full
// raw post `data` object on `rounds.reddit_data` for future image rendering
// without re-hitting Reddit. See `memory/project_images_future.md`.
export const RedditPostDataSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    subreddit: z.string(),
    permalink: z.string(),
    url: z.string(),
    score: z.number(),
    stickied: z.boolean(),
    over_18: z.boolean(),
    is_video: z.boolean(),
    post_hint: z.string().optional(),
  })
  .passthrough();
export type RedditPostData = z.infer<typeof RedditPostDataSchema>;

export const RedditListingSchema = z.object({
  kind: z.literal('Listing'),
  data: z.object({
    children: z.array(z.object({ kind: z.literal('t3'), data: RedditPostDataSchema })),
  }),
});

// --- Comment trees ------------------------------------------------------------

export const RedditCommentDataSchema = z.object({
  id: z.string(),
  body: z.string(),
  author: z.string(),
  score: z.number(),
});
export type RedditCommentData = z.infer<typeof RedditCommentDataSchema>;

// The comments endpoint returns a 2-element tuple: [postListing, commentListing].
// We only need the comment listing (index 1). `more` placeholders may appear
// alongside `t1` entries; we ignore non-`t1` entries.
export const RedditCommentChildSchema = z.union([
  z.object({ kind: z.literal('t1'), data: RedditCommentDataSchema }),
  z.object({ kind: z.literal('more') }).passthrough(),
]);

export const RedditCommentsResponseSchema = z.tuple([
  z.object({ kind: z.literal('Listing') }).passthrough(),
  z.object({
    kind: z.literal('Listing'),
    data: z.object({ children: z.array(RedditCommentChildSchema) }),
  }),
]);
