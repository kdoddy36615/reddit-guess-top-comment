# DESIGN.md — Guess the Top Comment

Handoff for a Next.js 15 App Router + Tailwind v4 + shadcn-style codebase.
This is the source of truth. Read it once, build from it, do not improvise tokens.

> **Patched in-repo (May 2026)** to align with product decisions resolved during `/grill-me`. Notable deltas vs. the original Claude-Design output: daily session length is **5 rounds** (not 8); **"unlimited" mode dropped** (collapsed into auto-advancing solo); **friends tab on leaderboard dropped** (no friend graph in product); **`[friends]` CTA relabeled `[play with others]`** and points at `/rooms` entry hub; **reveal renders inline** on `/play/[mode]`, not as a separate route; **multiplayer rooms (`/r/[code]` family) are IN SCOPE** for this rebuild and have a `/rooms` entry hub for choosing random matchmaking vs. create-room vs. join-by-code; multiplayer match defaults are **8 rounds, 30s timer, 8/32 max players** (random/host) — see `memory/project_multiplayer_vision.md` for the full settled spec. The interactive prototype in `handoff/hi-fi/Prototype.html` reflects the original output and may show artifacts of dropped features — this file wins on conflicts.

---

## Section 1 — Design tokens

### 1.1 Raw values

Color (semantic, dark theme is canonical):

| Token | Hex |
|---|---|
| `--bg` (background) | `#14110e` |
| `--surface` | `#1c1814` |
| `--surface-2` (elevated card) | `#25201a` |
| `--surface-3` (input/inset) | `#1a1612` |
| `--border` (hairline) | `rgba(246, 239, 225, 0.08)` |
| `--border-strong` | `rgba(246, 239, 225, 0.16)` |
| `--text` (primary ink) | `#f6efe1` |
| `--text-muted` | `#b8ad97` |
| `--text-faint` | `#6e6453` |
| `--text-disabled` | `#4a4338` |
| `--accent` (orange — primary) | `#e8814a` |
| `--accent-hi` (hover) | `#f29560` |
| `--accent-soft` | `rgba(232, 129, 74, 0.14)` |
| `--accent-foreground` (on-accent) | `#1a0e07` |
| `--accent-2` (gold — "you", streaks) | `#f4c95d` |
| `--accent-2-soft` | `rgba(244, 201, 93, 0.16)` |
| `--success` / band-bullseye | `#9be38a` |
| `--warning` / band-warm | `#f4c95d` |
| `--danger` / band-cold-2 | `#d96152` |
| team-blue (decorative) | `#7cc6ff` |
| team-purple (decorative) | `#c39bff` |
| team-green (decorative) | `#9be38a` |

Type:

| Token | Value |
|---|---|
| `--font-display` | `Fraunces, "Source Serif Pro", Georgia, serif` |
| `--font-body` | `"Inter Tight", Inter, system-ui, sans-serif` |
| `--font-mono` | `"JetBrains Mono", "IBM Plex Mono", ui-monospace, monospace` |
| `--font-hand` | `Caveat, "Patrick Hand", cursive` |

Sizes (rem assumes 16px root):

| Token | rem | px |
|---|---|---|
| `--text-xs` | 0.6875 | 11 |
| `--text-sm` | 0.8125 | 13 |
| `--text-base` | 0.9375 | 15 |
| `--text-md` | 1.0625 | 17 |
| `--text-lg` | 1.375 | 22 |
| `--text-xl` | 1.625 | 26 |
| `--text-2xl` | 2.25 | 36 |
| `--text-3xl` | 3.5 | 56 |
| `--text-display` | 6 | 96 (score hero only) |

Line heights: `0.9` (display numbers), `1.15` (titles), `1.4` (body).
Weights used: `400`, `500`, `600`, `700`. No `300`, no `800+`.

Spacing scale (rem):

