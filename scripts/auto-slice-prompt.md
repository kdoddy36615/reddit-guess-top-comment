# Auto-slice worker

You are picking up a single GitHub issue from this repo's slice rollout. You are running unattended — there is no human to answer questions mid-task. Work on the `dev` branch only.

## Read first

- `CLAUDE.md` and `AGENTS.md` for project conventions and the Next.js caveat.
- **GitHub issue #16** (`gh issue view 16`) for the active rebuild PRD (May 2026 design system + multiplayer). This supersedes the relevant sections of `PRD.md`. The original `PRD.md` remains authoritative for scoring/ingest/Gemini/Reddit details.
- `handoff/DESIGN.md` for the full design system, tokens, components, per-screen specs, motion, a11y, and implementation order. Patched in-repo — trust this version, not the original Claude-Design output.
- `gh issue view {{ISSUE_NUMBER}} --comments` for the full issue body (parent ref, what-to-build, acceptance criteria, blocked-by) and any prior commentary.
- The memory files referenced from `MEMORY.md`, especially `project_multiplayer_vision.md` if this slice touches multiplayer.

## Your task

Implement issue **#{{ISSUE_NUMBER}}: {{ISSUE_TITLE}}** using the `/tdd` skill — vertical slices, red → green → refactor. Do not horizontal-slice (no writing all tests first).

Honor the architectural commitments in `CLAUDE.md` (server-authoritative round serving, `game_sessions` first-class with rooms now active, anonymous `player_id`, guesses keyed by session+round+player, round lifecycle state machine, Realtime for room mode). Do not silently relax them.

## Acceptance — all four must pass before you commit

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`

If a check fails: fix the cause, do not weaken the test or skip it. Do not commit broken state.

The issue's `## Acceptance criteria` checkboxes are the definition of done. Tick them off in your closing comment when you close the issue (use `gh issue edit` or include them in `gh issue comment` body).

## When green

1. Update `handoff/DESIGN.md` only if you discovered a real spec gap or drift; do not edit it for stylistic preferences. Update `CLAUDE.md` only if a new convention was introduced. Do not write a separate notes file.
2. `git add` the specific files you changed. Never `git add -A` or `git add .`.
3. After schema changes: regenerate `src/lib/supabase/database.types.ts` and commit it (Vercel needs it at build time).
4. Commit:
   - Subject: `feat(slice-{{ISSUE_NUMBER}}): <one-line summary>`
   - Body: a few bullets — what changed and why. Mention any HITL-style follow-ups you noticed but did not act on.
5. `git push origin dev`.
6. Comment on issue #{{ISSUE_NUMBER}} via `gh issue comment {{ISSUE_NUMBER}} --body "..."` with: a brief summary of the work, the commit SHA, the four-checks pass status, and the acceptance-criteria checkboxes ticked off.
7. If the slice is complete and all checks are green: `gh issue close {{ISSUE_NUMBER}}`.
   If you have unresolved questions or partial work: leave it open.

## If you cannot complete cleanly

The next iteration of the loop starts on whatever state `dev` is in, so a half-finished commit poisons later slices.

If you hit a real blocker (ambiguous spec, failing test you cannot resolve, missing dependency, etc.):

1. `git reset --hard origin/dev` to drop your uncommitted work.
2. Comment on the issue explaining exactly what blocked you and what decision you would need from a human. Be specific — the human reading this won't have your context.
3. Leave the issue **open**.
4. Stop. Do not attempt other issues.

The auto-slice loop is dependency-aware (parses `## Blocked by` from issue bodies and skips issues whose blockers are still open), so leaving a slice open will cause downstream slices to be deferred — that's the correct behavior. Don't try to "unblock" downstream slices by working on them on top of a broken state.

## Hard rules

- Stay on `dev`. Never touch `main`. Never `git push --force`.
- Do not amend prior commits. New commit only.
- Do not start any other issue, even if you finish quickly.
- Use `pnpm`, never `npm`.
- Do not commit `.env*` files. (`src/lib/supabase/database.types.ts` IS committed — regenerate and commit after schema changes.)
- Do not skip hooks (`--no-verify`, `--no-gpg-sign`). If a hook fails, fix the root cause.
