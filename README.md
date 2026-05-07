# reddit-guess-top-comment

Web game where players guess the top Reddit comment on a post.

Solo, no signup. Each round shows a Reddit post title; you type what you think the top comment said and get scored 0–100 (semantic similarity + structural bonuses). MVP ships solo + daily; streamer-hosted multiplayer rooms planned for Phase 2.

See **[PRD.md](./PRD.md)** for full design and **[CLAUDE.md](./CLAUDE.md)** for the architectural commitments.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind 4 · Supabase (Postgres + pgvector + Auth) · Gemini (`gemini-embedding-001`, 768 dims) · Biome · Vitest · Playwright

## Quickstart

```bash
pnpm install
cp .env.example .env.local      # then fill in Supabase + Gemini keys
pnpm dev                        # http://localhost:3000
```

**One-time Supabase setup:**

1. Apply the schema in `supabase/migrations/` via Dashboard SQL Editor.
2. Enable **Authentication → Sign-In Providers → Anonymous Sign-Ins**.
3. (Optional) Generate canonical types: `supabase login && pnpm db:types`. The repo ships with a hand-rolled `database.types.ts` until you do — file is gitignored.

**Seed a sample round (dev only):**

```bash
curl -X POST http://localhost:3000/api/dev/seed
# returns { roundId, url } — open the URL in a fresh window to play
```

## Commands

| Command | What it does |
|---|---|
| `pnpm dev` | Dev server (Turbopack) |
| `pnpm build` | Production build |
| `pnpm test` | Vitest (unit + integration) |
| `pnpm test:watch` | Vitest watch mode |
| `pnpm test:e2e` | Playwright (requires dev server) |
| `pnpm lint` / `pnpm lint:fix` | Biome |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm db:types` | Regenerate Supabase types |

`lint` / `typecheck` / `test` / `build` must all stay green.

## Status

- ✅ Slice 0: scaffold (Next, Tailwind, Biome, Vitest, Supabase migration)
- ✅ Slice 1: pure scoring module
- ✅ Slice 2: solo round playable end-to-end (manual seed)
- ✅ Slice 3: anonymous identity + guest nickname
- ⏭️ Slice 4: session machinery (next round, skip, freeplay)
- ⏭️ Slice 5+: ingestion, daily, share cards, SEO, polish

See open issues on GitHub for the slice queue.