`0.125 / 0.25 / 0.375 / 0.5 / 0.625 / 0.75 / 1 / 1.25 / 1.5 / 1.75 / 2 / 2.5 / 3` → tokens `--space-0.5` through `--space-12`.

Radius:

| Token | px |
|---|---|
| `--radius-sm` | 6 |
| `--radius-md` | 10 |
| `--radius-lg` | 16 |
| `--radius-xl` | 22 |
| `--radius-pill` | 999 |

Shadow:

| Token | Value |
|---|---|
| `--shadow-sm` | `0 1px 0 rgba(0,0,0,.3), 0 2px 6px rgba(0,0,0,.25)` |
| `--shadow-md` | `0 2px 0 rgba(0,0,0,.35), 0 8px 24px rgba(0,0,0,.35)` |
| `--shadow-glow` | `0 0 0 1px var(--accent-soft), 0 8px 28px rgba(232,129,74,.18)` |

Motion:

| Token | Value |
|---|---|
| `--duration-fast` | `120ms` |
| `--duration-base` | `200ms` |
| `--duration-slow` | `350ms` |
| `--duration-reveal` | `550ms` (score-up) |
| `--ease-out` | `cubic-bezier(.2,.7,.2,1)` |
| `--ease-in-out` | `cubic-bezier(.65,.05,.35,1)` |

### 1.2 Tailwind v4 `@theme` block (paste into `app/globals.css`)

```css
@import "tailwindcss";

@theme {
  /* color */
  --color-bg: #14110e;
  --color-surface: #1c1814;
  --color-surface-2: #25201a;
  --color-surface-3: #1a1612;
  --color-border: oklch(0.95 0.04 80 / 0.08);
  --color-border-strong: oklch(0.95 0.04 80 / 0.16);

  --color-text: #f6efe1;
  --color-text-muted: #b8ad97;
  --color-text-faint: #6e6453;
  --color-text-disabled: #4a4338;

  --color-accent: #e8814a;
  --color-accent-hi: #f29560;
  --color-accent-soft: oklch(0.7 0.15 45 / 0.14);
  --color-accent-foreground: #1a0e07;
  --color-accent-2: #f4c95d;
  --color-accent-2-soft: oklch(0.85 0.14 85 / 0.16);

  --color-success: #9be38a;
  --color-warning: #f4c95d;
  --color-danger: #d96152;

  /* type */
  --font-display: "Fraunces", "Source Serif Pro", Georgia, serif;
  --font-sans: "Inter Tight", Inter, system-ui, sans-serif;
  --font-mono: "JetBrains Mono", "IBM Plex Mono", ui-monospace, monospace;
  --font-hand: "Caveat", "Patrick Hand", cursive;

  --text-xs: 0.6875rem;
  --text-sm: 0.8125rem;
  --text-base: 0.9375rem;
  --text-md: 1.0625rem;
  --text-lg: 1.375rem;
  --text-xl: 1.625rem;
  --text-2xl: 2.25rem;
  --text-3xl: 3.5rem;
  --text-display: 6rem;

  /* radius */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
  --radius-xl: 22px;
  --radius-pill: 999px;

  /* shadow */
  --shadow-sm: 0 1px 0 rgba(0,0,0,.3), 0 2px 6px rgba(0,0,0,.25);
  --shadow-md: 0 2px 0 rgba(0,0,0,.35), 0 8px 24px rgba(0,0,0,.35);
  --shadow-glow: 0 0 0 1px var(--color-accent-soft), 0 8px 28px rgba(232,129,74,.18);

  /* motion */
  --ease-out: cubic-bezier(.2,.7,.2,1);
  --ease-in-out: cubic-bezier(.65,.05,.35,1);
}

@layer base {
  html { background: var(--color-bg); color: var(--color-text); font-family: var(--font-sans); }
  ::selection { background: var(--color-accent-soft); color: var(--color-text); }
}
```

---

## Section 2 — Component inventory

