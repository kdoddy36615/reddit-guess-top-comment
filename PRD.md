# PRD — Reddit Comment Guessing Game

> Synthesized from the `/grill-me` session on 2026-05-07. Source: `INITIAL_PLAN.md` plus 9 design questions.

## Problem Statement

Casual gamers, Twitch streamers, and TikTok-native viewers want short-form, social, instantly-shareable game content. Existing daily-puzzle games (Wordle, Connections, GeoGuessr daily) prove the format, but most are word- or trivia-based — not optimized for funny moments, reaction clips, or stream-friendly call-and-response. Players don't want to sign up, install anything, or wait for a round to load. Streamers don't want to share a link to a game that requires their viewers to authenticate.

There is no game today that turns Reddit's vast back-catalog of "title + top comment" punchlines into a guess-the-payoff format that's fast enough for a 30-second TikTok and clean enough to host a streamer-led viewer room.

## Solution

A web game where each round shows a Reddit post title and subreddit. The player types what they think the top comment said. The system scores the guess against the actual top comment using semantic embeddings as the base signal, with structural "vibes bonuses" (matched the punchline word, matched the joke structure, etc.) layered on top. The reveal shows the actual comment, the score, a reaction message, and a one-tap share card.

The game ships in two phases:

- **Phase 1 (MVP, "Mode 2"):** Solo-on-stream. Polished single-player loop optimized for Twitch readability and TikTok clip-ability. Guest usernames, no signup, no rooms.
- **Phase 2 ("Mode 1," planned):** Streamer-hosted multiplayer rooms. Streamer creates a room code, viewers join on their own devices, everyone sees the same Reddit post, submits within a timer, scores reveal simultaneously, leaderboard displayed. Streamer competes alongside viewers by default; host-only mode is a future toggle.

The MVP architecture is built room-aware from day one so Phase 2 is an additive feature, not a schema migration.

## User Stories

### Player onboarding
1. As a first-time visitor, I want to start playing immediately without any signup, so that I'm not deterred by friction before I've seen the game.
2. As a first-time visitor, I want to pick a guest username on my first guess, so that my reveal screen and any future share cards feel personal.
3. As a returning visitor, I want my username and play history to persist via cookie, so that I don't have to re-introduce myself every visit.
4. As a returning visitor who's invested in the game, I want to "save my scores" by adding an email and password, so that my history follows me across devices and incognito sessions.

### Solo gameplay (Phase 1)
5. As a player, I want to land on a round page and see only the post title and subreddit, so that the puzzle is intact and the answer isn't spoiled in the page text.
6. As a player, I want to type my guess into a single text field and submit with one tap or Enter, so that the loop feels fast.
7. As a player, I want to see my score as a number 0–100 with a clear color band (Way Off / Almost / Close / Bullseye), so that I get a strong dopamine signal.
8. As a player, I want to see the actual top comment after I guess, so that I learn the answer and can react.
9. As a player, I want a one-line reaction message tied to my score band (e.g. "Close enough!"), so that the reveal feels game-like and not data-dump-like.
10. As a player, I want to see *why* I scored what I did (e.g. "+20 punchline match"), so that the score feels legible and I can play strategically.
11. As a player, I want to immediately advance to the next round with a single tap, so that play stays in the dopamine loop.
12. As a player who hits a clunker, I want a "Skip" affordance, so that I'm not stuck on a round that doesn't land.
13. As a player, I want to see a few anonymized recent guesses on the round page (the ones above a relevance threshold), so that I have additional content to react to and the page has texture.

### Daily challenge
14. As a player, I want a "Daily" page with the same 5 rounds for everyone today, so that I can compare scores with friends and streamers.
15. As a player, I want to see my running daily total as I progress through the 5 rounds, so that there's a sense of completion.
16. As a player, I want to see "X/5 today" on my final daily reveal, so that I have a discrete number to share.
17. As a player, I want a stable URL for today's daily that re-rolls at midnight UTC, so that links work for the rest of today and not after.

### Sharing & virality
18. As a player who scored well, I want a one-tap share button that creates a unique URL with my score baked in, so that friends see my result before they play.
19. As a recipient of a share link, I want the OG card preview in Discord/Twitter/Reddit to show the friend's score and guess, so that I'm enticed to click through.
20. As a recipient who clicks a share link, I want to see "Kevin got 92% — beat it!" above the round, so that the play has a clear stake.
21. As a player, I want my share URL to remain stable indefinitely, so that links continue to work weeks later.
22. As a player, I want the share card to NOT spoil the actual top comment to viewers who haven't played, so that virality doesn't undercut the game.

