@AGENTS.md

# reddit-guess-top-comment

Web game where players guess the top Reddit comment on a post. Read **`PRD.md`** for the original MVP design and **GitHub issue #16** for the May 2026 rebuild + multiplayer scope (active work). This file is just the tight summary every agent needs at session start.

## Commands

```
pnpm dev        # dev server (Turbopack)
pnpm build      # production build
pnpm test       # vitest run (unit + integration)
pnpm test:watch # vitest watch mode
pnpm test:e2e   # playwright (requires dev server)
pnpm lint       # biome check
pnpm lint:fix   # biome check --write
pnpm typecheck  # tsc --noEmit
```

All four of `lint` / `typecheck` / `test` / `build` must stay green.

## Architectural commitments — DO NOT SILENTLY RELAX

These six are load-bearing for the design system rebuild + multiplayer integration (May 2026). All six are active in current code; multiplayer is no longer deferred.

1. **Server-authoritative round serving.** Server picks "next round," never the client.
2. **`game_sessions` is first-class.** Solo = `mode='solo', room_id=null`. Daily = `mode='daily', room_id='daily-YYYY-MM-DD'`. Rooms = `mode='room', room_id=<6-char code>`. Same table, same code path.
3. **Stable anonymous `player_id`** via Supabase `signInAnonymously()`. Upgrades to permanent via `linkIdentity()` — same `auth.users` row, history follows the user.
4. **Guesses keyed `(session_id, round_id, player_id)`.** Multiplayer is row-shaped, not schema-shaped — N players in one room produce N guess rows per round, all sharing `session_id`.
5. **Round lifecycle is a state machine** on `game_sessions.current_round_state`: `guessing → revealed → session_complete`. In rooms, `guessing` means "timer running, awaiting N submissions"; transition to `revealed` fires when all players submit OR the round timer expires (whichever first).
6. **Stack uses Supabase Realtime for room mode.** Multiplayer rooms (`mode='room'`) use Realtime channels for presence (who's in the room), submission tracking (who has submitted this round), and synchronous round advance (everyone moves to the next round together). Solo and daily are SSR-only — no Realtime overhead for single-player flows.

## Module boundaries

- **`src/scoring/`** — pure, no I/O. `scoreGuess(guess, context) → ScoreBreakdown`. Embeddings are computed by the caller and passed in. **Never** add async or DB access here. If a future iteration needs LLM scoring, that's an interface change to be discussed, not snuck in.
- **`src/lib/{reddit,gemini}/`** — SDK-style external clients (one function per operation, not generic `fetch()`). Mock at this boundary in tests.
- **`src/db/*`** — one file per table, thin Supabase wrappers. Tests for wrappers with real logic only; skip 1-line passthroughs.
- **`src/app/api/*`** — route handlers, thin glue. Heavy logic delegates to the modules above.
- **`src/config/scoring.ts`** — tuning knobs (curve params, bonus weights). Centralized so tuning is a one-file change.

## Schema & migrations

- Schema lives in `supabase/migrations/*.sql`, applied via Dashboard SQL Editor or `supabase db push`.
- All `public.*` tables have RLS enabled with explicit policies (see initial migration for the pattern).
- Service role bypasses RLS — used by cron jobs and admin operations only. Never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser (no `NEXT_PUBLIC_` prefix).
- For schema iteration: run SQL in the Dashboard SQL Editor freely, then capture as a new migration via `supabase db pull <name> --local --yes` when ready.
- After schema changes: regenerate types with `pnpm dlx supabase gen types typescript --project-id esheasniwbgvxrfxqpot > src/lib/supabase/database.types.ts`.

## Cost controls — three independent layers

A bug must not cost real money. Layers, in order of "fail-loud" → "cut-the-line":

1. **GCP billing budget** ($10/mo cap on Gemini API key, alerts at $2/$5/$10). Hardest ceiling.
2. **App-level circuit breaker** (`cron_budget` table — every cron handler checks `halted` and `est_cost_usd` before doing work; defaults: $1/day cap, 50 candidates per process run).
3. **Killswitch env var** (`CRON_KILLSWITCH=true` halts all cron immediately, no deploy).

## Skills installed in this repo

- **`/grill-me`** — interview the user on a plan or design until aligned.
- **`/to-prd`** — synthesize current conversation into a PRD and publish to GitHub issues.
- **`/to-issues`** — break a PRD into vertical-slice issues on the tracker.
- **`/tdd`** — red-green-refactor with vertical slices. Never write all tests first.

When picking up a slice, use `/tdd`. Issues #1–#15 (CLOSED) covered the original MVP. Issue #16 is the rebuild PRD; rebuild slices are issues following #16, in dependency order. Use `gh issue list --label ready-for-agent` to see what's open.

## Test philosophy

Per the `tdd` skill: tests verify **behavior through public interfaces**, not implementation details. Mock only at system boundaries (Reddit, Gemini). Never mock internal modules. Don't horizontal-slice (writing all tests first then all implementation) — vertical slices, one test → one impl → repeat.

## What NOT to do

- Don't add Drizzle/an ORM. We use raw `@supabase/supabase-js` with type generation.
- Don't add tRPC. Route handlers + Zod is enough.
- Don't render the top-comment text in the round page HTML before a guess. Spoiler-safe via the play route's reveal-state render, gated by `current_round_state='revealed'` on the session. Never include it in the initial HTML when the session is still in `guessing`.
- Don't reintroduce per-content public URLs (`/subreddit/[name]`, `/round/[id]`, `/archive`). The product is a play loop; per-content discovery is out of scope. Removed during the May 2026 redesign grilling.
- Don't commit `.env.local` (gitignored). `src/lib/supabase/database.types.ts` IS committed (Vercel needs it at build time) — regenerate and commit after schema changes.
- Don't aggressively widen the ingest image filter (e.g. add `is_gallery`, `i.redd.it` domain rejections). Round pages will display attached images in a future slice — image content is *deferred*, not permanently out of scope. The current `post_hint === 'image'` filter plus the gate's "depends on an image" reject rule are sufficient for MVP. Harden the gate prompt before the deterministic filter.
