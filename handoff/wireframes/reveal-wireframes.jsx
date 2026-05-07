/* global React, SBox, ImgPlaceholder, Squiggle, Arrow, MobileFrame, DesktopFrame, PairLayout, SBtn, Hand, Mono, Annot, AvatarBubble, RoomCode, ScoreDot, LeaderRow, INK, INK_SOFT, INK_FAINT, PAPER, PAPER_2, PAPER_3, ACCENT, ACCENT_SOFT, ACCENT_2, ACCENT_2_SOFT, TEAM_BLUE, TEAM_PURPLE, TEAM_GREEN, BAND_GREEN, BAND_BLUE, BAND_YELLOW, BAND_RED */

// Shared: top-3 comment + first reply data
const TOP_3 = [
  { upvotes: '14.2k', user: 'redditor_42', text: "sounds like she's the boss now.", reply: { user: 'midnight_mike', text: "promotion through cat photo. peak corporate." } },
  { upvotes: '6.8k', user: 'workfromhomer', text: "RIP your career, hello tiktok mom era.", reply: { user: 'anon_47', text: "the cat is the only one with healthy boundaries here" } },
  { upvotes: '3.1k', user: 'caffeineghost', text: "should've sent two cats minimum.", reply: { user: 'lurkybird', text: "agreed. one cat reads as flirty. two cats reads as policy." } },
];