### Streamer use case (Phase 1)
23. As a streamer, I want round pages to be readable on a 1080p stream overlay (large fonts, high contrast), so that my viewers can read the puzzle without squinting.
24. As a streamer, I want viewers to be able to load the same round on their devices via a clean URL, so that they can play along even if Phase 1 doesn't have rooms yet.
25. As a streamer, I want the reveal animation to be punchy and brief (under 2s), so that it suits a clip-friendly cadence.

### Multiplayer rooms (Phase 2 — architectural commitment, not MVP)
26. As a streamer, I want to create a room with a 6-character code, so that I can share it in chat.
27. As a viewer, I want to join a room with the code without signing up, so that I can play instantly.
28. As a player in a room, I want everyone in the room to see the same round at the same time, so that the game feels synchronized.
29. As a player in a room, I want a 30-second guess timer per round, so that the game has stakes and pace.
30. As a player in a room, I want to see scores reveal simultaneously after everyone has submitted (or the timer expires), so that the reveal feels like an event.
31. As a player in a room, I want a leaderboard at the end of the 5 rounds, so that there's a winner.
32. As a streamer in a room, I want to compete alongside viewers by default, so that I don't have to set up "host mode" the first time.
33. As a streamer running a viewer event, I want a future host-only mode where I MC instead of competing, so that my own score doesn't distract.

### Discoverability (SEO)
34. As a Google searcher who types a Reddit post title verbatim, I want to find a round page on this site, so that I can play it as a puzzle.
35. As a player browsing without a destination, I want an `/archive` page that paginates through every round, so that I can browse old puzzles.
36. As a search engine crawler, I want round pages to be fully server-rendered HTML with unique titles and meta descriptions, so that I can index them effectively.
37. As a search engine crawler, I want a `sitemap.xml` listing all published rounds, so that I can find them efficiently.
38. As a crawler, I want robots.txt to allow round pages, so that they're indexable.
39. As a player, I want round pages to load instantly (sub-second), so that the experience feels native.

### Content quality
40. As a player, I want every round I play to have a top comment that's a legitimately guessable payoff to the title (not insider context, not "lol", not a wall of text), so that the game feels fair.
41. As a player who hits a bad round, I want a "Report" button, so that I can flag it and protect future players.
42. As an operator, I want rounds reported above a threshold to auto-unpublish, so that quality is self-correcting without me babysitting.
43. As an operator, I want a way to manually unpublish a round, so that I have a fast escape hatch.

### Reliability & cost (operator stories)
44. As an operator, I want strict daily cost caps on the Gemini API, so that a bug can't trigger an unexpected $1000 bill.
45. As an operator, I want a manual kill-switch env var, so that I can halt all background jobs from the Vercel dashboard without a deploy.
46. As an operator, I want a `cron_runs` table that logs every pull and process job, so that I can debug "why didn't new rounds appear today" in 30 seconds.
47. As an operator, I want analytics on rounds played, session length, and abandonment, so that I can tell whether the game answers "is this fun for 20+ rounds."

## Implementation Decisions

### Architectural commitments (load-bearing for Phase 2)

The MVP is solo-only ("Mode 2"), but every architectural decision below preserves a non-migration path to streamer-hosted multiplayer rooms ("Mode 1"). Specifically:

- **Server-authoritative round serving.** The server (not the client) decides which round comes next. In Mode 1, every player in a room must see the same round; this is impossible to retrofit if the client is choosing.
- **`game_sessions` is a first-class table.** Solo play = a session with one player and `room_id = NULL`. Daily play = a session keyed to `room_id = "daily-YYYY-MM-DD"`. Real rooms in Phase 2 slot in with a generated 6-char `room_id`.
- **Stable anonymous `player_id` from cookie.** A solo player becomes "Player 1" in a future room with no migration.
- **Guesses keyed to `(session_id, round_id, player_id)`.** Phase 2 just adds rows; no schema changes.
- **Round lifecycle as a state machine** (`guessing → revealed → session_complete`). In Mode 1, `guessing` becomes "timer running, awaiting N submissions" — same states, more participants.
- **Stack stays websocket-capable.** Supabase Realtime is in the stack; it's free for our use and naturally fits Phase 2.

