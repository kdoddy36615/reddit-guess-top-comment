# Guess the Top Comment — Design handoff

Drop this folder anywhere in the repo (e.g. `docs/design/`) and point Claude Code at it.

## What's here

- **`DESIGN.md`** — the source of truth. Tokens, components, per-screen specs, motion, a11y, and implementation order. Read this first.
- **`hi-fi/Prototype.html`** — fully interactive mobile + desktop prototype of all 8 screens. Open in a browser to see live behavior, hover/focus states, and the score-reveal animation. Source files (`tokens.css`, `screens.css`, `shared.jsx`, `screens-solo.jsx`, `screens-multi.jsx`) are alongside it; classnames and color values map 1:1 to the tokens in `DESIGN.md`.
- **`wireframes/Wireframes.html`** — earlier low-fi exploration. Useful as a record of which directions were considered and rejected; not the build target.

## How to use

1. Read `DESIGN.md` end to end.
2. Open `hi-fi/Prototype.html` in a browser. Click through the router (top of page) to see every screen in both viewports. The score-reveal on `/play/solo/reveal` is the signature moment — match its timing.
3. When a `DESIGN.md` spec is ambiguous, the prototype is the tiebreaker. When the prototype and `DESIGN.md` disagree on a token value, `DESIGN.md` wins.
4. Follow the implementation order in `DESIGN.md` §8. Don't ship screens before primitives.
