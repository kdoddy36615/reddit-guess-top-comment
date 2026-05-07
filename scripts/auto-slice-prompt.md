# Auto-slice worker

You are picking up a single GitHub issue from this repo's slice rollout. You are running unattended — there is no human to answer questions mid-task. Work on the `dev` branch only.

## Read first

- `CLAUDE.md` and `AGENTS.md` for project conventions and the Next.js caveat.
- `PRD.md` for the slice rollout and the scope of this slice.
- `gh issue view {{ISSUE_NUMBER}} --comments` for the full issue body and any prior commentary.

## Your task

Implement issue **#{{ISSUE_NUMBER}}: {{ISSUE_TITLE}}** using the `/tdd` skill — vertical slices, red → green → refactor. Do not horizontal-slice (no writing all tests first).

## Acceptance — all four must pass before you commit

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`

If a check fails: fix the cause, do not weaken the test or skip it. Do not commit broken state.

## When green

1. Update `PRD.md` if scope shifted or you made a design call worth recording. Update `CLAUDE.md` only if a new convention was introduced. Do not write a separate notes file.
2. `git add` the specific files you changed. Never `git add -A` or `git add .`.
3. Commit:
   - Subject: `feat(slice-{{ISSUE_NUMBER}}): <one-line summary>`
   - Body: a few bullets — what changed and why. Mention any HITL-style follow-ups you noticed but did not act on.
4. `git push origin dev`.
5. Comment on issue #{{ISSUE_NUMBER}} via `gh issue comment {{ISSUE_NUMBER}} --body "..."` with: a brief summary of the work, the commit SHA, the four-checks pass status, and any open questions for the human reviewer.
6. If the slice is complete and all checks are green: `gh issue close {{ISSUE_NUMBER}}`.
   If you have unresolved questions or partial work: leave it open.

## If you cannot complete cleanly

The next iteration of the loop starts on whatever state `dev` is in, so a half-finished commit poisons later slices.

If you hit a real blocker (ambiguous spec, failing test you cannot resolve, missing dependency, etc.):
1. `git reset --hard origin/dev` to drop your uncommitted work.
2. Comment on the issue explaining exactly what blocked you and what decision you would need from a human.
3. Leave the issue **open**.
4. Stop. Do not attempt other issues.

## Hard rules

- Stay on `dev`. Never touch `main`. Never `git push --force`.
- Do not amend prior commits. New commit only.
- Do not start any other issue, even if you finish quickly.
- Use `pnpm`, never `npm`.
- Do not commit `.env*` files or `src/lib/supabase/database.types.ts`.