### Scoring — pure deep module

`scoreGuess(guess, context) → ScoreBreakdown` is a pure, deterministic function with no I/O. Embeddings are computed at the boundary (in the route handler) and passed in. This keeps scoring trivially testable, easily swappable, and free to evolve. Algorithm shape:

```
base = clamp(0, 100, sigmoid_curve(cosine_similarity) * 100)
bonuses (open list, additive):
  + punchline_word match    (+20 default)
  + key_noun match          (+5)
  + joke_structure pattern  (+10)
  + keyword overlap         (+5)
finalScore = clamp(0, 100, base + sum(bonuses))
```

`ScoreBreakdown` is a structured object (`base`, `bonuses[]`, `finalScore`) that serializes directly to the `guesses.score_breakdown` JSONB column and powers the reveal UI's "+20 punchline match" explainability. The base curve and bonus weights are tuning knobs in `src/config/scoring.ts`; the function shape (one base + N bonuses + clamp) is stable.

### Scoring is NOT async by design

`scoreGuess` is synchronous to keep it pure and trivially testable. If a future iteration needs LLM-based scoring (e.g. "ask Claude to grade the joke"), the interface would need to become async — that's an acknowledged future breaking change, accepted as the cost of keeping today's interface clean.

### Content sourcing — script-based ingest (frozen corpus)

For MVP, content is ingested via a one-shot local script since Reddit API access is gated behind a slow review queue post-Devvit. The script runs from a residential IP and produces a frozen corpus of ~120–130 published rounds — enough for ~25 days of unique daily-5 content plus freeplay variety. Re-run on demand to add a new subreddit or refresh the corpus.

```
INGEST SCRIPT  pnpm ingest                          run locally, on-demand
  → public Reddit JSON (https://www.reddit.com/r/{sub}/top.json?t=year&limit=100)
    no auth, residential IP, 1.5s pacing, real User-Agent
  → for each candidate post:
      - pre-flight skip if reddit_post_id already in `rounds` (saves Gemini calls)
      - deterministic filters (deleted/AutoMod/stickied/video/image-only/NSFW/short)
      - Gemini gate call → verdict + reasoning + difficulty + 3 structural tags
      - if reject:  insert row with status='rejected' (durable, not re-gated on re-run)
      - if publish: Gemini embed call for top comment → insert status='auto_published'
```

The gate is biased toward over-rejection in its prompt — false negatives cost nothing (Reddit supply is infinite), false positives are the only failure mode worth preventing. Quality is self-correcting via the user-facing Report button (3 reports auto-unpublishes), with a weekly 5-minute spot-check on rounds with low average scores.

Initial subreddit allowlist (hardcoded in `src/config/subreddits.ts`): `tifu`, `AskReddit`, `AmItheAsshole`, `MaliciousCompliance`, `Showerthoughts`. Adding a subreddit is a one-line config change followed by re-running `pnpm ingest`.

**Phase 1.5 — when Reddit API access lands.** The cron-based pipeline returns to provide continuous fresh content: hourly `/api/cron/pull` (OAuth client_credentials, `t=day`, INSERT pending_gate rows) + 5-min `/api/cron/process` (gate + embed pending rows in batches of 50). The swap is small by design: `src/lib/reddit/client.ts` switches `baseUrl` to `oauth.reddit.com` and adds an `Authorization` header; `src/lib/gemini/{gate,embed}.ts` are unchanged; the new cron route handlers import the same `gate()` and `embed()` functions the script uses today. `cron_budget` + `cron_runs` tables are already in the schema, inert until cron returns.

### Round selection

- **Freeplay (`/`)**: server picks one round at a time uniformly at random from `auto_published` rounds, excluding any the player already guessed in this session. The Gemini gate is the only quality/difficulty filter; `rounds.difficulty` is stored for display/analytics but does not influence selection. Difficulty banding (easy-first ramp) can be reintroduced later as a tuning pass — same interface, different `pickRound` body.
- **Daily (`/daily`)**: 5 rounds auto-picked at midnight UTC via a deterministic seed derived from the date. Stored as a `game_sessions` row with `mode='daily'` and `room_id='daily-YYYY-MM-DD'`, plus 5 pre-filled `session_rounds`. A manual override (set the 5 round IDs by hand) is a future 10-line admin feature, not in MVP.
- **Phase 2 rooms**: same `game_sessions` mechanism, with `mode='room'` and a generated 6-char `room_id`. No new table.

