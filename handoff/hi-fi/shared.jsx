/* global React */
const { useState, useEffect, useRef, useMemo } = React;

// ============== shared bits ==============
const SAMPLE_POSTS = [
  {
    sub: 'r/tifu', age: '8h', up: '24.1k',
    title: "TIFU by responding to my boss's \"wyd\" text at 2am with a photo of my cat",
    body: "Title says it all. Was half asleep, hit send before my brain caught up. He has not replied. It's been 19 hours. I am preparing my resignation letter. UPDATE: he just opened it and replied 'cute'.",
    image: null,
    top3: [
      { user: 'redditor_42', up: '14.2k', text: "sounds like she's the boss now.", reply: { user: 'midnight_mike', up: '4.1k', text: "promotion through cat photo. peak corporate." } },
      { user: 'workfromhomer', up: '6.8k', text: "RIP your career, hello tiktok mom era.", reply: { user: 'anon_47', up: '2.0k', text: "the cat is the only one with healthy boundaries here" } },
      { user: 'caffeineghost', up: '3.1k', text: "should've sent two cats minimum.", reply: { user: 'lurkybird', up: '1.4k', text: "agreed. one cat reads as flirty. two cats reads as policy." } },
    ],
  },
  {
    sub: 'r/facepalm', age: '14h', up: '52.4k',
    title: "I asked the cashier if they sold left-handed scissors and she actually went to check",
    body: "I was joking. She came back with a manager. The manager came back with an employee handbook. I now own left-handed scissors.",
    image: 'image', // placeholder slot
    top3: [
      { user: 'punchline_pat', up: '22.1k', text: "the handbook part destroyed me", reply: { user: 'workfromhomer', up: '6.4k', text: "imagine being the manager who had to verify this" } },
      { user: 'commentcat', up: '11.0k', text: "you're now in the system as a southpaw. they will track you.", reply: { user: 'redditor_42', up: '3.2k', text: "left-handed loyalty program" } },
      { user: 'caffeineghost', up: '4.9k', text: "the customer is always right (handed)", reply: { user: 'midnight_mike', up: '1.8k', text: "i hate that this works" } },
    ],
  },
  {
    sub: 'r/AmItheAsshole', age: '3h', up: '8.7k',
    title: "AITA for refusing to eat my mother-in-law's vegan lasagna at my own birthday dinner?",
    body: "I'm not vegan. My birthday. She made it 'for everyone' which means for her. I ordered pizza to my own party. Husband says I made a scene. Did I?",
    image: null,
    top3: [
      { user: 'snorlax_42', up: '5.1k', text: "NTA. it's your birthday. she brought a vegan PSA, not a gift.", reply: { user: 'lurkybird', up: '1.9k', text: "'a vegan PSA' i'm screaming" } },
      { user: 'comment_king', up: '2.4k', text: "ESH. you could've just eaten a slice and moved on, but also: why is she like this", reply: { user: 'anon_47', up: '0.9k', text: "the answer is always: she's like this." } },
      { user: 'reddit_lurker', up: '1.2k', text: "NTA but next year tell her the theme is 'meat'", reply: { user: 'punchline_pat', up: '0.6k', text: "carnivore-themed birthday is so real" } },
    ],
  },
];

// scoring helper
function scoreGuess(guess, target) {
  if (!guess) return 0;
  const a = guess.toLowerCase().split(/\s+/);
  const b = target.toLowerCase().split(/\s+/);
  const set = new Set(b);
  let hit = 0; for (const w of a) if (set.has(w)) hit++;
  const base = Math.min(95, 30 + hit * 14 + Math.floor(Math.random() * 10));
  return base;
}

// =================================================================
// LAYOUT — Frame component used by every screen
// =================================================================
function Screen({ children, className = '', tone = 'dark' }) {
  return (
    <div className={`screen ${className}`} data-tone={tone}>
      {children}
    </div>
  );
}

// little background flourish — subtle warm glow + grid
function Backdrop() {
  return (
    <div className="backdrop">
      <div className="backdrop-glow" />
      <svg className="backdrop-grid" width="100%" height="100%">
        <defs>
          <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
            <path d="M 32 0 L 0 0 0 32" fill="none" stroke="currentColor" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>
    </div>
  );
}

// app bar (used in app-style screens)
function AppBar({ left, center, right }) {
  return (
    <header className="appbar">
      <div className="appbar-left">{left}</div>
      <div className="appbar-center">{center}</div>
      <div className="appbar-right">{right}</div>
    </header>
  );
}

// Reusable squiggle SVG (decoration)
function SquiggleDeco({ width = 120, color = 'var(--accent)', stroke = 2 }) {
  return (
    <svg width={width} height="6" viewBox={`0 0 ${width} 6`} className="squiggle">
      <path d={`M 0 3 ${Array.from({ length: Math.floor(width / 8) }, (_, i) => {
        const x = (i + 1) * 8;
        return `Q ${x - 4} ${i % 2 ? 0 : 6}, ${x} 3`;
      }).join(' ')}`} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" />
    </svg>
  );
}

// avatar
function Avatar({ name, color = 'var(--accent)', you = false, size = 28 }) {
  const initial = (name || '?')[0].toUpperCase();
  return (
    <div className="avatar" style={{ width: size, height: size, background: you ? 'var(--accent-2)' : color, fontSize: size * 0.45 }}>
      {initial}
    </div>
  );
}

// score band color
function bandColor(s) {
  if (s >= 85) return 'var(--band-bullseye)';
  if (s >= 65) return 'var(--band-warm)';
  if (s >= 40) return 'var(--band-cold)';
  return 'var(--band-cold-2)';
}

Object.assign(window, {
  SAMPLE_POSTS, scoreGuess, Screen, Backdrop, AppBar, SquiggleDeco, Avatar, bandColor,
  useState, useEffect, useRef, useMemo,
});