> Where shadcn primitives (`Button`, `Input`, `Dialog`, `Tabs`, `Tooltip`, `Toast`, `Avatar`, `Skeleton`, `Progress`) fit, use them and override variants via `cva`. Where they don't (game-specific), build custom.

### Button

Variants: `primary` · `secondary` · `ghost` · `danger`. Sizes: `sm` · `md` · `lg` · `icon`. States: default, hover, focus-visible, active, disabled, loading.

```tsx
// components/ui/button.tsx
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-pill font-medium transition-[background,border-color,transform,box-shadow] duration-[var(--duration-fast)] ease-[var(--ease-out)] active:translate-y-px disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
  {
    variants: {
      variant: {
        primary: "bg-accent text-accent-foreground border border-transparent font-semibold hover:bg-accent-hi",
        secondary: "bg-surface-2 text-text border border-border-strong hover:bg-surface-2/80 hover:border-text-faint",
        ghost: "bg-transparent text-text border border-border hover:bg-surface",
        danger: "bg-danger text-accent-foreground hover:opacity-90",
      },
      size: {
        sm: "h-8 px-3 text-sm",
        md: "h-10 px-4 text-base",
        lg: "h-12 px-5 text-md",
        icon: "h-9 w-9 p-0",
      },
    },
    defaultVariants: { variant: "secondary", size: "md" },
  }
);
```

Loading state: spinner replaces leading icon, text stays, `aria-busy="true"`, button stays clickable=false.

### IconButton

Same as Button `size="icon"`. Always include `aria-label`.

### Input / Textarea

```tsx
<input className="w-full bg-surface-3 border border-border-strong rounded-md px-4 py-3 text-base text-text placeholder:text-text-faint focus:outline-none focus:border-accent focus:shadow-[var(--shadow-glow)] transition-[border-color,box-shadow] duration-[var(--duration-base)]" />
```

`<textarea>` adds `resize-none min-h-[86px] leading-tight`. The **GuessInput** variant additionally applies `font-hand text-lg` (Caveat 22px) — see §2 game components.

States: default, focus (orange ring + glow), error (border `--color-danger`, helper text below in danger), disabled (50% opacity, `cursor-not-allowed`).

### Card

```tsx
<div className="bg-surface-2 border border-border rounded-lg p-5" />
```

Variants: `card` (default), `card-elevated` (adds `shadow-md`), `card-dashed` (border-dashed, used for placeholders/empty states).

### Badge / Chip

```tsx
<span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-pill border border-border-strong bg-surface text-text-muted font-mono text-xs">…</span>
```

Variants: `default`, `accent` (orange), `gold` (accent-2), `success`, `danger`. All keep the same shape; only color tokens change.

### Dialog (shadcn)

Overrides: backdrop `bg-bg/80 backdrop-blur-sm`, content `bg-surface-2 border-border-strong rounded-xl shadow-md max-w-md`. Animations: fade+slide-up 200ms, ease-out.

### Toast (shadcn)

Top-right on desktop, bottom-center on mobile. `bg-surface-2 border-border-strong rounded-lg shadow-md`. Duration 4000ms, 6000ms for errors.

### Skeleton

```tsx
<div className="bg-surface-2 rounded-md animate-pulse" />
```

Use for thread-loading on reveal screen and leaderboard rows. Match the height of the real element.

### Progress (round pips)

Custom — not a bar. 5 pips (matches daily session length), 18×4px, `rounded-sm`. States: `done` (accent), `now` (text-muted), `pending` (text-disabled). See §3 layout for usage.

### Avatar (shadcn override)

Round, 1px subtle dark inner border. Color comes from a per-user color slot (decorative team palette). "You" avatars use `accent-2` background. Initial is mono font, weight 600, `text-accent-foreground`.

### Tabs (shadcn override)

Pills, not underlines. Inactive: `bg-surface text-text-muted border-border-strong`. Active: `bg-accent-soft text-accent border-accent`.