### Schema (7 tables)

1. **`rounds`** — Reddit post + LLM gate output + 768-dim embedding (Gemini `gemini-embedding-001` with `outputDimensionality: 768`) + lifecycle status (`pending_gate | auto_published | rejected | reported | unpublished`) + a `reddit_data` JSONB column that captures the full raw Reddit post object at ingest time (preview, gallery_data, media_metadata, thumbnail, domain, …) so a future image-display slice can render attachments without re-hitting Reddit. Reddit data and game metadata are denormalized into this single table; we'll split if a round is ever derived from a non-Reddit source.
2. **`players`** — anonymous identity. `nickname`, `cookie_hash`, optional later linkage to `auth.users` via Supabase anonymous auth.
3. **`game_sessions`** — solo, daily, or room. State machine on `current_round_id` + `current_round_state` (`guessing | revealed | session_complete`). `UNIQUE (mode, room_id)` prevents duplicate daily sessions.
4. **`session_rounds`** — ordered round sequence per session. Pre-filled for daily/room, appended one-at-a-time for freeplay.
5. **`guesses`** — keyed `(session_id, round_id, player_id)`, `UNIQUE` enforced. `score_breakdown` is JSONB so the bonus list can evolve without migrations.
6. **`guess_embedding_cache`** — `normalized_text → vector(768)`, with `hit_count` for free analytics on common guesses. Cache embeddings (not scores) so score-algorithm changes never invalidate the cache.
7. **`cron_budget`** + **`cron_runs`** — daily cost circuit breaker (`halted` flag) + per-run observability log.

(`session_players` join table is **not** in MVP. Phase 2 adds it as a feature, not a migration. Solo play derives "who's in this session" from `SELECT DISTINCT player_id FROM guesses`.)

### Anonymous identity via Supabase

Players pick a guest nickname on first visit. We call `supabase.auth.signInAnonymously()`, which creates an `auth.users` row with no email/password and sets a JWT cookie. We insert a `players` row with the nickname and `auth_user_id`. Players experience no signup flow.

When players later choose to "save my scores," `supabase.auth.linkIdentity({ provider: 'email', email, password })` upgrades the same `auth.users` row in place — all guess history follows the user with zero migration. This is the chosen mechanism over a hand-rolled signed cookie because the upgrade path is built-in.

### Cost controls — three independent layers

1. **Google Cloud billing budget** — $10/month with alerts at $2/$5/$10, plus a Pub/Sub trigger that disables the API key at 100%. Credit card stops at $10 even if every other safeguard fails.
2. **App-level circuit breaker** — `cron_budget` table tracks daily spend. Every cron handler checks `halted`, `est_cost_usd`, and per-run caps before doing work. Daily hard cap default: $1.00. Per-run candidate cap: 50. *Deferred until Phase 1.5; the MVP ingest script is bounded at ~$0.06 per run by design (500 candidates × Gemini Flash) so the circuit breaker has no work to do yet.*
3. **Manual killswitch** — `CRON_KILLSWITCH=true` env var on Vercel halts all cron handlers immediately on next tick. No deploy needed. *Deferred with the cron infra; the script halts cleanly via Ctrl+C.*

### Tech stack

- **Frontend:** Next.js 15 App Router, React 19, TypeScript 5.x, Tailwind CSS 4, shadcn/ui, Lucide icons.
- **Database access:** Raw `@supabase/supabase-js` client (no ORM). Auto-generated types via `supabase gen types typescript`. Migrations in `supabase/migrations/*.sql`. SDK-style data access wrappers in `src/db/*.ts` (one file per table) for testability.
- **AI:** `@google/genai` for both embeddings (`gemini-embedding-001` with `outputDimensionality: 768`) and the gate (`gemini-2.5-flash` with `responseSchema` for structured output). `text-embedding-004` is retired; do not reintroduce it.
- **Auth:** Supabase anonymous auth with `linkIdentity()` upgrade path.
- **Validation:** Zod 4 at every boundary (route handler input, Reddit response, Gemini gate response, env vars).
- **Env vars:** `@t3-oss/env-nextjs` + Zod, validated at build time.
- **Linter/formatter:** Biome 2 (replaces ESLint + Prettier).
- **Testing:** Vitest + RTL for unit/integration, Playwright for one e2e golden path.
- **Hosting:** Vercel + Vercel Cron (free tier).
- **Local dev:** Supabase CLI (`supabase start`) for isolated local Postgres + pgvector + Realtime.
- **Analytics:** Vercel Web Analytics + Speed Insights.
- **Misc:** `nanoid` (room codes), `date-fns` (UTC daily), no state-management library.