// =========================================================
// REVEAL 1 — Score hero + Top-3 thread feed
// =========================================================
function Reveal1() {
  const ThreadItem = ({ rank, c, scale = 1 }) => (
    <div style={{ marginTop: 6 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        <div style={{ width: 18, fontFamily: 'JetBrains Mono', fontSize: 9 * scale, color: ACCENT, fontWeight: 600 }}>#{rank}</div>
        <div style={{ flex: 1 }}>
          <Mono size={8 * scale}>u/{c.user} · {c.upvotes} ↑</Mono>
          <Hand size={11 * scale} style={{ display: 'block', marginTop: 1, lineHeight: 1.2 }}>"{c.text}"</Hand>
          <div style={{ borderLeft: `1.5px solid ${INK_FAINT}`, paddingLeft: 6, marginTop: 4, marginLeft: 4 }}>
            <Mono size={8 * scale}>↳ u/{c.reply.user}</Mono>
            <Hand size={10 * scale} color={INK_SOFT} style={{ display: 'block', lineHeight: 1.2 }}>{c.reply.text}</Hand>
          </div>
        </div>
      </div>
    </div>
  );
  const Body = ({ scale = 1, mobile = false }) => (
    <div style={{ padding: 12, height: '100%', display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
        <Hand size={mobile ? 52 : 72} weight={700} color={ACCENT} style={{ lineHeight: 0.9, letterSpacing: -2 }}>87</Hand>
        <div>
          <Hand size={mobile ? 14 : 17} weight={600}>close enough.</Hand>
          <Mono size={9 * scale} style={{ display: 'block' }}>matched comment #1 · +20 punchline</Mono>
        </div>
      </div>
      <Squiggle w={120} h={5} style={{ marginTop: 2 }} />
      <Mono size={9 * scale} style={{ marginTop: 2 }}>top 3 + replies (the actual thread)</Mono>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {TOP_3.map((c, i) => <ThreadItem key={i} rank={i + 1} c={c} scale={scale} />)}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
        <SBtn h={28}>flag</SBtn>
        <SBtn accent h={32}>next round →</SBtn>
      </div>
    </div>
  );
  return <PairLayout mobile={<Body scale={0.85} mobile />} desktop={<Body scale={1} />}
    notes="C1 — Score hero + thread feed. Big number top-left; #1/#2/#3 with first replies stack below as a real Reddit thread. Best of both worlds: dopamine + entertainment payoff." />;
}

// =========================================================
// REVEAL 2 — "Which one did you match?" — score against any of the top 3
// =========================================================
function Reveal2() {
  const Match = ({ rank, c, score, best, scale }) => (
    <div style={{
      padding: 8, border: `1.5px solid ${best ? ACCENT : INK_FAINT}`, borderRadius: 8,
      background: best ? ACCENT_SOFT : 'transparent', marginBottom: 6,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Mono size={9 * scale} color={best ? ACCENT : INK_SOFT}>vs #{rank} · {c.upvotes}↑</Mono>
        <Hand size={best ? 18 * scale : 14 * scale} weight={700} color={best ? ACCENT : INK_SOFT}>{score}</Hand>
      </div>
      <Hand size={11 * scale} style={{ display: 'block', marginTop: 2, lineHeight: 1.2, opacity: best ? 1 : 0.7 }}>"{c.text}"</Hand>
    </div>
  );
  const Body = ({ scale = 1, mobile = false }) => (
    <div style={{ padding: 12, height: '100%', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <Mono size={9 * scale}>round 47 · revealed</Mono>
      <Hand size={mobile ? 13 : 15} color={INK_SOFT} style={{ display: 'block' }}>your guess: <span style={{ color: INK }}>"sounds like she's running things now"</span></Hand>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <Hand size={mobile ? 32 : 42} weight={700} color={ACCENT}>87</Hand>
        <Hand size={11 * scale} color={INK_SOFT}>best match: comment #1</Hand>
      </div>
      <Match rank={1} c={TOP_3[0]} score={87} best scale={scale} />
      <Match rank={2} c={TOP_3[1]} score={34} scale={scale} />
      <Match rank={3} c={TOP_3[2]} score={51} scale={scale} />
      <div style={{ flex: 1 }} />
      <Hand size={11 * scale} color={INK_SOFT} style={{ textAlign: 'center' }}>
        score = max(top-3 matches) + bonuses
      </Hand>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <SBtn h={28}>see thread →</SBtn>
        <SBtn accent h={32}>next →</SBtn>
      </div>
    </div>
  );
  return <PairLayout mobile={<Body scale={0.85} mobile />} desktop={<Body scale={1} />}
    notes="C2 — Score-against-any. Three boxes show your guess scored against each top-3 comment; the best one wins. Rewards near-misses on the #2/#3 path. Real scoring change implied — discuss before committing." />;
}

// =========================================================
// REVEAL 3 — Color-flood band w/ thread below
// =========================================================
function Reveal3() {
  const Body = ({ scale = 1, mobile = false }) => (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: BAND_GREEN, padding: 14, color: PAPER, textAlign: 'center', flex: '0 0 auto' }}>
        <Mono size={10 * scale} color={PAPER} style={{ opacity: 0.85 }}>BULLSEYE · 92</Mono>
        <Hand size={mobile ? 24 : 32} weight={700} color={PAPER} style={{ display: 'block', lineHeight: 1, marginTop: 2 }}>nailed it.</Hand>
      </div>
      <div style={{ padding: 10, flex: 1, overflow: 'hidden' }}>
        <Mono size={9 * scale}>the actual top 3:</Mono>
        {TOP_3.map((c, i) => (
          <div key={i} style={{ marginTop: 5, paddingLeft: i === 0 ? 0 : 8, opacity: i === 0 ? 1 : 0.7, borderLeft: i === 0 ? `2px solid ${BAND_GREEN}` : 'none' }}>
            <Mono size={8 * scale}>#{i + 1} · {c.upvotes}↑ · u/{c.user}</Mono>
            <Hand size={mobile ? 12 : 13} style={{ display: 'block', lineHeight: 1.2 }}>"{c.text}"</Hand>
            {i === 0 && (
              <Hand size={10 * scale} color={INK_SOFT} style={{ display: 'block', marginTop: 2, fontStyle: 'italic' }}>↳ u/{c.reply.user}: {c.reply.text}</Hand>
            )}
          </div>
        ))}
      </div>
      <div style={{ padding: 10, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <SBtn h={28}>flag</SBtn><SBtn accent h={32}>next →</SBtn>
      </div>
    </div>
  );
  return <PairLayout mobile={<Body scale={0.85} mobile />} desktop={<Body scale={1} />}
    notes="C3 — Color-flood band + thread. Top half shouts the score band; bottom half scrolls the top-3. Kills it for streamers — band is readable from a couch." />;
}

// =========================================================
// REVEAL 4 — Slot-machine ticker → expanded with #2/#3 mini-cards
// =========================================================
function Reveal4() {
  const Reel = ({ digit, scale = 1 }) => (
    <div style={{ display: 'inline-block', width: 50 * scale, height: 80 * scale, border: `2px solid ${INK_SOFT}`, borderRadius: 8, position: 'relative', overflow: 'hidden', background: PAPER_2, margin: '0 3px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', fontFamily: 'Patrick Hand', fontSize: 46 * scale, lineHeight: 1, fontWeight: 700, position: 'absolute', top: 12 * scale - 46 * scale, left: 0, right: 0, textAlign: 'center' }}>
        <span style={{ opacity: 0.2, color: INK }}>{(digit + 9) % 10}</span>
        <span style={{ color: ACCENT }}>{digit}</span>
        <span style={{ opacity: 0.2, color: INK }}>{(digit + 1) % 10}</span>
      </div>
      <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, background: INK_FAINT, transform: 'translateY(-10px)', opacity: 0.5 }} />
      <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, background: INK_FAINT, transform: 'translateY(22px)', opacity: 0.5 }} />
    </div>
  );
  const MiniThread = ({ c, rank, scale }) => (
    <div style={{ padding: 6, border: `1px dashed ${INK_FAINT}`, borderRadius: 6, flex: 1 }}>
      <Mono size={8 * scale}>#{rank} · {c.upvotes}↑</Mono>
      <Hand size={10 * scale} style={{ display: 'block', lineHeight: 1.15, marginTop: 2 }}>"{c.text.slice(0, 40)}{c.text.length > 40 ? '…' : ''}"</Hand>
    </div>
  );
  const Body = ({ scale = 1, mobile = false }) => (
    <div style={{ padding: 12, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <Mono size={9 * scale}>spinning…</Mono>
      <div style={{ display: 'flex' }}>
        <Reel digit={8} scale={mobile ? 0.7 : 1} />
        <Reel digit={7} scale={mobile ? 0.7 : 1} />
      </div>
      <Hand size={mobile ? 14 : 18} weight={700}>JACKPOT? not quite.</Hand>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
        {['+ semantic 62', '+ punchline +20', '+ keyword +5'].map((b, i) => (
          <span key={i} style={{ display: 'inline-block', padding: '2px 8px', border: `1.2px solid ${ACCENT}`, color: ACCENT, fontFamily: 'Patrick Hand', fontSize: 11 * scale, borderRadius: 12 }}>{b}</span>
        ))}
      </div>
      <div style={{ width: '100%', padding: '6px 0', borderTop: `1px solid ${INK_FAINT}`, marginTop: 4 }}>
        <Mono size={8 * scale} style={{ textAlign: 'center', display: 'block' }}>real top 3 ↓</Mono>
      </div>
      <div style={{ display: 'flex', gap: 6, width: '100%' }}>
        <MiniThread rank={1} c={TOP_3[0]} scale={scale} />
        <MiniThread rank={2} c={TOP_3[1]} scale={scale} />
        <MiniThread rank={3} c={TOP_3[2]} scale={scale} />
      </div>
      <div style={{ flex: 1 }} />
      <SBtn accent>↻ pull again</SBtn>
    </div>
  );
  return <PairLayout mobile={<Body scale={0.85} mobile />} desktop={<Body scale={1} />}
    notes="C4 — Slot-machine + 3 mini-threads. Reels roll, then top-3 cards slide in below. Tap any to expand its reply. TikTok-friendly." />;
}

// =========================================================
// REVEAL 5 — Reddit-thread metaphor with all 3 + replies, your guess inserted
// =========================================================
function Reveal5() {
  const Body = ({ scale = 1, mobile = false }) => (
    <div style={{ padding: 10, height: '100%', display: 'flex', flexDirection: 'column', gap: 6 }}>
      {/* Detached answer card pinned at TOP */}
      <div style={{ padding: 8, border: `1.5px dashed ${ACCENT_2}`, borderRadius: 6, background: ACCENT_2_SOFT, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <Mono size={8 * scale} color={ACCENT_2}>YOUR GUESS</Mono>
          <Hand size={mobile ? 11 : 12} style={{ display: 'block', lineHeight: 1.15, marginTop: 1 }}>"sounds like she's running things now"</Hand>
        </div>
        <div style={{ textAlign: 'right' }}>
          <Hand size={mobile ? 22 : 28} weight={700} color={ACCENT}>87</Hand>
          <Mono size={8 * scale} color={INK_SOFT} style={{ display: 'block' }}>matched #1</Mono>
        </div>
      </div>
      <div style={{ borderTop: `1px dashed ${INK_FAINT}`, paddingTop: 6 }}>
        <Mono size={9 * scale}>r/tifu · the actual thread ↓</Mono>
        <Hand size={mobile ? 12 : 14} weight={600} style={{ lineHeight: 1.15, display: 'block', marginTop: 2 }}>
          TIFU by texting my boss a photo of my cat at 2am
        </Hand>
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {TOP_3.map((c, i) => (
          <div key={i} style={{ borderLeft: `2px solid ${i === 0 ? ACCENT : INK_FAINT}`, paddingLeft: 7, marginTop: i === 0 ? 0 : 8 }}>
            <Mono size={8 * scale}>u/{c.user} · {c.upvotes}↑ {i === 0 ? '· TOP' : ''}</Mono>
            <Hand size={11 * scale} style={{ display: 'block', lineHeight: 1.15 }}>"{c.text}"</Hand>
            <div style={{ borderLeft: `1.5px solid ${INK_FAINT}`, paddingLeft: 6, marginTop: 4, marginLeft: 2, opacity: 0.75 }}>
              <Mono size={8 * scale}>↳ u/{c.reply.user}</Mono>
              <Hand size={10 * scale} color={INK_SOFT} style={{ display: 'block', lineHeight: 1.15 }}>{c.reply.text}</Hand>
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <SBtn h={28}>report</SBtn><SBtn accent h={32}>next →</SBtn>
      </div>
    </div>
  );
  return <PairLayout mobile={<Body scale={0.9} mobile />} desktop={<Body scale={1} />}
    notes="C5 — Full thread reveal, your-answer DETACHED. Your guess + score live in a separate card pinned at the top (could just as easily go bottom). Below it is the actual Reddit thread: top 3 each with their first reply, untouched. Cleaner separation, no awkward 'you' avatar in the thread." />;
}

// =========================================================
// REVEAL 6 — Tournament-style podium card (top 3 = 1st/2nd/3rd, you below)
// =========================================================
function Reveal6() {
  const Podium = ({ rank, c, scale, h, color }) => (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <Hand size={11 * scale} weight={700} color={color}>#{rank}</Hand>
      <SBox w={'100%'} h={h} sw={1.4} stroke={color} fill={PAPER_2}>
        <div style={{ padding: 6 }}>
          <Mono size={8 * scale} color={color}>{c.upvotes}↑</Mono>
          <Hand size={10 * scale} style={{ display: 'block', lineHeight: 1.15, marginTop: 2 }}>"{c.text.slice(0, 60)}{c.text.length > 60 ? '…' : ''}"</Hand>
          <Hand size={9 * scale} color={INK_SOFT} style={{ display: 'block', marginTop: 4, fontStyle: 'italic', lineHeight: 1.15 }}>↳ {c.reply.text.slice(0, 50)}…</Hand>
        </div>
      </SBox>
    </div>
  );
  const Body = ({ scale = 1, mobile = false }) => (
    <div style={{ padding: 12, height: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <Mono size={9 * scale}>r/tifu · top 3 podium</Mono>
        <Hand size={mobile ? 16 : 20} weight={700} color={ACCENT}>you scored 87</Hand>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: mobile ? 220 : 270 }}>
        <Podium rank={2} c={TOP_3[1]} scale={scale} h={mobile ? 160 : 200} color={INK_SOFT} />
        <Podium rank={1} c={TOP_3[0]} scale={scale} h={mobile ? 200 : 240} color={ACCENT} />
        <Podium rank={3} c={TOP_3[2]} scale={scale} h={mobile ? 130 : 170} color={INK_SOFT} />
      </div>
      <div style={{ padding: 8, border: `1.5px dashed ${ACCENT_2}`, borderRadius: 8, background: ACCENT_2_SOFT, marginTop: 4 }}>
        <Mono size={9 * scale} color={ACCENT_2}>YOUR GUESS</Mono>
        <Hand size={11 * scale} style={{ display: 'block' }}>"sounds like she's running things now"</Hand>
      </div>
      <div style={{ flex: 1 }} />
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}><SBtn accent>next →</SBtn></div>
    </div>
  );
  return <PairLayout mobile={<Body scale={0.85} mobile />} desktop={<Body scale={1} />}
    notes="C6 — Top-3 podium. 1st/2nd/3rd as a literal podium with their first reply quoted underneath. Your guess in a callout below. Strong frame for the ‘top 3 are the entertainment’ pivot." />;
}

Object.assign(window, { Reveal1, Reveal2, Reveal3, Reveal4, Reveal5, Reveal6 });