### Tooltip (shadcn)

`bg-surface-2 border-border-strong text-text-muted text-xs rounded-md px-2 py-1`. Delay 400ms.

---

### Game-specific components

#### GuessInput
Textarea with Caveat font, 22px, `leading-snug`, 86px min-height. On focus: orange border + glow. Submits on `⌘+Enter`. Hint row below shows kbd chips.

#### ScoreReveal
Two-part block. Left: label "your guess" (mono xs, accent-2) + quote (Caveat lg, ink). Right: score number (Fraunces 700, 56px desktop / 42px mobile, color = band based on score) + meta "matched #1" (mono xs).
Container: `bg-gradient` from `accent-2-soft` → transparent, `border-accent-2-soft`, `rounded-lg`.
Animation: see §5.

#### RoundCard
Header row: subreddit (accent), age, upvotes, all mono xs.
Title: Fraunces 600, 26px desktop / 19px mobile, `leading-tight`, `text-balance`.
Body: optional, ink-muted 14px.
Image: optional, `aspect-[16/9]` placeholder via repeating diagonal stripes on `surface-3`.

#### CommentCard (for reveal thread)
Reddit-thread metaphor. Outer item: 3px left border (`border-accent` for #1, `border-text-disabled` for #2/#3), 14px left padding. Inside: rank chip + user + upvotes (mono xs row), then text (16px ink).
**Replies** are NOT cards. They are a 2px left rail (`border-border-strong`, hover `border-text-faint`), 14px left padding, no background, no rounded corners. This is the canonical Reddit nested-comment look.

#### LeaderboardRow
Grid: `36px 28px 1fr auto` = rank · avatar · name · score. Padding `10px 12px`, rounded-md, surface bg. "You" row: `bg-accent-2-soft`, accent-2 text on rank/score.

---

## Section 3 — Layout primitives

### Page shell

```
<header>   sticky, h-14, bg-surface/70 backdrop-blur, border-b border-border
<main>     max-w-content mx-auto px-4 md:px-6, flex-1
<footer>   optional, hidden in-game; shown on landing/legal
```

Container widths:

| Breakpoint | Container max-w |
|---|---|
| < 640 | 100% (no container — full width) |
| ≥ 640 | 600px |
| ≥ 1024 | 880px |
| ≥ 1280 | 1100px (in-game) / 720px (landing reading width) |

Use `max-w-content` token in the @theme block (`--container-content: 1100px`) so it's controllable in one place.

### Grid patterns

- **Round/Reveal:** single column, max-w 720px, vertical flex, `gap-4`. Sticky guess input bar at bottom on mobile.
- **Lobby:** single column, max-w 600px. Player chips: `flex flex-wrap gap-2`.
- **Leaderboard:** single column, max-w 720px.
- **Daily summary:** two regions (hero + rounds list). Rounds list scrolls if overflow.

### Persistent navigation chrome

- App bar: brand-mark left, route title center (Fraunces 600 16px), avatar/menu right.
- In-round bar: round pips + `round N / M` + skip button. NOT in app bar — sits inside the page above the post card.
- Mobile: same app bar; avatar opens a sheet, not a dropdown.

---

## Section 4 — Per-screen specs

Routes under `src/app/`:

### `/` — Landing (welcome)

```
┌──────────────────────────────────────────┐
│ ◆ guesstop                               │  brand mark + wordmark
│                                          │
│ A REDDIT GUESSING GAME                   │  eyebrow, mono xs faint
│ guess what reddit said next.             │  Fraunces 600, 64px / 44px mobile
│ "next" italic in accent.                 │
│ we show you a post, you guess…           │  body 17px, muted
│                                          │
│ ┌─ r/tifu · 24.1k ↑      [round 1/8] ─┐  │  hero example card
│ │ TIFU by texting my boss…             │  │
│ │ ┌── your guess goes here ──┐         │  │
│ │ └──────────────────────────┘         │  │
│ └──────────────────────────────────────┘  │
│                                          │
│ [play solo →] [today's daily] [play with others] │  primary, secondary, ghost
│                                          │
│ ●daily resets 04:12 · 14k played · …     │  aux row, mono xs
│ ┌proof──┐┌proof──┐┌proof──┐ (desktop)    │  3 example top comments
└──────────────────────────────────────────┘
```

States: anonymous (default), signed-in (replace CTA row with `[continue your daily] [your stats]`).

### `/play/[mode]` — Round screen

`mode` = `solo` | `daily`. (Solo auto-advances after reveal — there is no separate "unlimited" mode.)

```
┌────────────────────────────────────────┐
│ ●●●○○  round 3 / 5          [skip ›]   │  pips + meta
│ ┌──── post card ───────────────────┐   │
│ │ r/tifu · 8h · 24.1k↑             │   │  meta mono xs, sub in accent
│ │ TIFU by texting my boss a photo… │   │  Fraunces 600 26/19px
│ │ Title says it all. Was half…     │   │  body, optional
│ │ [post-image · attached] (opt)    │   │  diagonal-stripe placeholder
│ └──────────────────────────────────┘   │
│ what do you think the top comment said?│  Caveat 22px muted
│ ┌── guess input (Caveat 22px) ────┐    │
│ └──────────────────────────────────┘    │
│ ⌘+↵ to submit            [guess →]      │
└────────────────────────────────────────┘
```

States: empty (button disabled), typing, submitting (button shows spinner, input disabled), error (toast).

### `/play/[mode]/reveal` — Reveal

> **Implementation note:** the reveal does not have a separate URL. It renders inline on `/play/[mode]` when `current_round_state='revealed'`. The wireframe below describes the reveal *state*, not a separate route.

```
┌────────────────────────────────────────┐
│ ┌─ your guess ───────────  87 ──────┐  │  detached card, gradient
│ │ "sounds like she's running…"      │  │
│ │                       matched #1  │  │
│ └────────────────────────────────────┘  │
│                                         │
│ R/TIFU · THE ACTUAL THREAD              │  mono xs faint
│ TIFU by texting my boss…                │  small Fraunces, muted
│                                         │
│ ┃#1  u/redditor_42  14.2k↑  [TOP]      │  3px accent border
│ ┃ "sounds like she's the boss now."    │
│ ┃ │u/midnight_mike · 4.1k↑              │  2px hairline rail (NOT a box)
│ ┃ │ promotion through cat photo…        │
│ ┃                                       │
│ │#2  u/workfromhomer  6.8k↑             │  3px disabled border
│ │ "RIP your career…"                   │
│ │ │u/anon_47 · the cat is the only…     │
│ │                                       │
│ │#3  u/caffeineghost  3.1k↑             │
│   …                                     │
│                                         │
│ [flag]                  [next round →]  │
└────────────────────────────────────────┘
```

States: pre-animation (score+thread items hidden), playing (score scales up, thread items stagger 80ms each), settled.

### `/play/daily/end` — Daily summary

> **Daily only.** Solo has no end screen — it auto-advances after reveal until the user leaves. Only `/play/daily/end` exists in this rebuild.

```
┌────────────────────────────────────────┐
│ DAILY COMPLETE · 2026-05-07             │  label
│ nice run.                               │  Fraunces italic 18px
│ 512                                     │  Fraunces 700, 96/72px, accent
│ total · rank 47 of 14,392 today         │  mono xs
│ ~~~~~                                   │  squiggle deco
│                                         │
│ ROUND-BY-ROUND                          │
│ ┃01 r/tifu     "sounds like…"      92  │  band-color left border
│ ┃02 r/AskRedd  "the cat is a…"     64  │
│ …                                       │
│                                         │
│ ┌STREAK┐                                │
│ │4 days 🔥        next daily 04:12      │  accent-2 text on streak
│ └─────────────────────────────────────┘ │
│ [see leaderboard]      [play unlimited]│
└────────────────────────────────────────┘
```

States: just-finished (animations play), revisit (no animations).

### `/leaderboard` — Daily/global

Tabs: `today` · `week` · `all-time`. Single rows list. "You" row pinned with neighbors when off-screen. (Friends tab dropped — friend graph is a Phase 2 multiplayer concept; the leaderboard stays purely a ranking surface.)

```
┌────────────────────────────────────────┐
│ today's board          resets in 04:12 │  Fraunces 600 30px
│ 2026-05-07 · 14,392 players            │  mono xs
│ [today][week][all-time]                │  pill tabs
│                                        │
│ #1  ◇ comment_king              742    │  leader-row
│ #2  ◇ snorlax_42                718    │
│ … (top 20)                             │
│ - - - - - - - -                        │  dashed divider
│ #47 ◇ kev (you) ↑3              412    │  you-row, accent-2
│ #48 ◇ anon_47                   409    │
│                                        │
│                           [finish →]   │
└────────────────────────────────────────┘
```

States: anonymous (no "you" row, CTA "sign in to compete").

### `/rooms` and `/r/[code]` — Multiplayer

> **In scope for the May 2026 rebuild.** Two ways to enter: random matchmaking (8 max, 90s wait, min 3 to start) and host-created rooms (32 max, 6-char code, host clicks start). See `memory/project_multiplayer_vision.md` for the full settled spec.

**Routes:**
- `/rooms` — entry hub. Three options: "join random" (queues for matchmaking), "create room" (generates 6-char code, redirects to lobby as host), "join by code" (input + go).
- `/r/[code]` — lobby. Handles both modes:
  - **Host-created:** player chips, host's "start match" button + kick + lock + round-count/timer settings; guests see "waiting for host."
  - **Random:** player chips, fill counter ("4/8"), countdown timer (90s when room opens). Match auto-starts at 8 players or timer expiry (min 3).
- `/r/[code]/play` — live round. Post card + player chips with submitted/typing state + round timer (30s default; configurable in host-created rooms). Reveal triggers when all submit OR timer expires; everyone sees the score reveal simultaneously, holds 5s, then auto-advances to the next round together.
- `/r/[code]/end` — match end. Winner banner + final standings (LeaderboardRow grid) + replay CTA visible to host only (host-created rooms). Room stays open ~10 min for replay; "play again" creates a fresh `game_sessions` row in the same room code.

**Key state:**
- Connection: `live` / `reconnecting` / `disconnected` — top-of-screen banner. Reduced-motion: banner stays static, no slide-in.
- Host vs guest: host sees admin controls (start, kick, lock, settings); guests see waiting state.
- Player join/leave: chips animate in/out (reduced-motion: opacity fade).
- Match start: all players advance simultaneously to `/r/[code]/play`.
- Mid-match join: not allowed. Show "match in progress" if someone hits the URL after match has started.
- Reconnection during active match: supported. Re-enter wherever the match currently is. Submissions for missed rounds count as 0.

**Anonymous players:** allowed in rooms. If they haven't picked a nickname, the system generates one (`adjective + animal` style) at room-join time. They see their generated nickname in their player chip and on the reveal/end screens.

**Match settings (host-created only):** round count 3–20 (default 8), round timer (default 30s). Random rooms are locked at 8 rounds / 30s.

### `/account` — Stats / profile

Single page, two sections.

**Stats** (top). Stat cards built on the Card primitive:
- Best daily run (top score + date earned)
- Current daily streak (days in a row completing daily; with 🔥 if active)
- Weekly daily completion (e.g. 3/7)
- Lifetime guesses played
- Top 3 subreddits by accuracy

**Account settings** (tab or section below the stats grid):
- Upgrade-from-anonymous: email + password → Supabase `linkIdentity()`. Permanent users see a "change password" form here instead.
- Sign out
- Delete account

**Anonymous state:** the stats grid is replaced by a single full-width "save your scores →" upgrade card. Personal stats don't render until the player has a permanent identity. The settings section becomes just the upgrade form.

### `/login`, `/signup`

Trivial — single-column auth forms. Re-use Input, Button. Branded with hero brand-mark + tagline only; no game UI.

### `/legal/[slug]`

Trivial — long-form prose pages. Use a `prose` config in `@theme` (Fraunces headings, Inter Tight body, max-w 65ch).

---

## Section 5 — Motion and interaction

| Moment | Animation | Duration | Easing |
|---|---|---|---|
| Button hover | bg color | 120ms | ease-out |
| Button press | translate-y 1px | 80ms | linear |
| Page transition | fade-in | 200ms | ease-out |
| Modal open | fade-in + slide-up 8px | 200ms | ease-out |
| Toast in | slide-in-y 12px + fade | 200ms | ease-out |
| Input focus | border + box-shadow | 200ms | ease-out |
| Round pip advance | bg color | 200ms | ease-out |
| **Score-reveal (signature)** | see below | 550ms | ease-out |
| Thread item stagger | slide-up 16px + fade | 350ms each, 80ms stagger | ease-out |
| Player chip submitted | border + opacity flip | 200ms | ease-out |
| Streak fire icon | ambient pulse 1.6s | infinite | ease-in-out |

**Score-reveal:** the score number scales from 0.8 → 1.06 → 1.0 with a translateY 20→-4→0 over 550ms ease-out. Number color tweens from `text-faint` to its band color over the same duration. Sound (optional, off by default): a single soft chime on landing.

```css
@keyframes score-up {
  0%   { transform: translateY(20px) scale(0.8); opacity: 0; }
  60%  { transform: translateY(-4px) scale(1.06); opacity: 1; }
  100% { transform: translateY(0) scale(1); opacity: 1; }
}
```

**Reduced motion:** all of the above collapse to a 120ms opacity fade only. No transforms. The score-reveal becomes an instant cross-fade with the band color already final. Wrap every animation utility in `motion-safe:` or guard the keyframes inside `@media (prefers-reduced-motion: no-preference)`.

---

## Section 6 — Accessibility baseline

- **Focus ring:** 2px solid accent, 2px offset against `bg`. Applied via `focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg`. Never remove it; only adjust offset color when the surface differs.
- **Contrast:** body text on `bg` ≥ 7:1 (we are at ~12:1). Muted text on `bg` ≥ 4.5:1 (we are at ~6:1). Accent on `accent-foreground` ≥ 4.5:1. Score band colors against `bg` all clear 4.5:1; never put band colors on `surface-2` for body text — only as accent borders or large numerals (≥24px).
- **Keyboard:** every action reachable by Tab. `Enter` submits guess (single-line) or `⌘/Ctrl+Enter` (multi-line). `Esc` closes any modal/sheet. Tabs are arrow-key navigable.
- **Reduced motion:** see §5. Also: pulsing dots on the daily pill freeze.
- **Screen-reader labels:**
  - Round pips: `role="progressbar" aria-valuenow={done} aria-valuemax={total}`.
  - Score number: `aria-live="polite"`, prefixed with "your score: ".
  - Player chips: `aria-label="kev, submitted"` / `"…still typing"`.
  - Avatar buttons: `aria-label="open user menu"`.
  - Decorative squiggles, brand mark glyph, score band colors: `aria-hidden="true"`.
- **Form errors:** `aria-invalid="true"` + `aria-describedby` pointing to a sibling helper text. Not a toast alone.

---

## Section 7 — Do and Don't

**Do**
- Use `Fraunces` for any number that's the focus of a screen (score, total, room code) and for titles. Use `Inter Tight` for everything else readable. Use `Caveat` only for guesses, prompts ("what do you think…"), and reveal quotes.
- Lean on `surface-2` cards with hairline borders. The dark background is the primary visual texture — let it breathe.
- Use the orange accent for one primary action per screen, plus the score band colors. Use `accent-2` (gold) only for "you" / streaks / personal-progress.
- Reveal threads use the **left-rail** Reddit pattern. Replies are NOT cards. Three different left-border colors: accent (#1), text-disabled (#2/#3), and `border-strong` (replies).
- Numbers > prose. Long copy belongs in muted body or hand-font hints, not in the foreground.
- Mobile is the primary viewport. Design every screen mobile-first, then expand.

**Don't**
- Don't introduce new colors. If a state needs emphasis use an existing band token. If a third tier of action is needed, use ghost.
- Don't put body text in Fraunces or Caveat — only display roles.
- Don't wrap replies in rounded boxes or backgrounds. The rail is the whole point.
- Don't use emoji for status (use band color + label). Allowed: streak fire 🔥 and podium 🥇🥈🥉 — that's the entire emoji budget.
- Don't add gradients beyond the three already defined (`accent-soft`, `accent-2-soft` block, hero glow). No purple-blue dev gradients.
- Don't shrink the score number on small viewports below 42px. The hero score is the moment.
- Don't animate during a prefers-reduced-motion session beyond opacity fades.
- Don't use system font stacks alone. The display/hand fonts are load-blocking essentials; preload them.

---

## Section 8 — Implementation order

Authoritative slice list lives in the GitHub issue tracker (PRD #16 + per-slice issues). This section is the high-level rationale for the order.

1. **Tokens.** Drop the `@theme` block into `app/globals.css`. Wire `next/font` for Fraunces, Inter Tight, JetBrains Mono, Caveat with `display: 'swap'` and `preload: true` for Fraunces + Inter Tight. Land before any component work.
2. **Primitive components.** Button → Input/Textarea → Card → Badge in one slice; Avatar + Skeleton + round-pips Progress in another; overlay primitives (Dialog, Toast, Tabs, Tooltip) in a third. A `/dev/components` route renders every variant×state matrix for visual review on the preview deploy.
3. **Layout shell + avatar-menu state machine.** App bar + page container + footer. Wire root layout. Avatar menu's three states (anonymous / guest / permanent) ship with the shell.
4. **Game components.** RoundCard → GuessInput → ScoreReveal → CommentCard (rail pattern locked in) → LeaderboardRow → NicknamePrompt + nickname validation lib.
5. **Solo flow.** `/play/solo` guess state, then inline reveal + auto-advance. Solo has no end screen.
6. **Daily flow + leaderboard.** `daily_run_totals` schema first, then `/play/daily` route + completion hook, then leaderboard logic lib, then `/leaderboard` (today tab, then week + all-time tabs), then `/play/daily/end` summary.
7. **Auth + account.** `/login` + `/signup`, then `/account` (stats + settings + upgrade-from-anonymous).
8. **Multiplayer.** Realtime client + connection-state banner first, then rooms schema + 6-char code generator + db wrapper, then PlayerChip + RoundTimer components, then `/rooms` entry hub, then `/r/[code]` lobby (handles both host-created and random modes), then random matchmaking queue, then `/r/[code]/play` (synchronous, simultaneous reveal, 5s auto-advance), then `/r/[code]/end` + replay flow.
9. **Final assembly.** Landing redesign (CTAs land at all major routes — solo, daily, rooms). `/legal/[slug]` + ToS + Privacy + footer wiring. `next.config` redirects from killed routes. Cleanup (delete old route files + retired helpers). Cutover: merge `dev` to `main` with a merge commit.

Do not begin step N before step N-1 is in `dev`. Do not split the rail-comment pattern across two slices — it lives or dies as a single component change. Do not split the multiplayer simultaneous-reveal mechanic across two slices for the same reason; the timer-driven and all-submitted triggers are the same code path.

— end —