### SEO architecture — two-phase render (spoiler-safe)

Round pages render server-side HTML with **only the title, subreddit, and supporting content** — never the actual top comment. The top comment is fetched from `GET /api/round/[id]/reveal` only after a guess is submitted. This means:

- Every round page is fully indexable (unique title, meta description, structured data).
- Google snippets cannot leak the answer.
- The post title — already a high-value search term — is the page's `<h2>` and `<title>`.

Round page anatomy includes: title + subreddit + guess form + "Recent guesses" sidebar (anonymized, above-threshold guesses for content depth) + "More from r/{subreddit}" internal links (6 links to other rounds in the same subreddit). The internal link graph alone reaches every round in ≤3 hops from the homepage; no separate subreddit hub pages needed.

**Indexable surface:** `/`, `/daily`, `/round/[id]`, `/round/[id]/result/[token]`, `/archive` (paginated, replaces the dropped per-subreddit pages).

**Share cards:** two `opengraph-image.tsx` routes.
- *Type A (pre-play, `/round/[id]`):* title + subreddit + "Can you guess the top comment?". For streamers dropping links.
- *Type B (post-play, `/round/[id]/result/[token]`):* "{nickname} got {score}% — '{guess}'" + score-band color treatment. For player-driven shares. Token is a deterministic 8-char hash of `(player_id, round_id)`.

Both rendered at the edge via `@vercel/og` + Satori, cached by the Vercel CDN.

**Structured data:** `@type: Quiz` on round pages, with NO `acceptedAnswer.text` field (would feed the answer to Google rich results). `WebSite` + `BreadcrumbList` on hubs.

**Sitemap:** Next.js `sitemap.ts` route generates entries from `auto_published` rounds + hub pages. Auto-shards past 50k entries.

### Scaffold + slice rollout

The repo is built in vertical slices, in order. Each slice is independently shippable. Slice numbers map 1:1 to GitHub issue numbers (`Slice N` ↔ `#N`); Slice 0 is the pre-issue scaffold.

- **Slice 0 (infra, one commit, no issue):** `pnpm dlx create-next-app` with TS+Tailwind+App Router; install all dependencies; configure Biome, Vitest, Playwright, env validation; `supabase init` + `supabase start`; write `0001_initial_schema.sql` with all 7 tables; generate types. Result: empty homepage on Vercel preview, `pnpm test` and `pnpm lint` green.
- **Slice 1 (#1):** Pure scoring module via TDD. `scoreGuess(guess, context) → ScoreBreakdown` with hand-crafted 768-dim vector fixtures. Base curve + each bonus type independently + clamping + composition.
- **Slice 2 (#2):** Solo round play loop end-to-end with one manually-seeded round. Page renders → form submits → server scores → reveal shows. Smallest possible end-to-end loop.
- **Slice 3 (#3):** Anonymous identity (guest nickname + Supabase anon auth, stable `player_id`).
- **Slice 4 (#4):** Session machinery — "Next round" + "Skip" + freeplay uniform-random selection over `auto_published` rounds (excluding rounds already guessed in this session).
- **Slice 5 (#5):** Reddit ingest script (scrape-based, frozen corpus). Replaces the manual seed; `pnpm ingest` produces ~120–130 published rounds.
- **Slice 6 (#6):** Cron budget circuit breaker + killswitch — inert in MVP (no cron yet), wired so Phase 1.5's cron pipeline drops in cost-safe.
- **Slice 7 (#7):** Daily challenge mechanic.
- **Slice 8 (#8):** Type A pre-play OG share card.
- **Slice 9 (#9):** Type B post-play OG card + `/result/[token]` page.
- **Slice 10 (#10):** SEO foundation — metadata + sitemap + robots + JSON-LD.
- **Slice 11 (#11):** Round page content depth — recent guesses + more-from-subreddit + `/archive`.
- **Slice 12 (#12):** Report round mechanism + auto-unpublish at threshold.
- **Slice 13 (#13):** Email/password upgrade flow via Supabase `linkIdentity()` (CTA, modal, sign-in on other devices). OAuth providers (Google first) are a planned future enhancement on the same `linkIdentity()` mechanism — `auth.users` row stays the same, `player_id` is preserved.
- **Slice 14 (#14):** Vercel deploy + env vars + production smoke test (HITL).
- **Slice 15 (#15):** Final polish — Lighthouse + Web Analytics + streamer readability.

### Repo layout (key directories)

```
src/
  app/                  Next.js App Router (game routes + api/cron + sitemap/robots)
  components/           ui/ (shadcn) + game/ (round-card, guess-input, score-reveal, ...)
  config/               env.ts, subreddits.ts, scoring.ts (tuning knobs)
  lib/                  supabase/, reddit/, gemini/, budget.ts, normalize.ts, share-token.ts
  db/                   one-file-per-table SDK wrappers (rounds, players, sessions, ...)
  scoring/              the pure deep module (scoreGuess + base-score + bonuses)
supabase/
  migrations/0001_initial_schema.sql
```

## Testing Decisions

### What makes a good test

Per the `tdd` skill: tests verify behavior through public interfaces, not implementation details. Good tests describe *what* the system does, not *how*. They survive internal refactors. Bad tests mock internal collaborators, test private helpers, assert on call counts, or verify through external means (e.g. querying the DB directly instead of through the interface).

Mocking is done at system boundaries only (Reddit API, Gemini API, time/randomness). Internal modules are never mocked. SDK-style external clients (one function per operation, not one generic `fetch`) make boundary mocks simple per-test.

### Modules under test

- **`src/scoring/` (full TDD):** Pure, deterministic, the algorithmic heart. Hand-crafted 768-dim vectors as fixtures. Tests cover base curve correctness, each bonus type independently, clamping, and final score composition. Vertical-slice TDD per the skill — one test → one implementation → repeat. Never write all tests first.
- **`src/lib/gemini/gate.ts` (behavior tests):** Mock the `@google/genai` client at the boundary with canned JSON responses (publish + reject + malformed cases). Verify our parsing, structured-output validation, and error paths.
- **`src/lib/gemini/embed.ts` (behavior tests):** Verify cache-hit short-circuits the embedding API call; verify cache-miss writes through.
- **`src/lib/reddit/client.ts` (behavior tests):** Mock `fetch` at the boundary. Verify pagination, dedup at the SQL layer, and error handling on rate-limit / auth failures.
- **`src/lib/budget.ts` (pure unit):** State machine over `cron_budget` rows. Test transitions: under-cap → still under-cap → over-cap → halted; killswitch path; date-rollover.
- **`src/lib/share-token.ts` (pure unit):** Deterministic hash. Two players, two rounds → four distinct tokens; same inputs → same token.
- **`src/lib/normalize.ts` (pure unit):** Quick coverage of whitespace, casing, punctuation rules.
- **`src/db/*` (integration):** Real local Supabase. Test only the wrappers with logic — `rounds.findEligible`, `guesses.insert`, `sessions.advance`. Skip 1-line passthroughs.
- **Session lifecycle (behavior, via HTTP):** Full state-machine test through `/api/session` + `/api/guess` route handlers. Verify `guessing → revealed → guessing(next) → session_complete`.
- **Ingestion pipeline (integration):** Mock Reddit and Gemini clients at their SDK boundaries, real local DB. Verify pending → published path and pending → rejected path. Verify budget circuit breaker halts the loop.
- **Page components (minimal):** No unit tests on RSC pages by default. One Playwright e2e covering the golden path (load round → submit guess → see reveal → see score) is the only UI coverage in MVP.
- **OG image routes (none):** Visual verification via Vercel OG playground + manual eyeball. Not worth automating in MVP.

### Prior art

This is a greenfield repo, so there's no in-codebase prior art yet. The first scoring tests will set the pattern for everything that follows: small, focused, named after behavior, no internal mocks.

## Out of Scope

- **Continuous content ingestion.** MVP runs a one-shot local script (`pnpm ingest`) to seed a frozen corpus (~120–130 rounds). The cron-based pull/process pipeline is deferred to Phase 1.5 when Reddit API access lands. Reason: Reddit's post-Devvit API review queue is slow and uncertain; we don't block MVP on it.
- **Phase 2 multiplayer rooms.** Architecturally accommodated, NOT built in MVP. No `session_players` table, no Realtime channel wiring, no host UI, no timer, no leaderboard, no room codes.
- **Subreddit hub pages (`/subreddit/[name]`).** Removed from the plan during grilling. The internal-link graph plus `/archive` cover the same role with less SEO fragmentation. Can come back later if data shows specific subreddit search terms have meaningful volume and we're willing to invest in unique content per page.
- **Admin/triage UI.** The auto-publish + report-button flow eliminates the manual queue. Add a triage page later only if the gate's accuracy degrades unacceptably.
- **Manual daily-challenge override UI.** Auto-pick from `auto_published` is MVP. A 10-line admin feature to override the day's 5 picks is a future addition.
- **Image/video Reddit content (deferred, not permanently excluded).** MVP subreddits are text-first; `r/funny` and `r/facepalm` are excluded for now because their comment punchlines depend on the image and we don't yet display it. A future slice will render the attached image on the round page (with OG-safe handling so share cards don't spoil the joke), at which point image-heavy subs become eligible. Until then, the ingest script's `post_hint === 'image'` filter plus the gate's "depends on an image" reject rule remain the guard.
- **Per-subreddit metadata table.** Subreddit is a string column on `rounds` — no `subreddits` lookup table.
- **Comment freshness re-pulls.** We snapshot the top comment at ingest time and freeze it. Reddit comment ranks shift but we don't track that.
- **Retry queue for failed processing.** Failed rows simply stay in `pending_gate` and get retried on the next process cron tick. No exponential backoff, no DLQ.
- **PostHog / Sentry.** Vercel Web Analytics covers the analytics stories; Vercel logs + `cron_runs` cover MVP debugging.
- **Internationalization.** English-only.
- **AMP, hreflang, mobile app shells.** No.

## Further Notes

### Architectural commitments worth re-stating

The six commitments below are load-bearing for Phase 2 and must not be quietly relaxed during MVP work:

1. Server-authoritative round serving (never client-side).
2. `game_sessions` is first-class; solo play is `room_id = NULL`; daily play is `room_id = "daily-YYYY-MM-DD"`.
3. Stable anonymous `player_id` from day one.
4. Guesses keyed `(session, round, player)` — Phase 2 is row-shaped, not schema-shaped.
5. Round lifecycle is a state machine on the session, not a play-event.
6. The stack stays websocket-capable; Supabase Realtime is the chosen mechanism for Phase 2.

### Phase 2 open question (re-confirm before building)

In Phase 2 Mode 1, the streamer competes alongside viewers by default. A future host-only mode (streamer MCs without competing) is planned as a UI toggle on the same backend. Re-confirm this with the user before building Phase 2.

### Tuning knobs concentrated in `src/config/scoring.ts`

The base curve exponent, bonus point values, and any thresholds (jaccard cutoff for keyword overlap, etc.) all live in one file. The user explicitly flagged scoring as the area most likely to evolve, so the config is centralized to make tuning a one-file change.

### Cost estimate at MVP scale

- Reddit access: free (public JSON endpoints from a residential IP, no auth).
- Gemini gate (one-shot ingest): ~$0.06 per script run (~500 candidates × Gemini Flash). Re-runs are ~free thanks to the pre-flight skip.
- Gemini embedding (top comment + uncached guesses): ~$0.004 per ingest run; guess-time embedding cache materially reduces costs in steady state.
- Vercel + Supabase: free tier covers MVP.

**Total: pennies for content ingestion**, dominated by guess-time embedding cache misses, with the $10/month GCP budget as the hard ceiling.

When Phase 1.5 lands (Reddit API access), the cron-based steady state returns to ~$4/month at MVP scale, with the $1/day app-level cap re-engaged.

### `INITIAL_PLAN.md` divergences

This PRD supersedes `INITIAL_PLAN.md` on three points where the user's clarifications during grilling changed the plan:

1. **Multiplayer is NOT "DO NOT BUILD YET" in spirit** — Phase 2 is the actual product vision; Phase 1 is the bridge. Architecture must preserve the path.
2. **Scoring weights are NOT a 70/30 cosine-keyword blend** — embeddings are the base, with discrete additive vibes-bonuses on top. Different shape, different feel.
3. **Subreddit hub pages are NOT part of the SEO surface** — they were in the URL list in the plan but are now dropped in favor of `/archive` + internal-link density.
