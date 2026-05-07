/* global React, SBox, ImgPlaceholder, Squiggle, Arrow, MobileFrame, DesktopFrame, PairLayout, SBtn, Hand, Mono, Annot, AvatarBubble, RoomCode, ScoreDot, LeaderRow, INK, INK_SOFT, INK_FAINT, PAPER, PAPER_2, PAPER_3, ACCENT, ACCENT_SOFT, ACCENT_2, ACCENT_2_SOFT, TEAM_BLUE, TEAM_PURPLE, TEAM_GREEN */

// =========================================================
// SOLO ROUND 1 — Classic single column, post title big, one input
// =========================================================
function Round1() {
  const Body = ({ scale = 1, mobile = false }) => (
    <div style={{ padding: 14, height: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Mono size={9 * scale}>round 47 · r/tifu</Mono>
        <Mono size={9 * scale}>skip ›</Mono>
      </div>
      <Hand size={mobile ? 17 : 22} weight={600} style={{ lineHeight: 1.15, display: 'block' }}>
        TIFU by responding to my boss's "wyd" text at 2am with a&nbsp;photo of my cat.
      </Hand>
      <Hand size={12 * scale} color={INK_SOFT}>what do you think the top comment said?</Hand>
      <div style={{ flex: 1 }} />
      <SBox w={mobile ? 250 : 670} h={mobile ? 90 : 100} dashed sw={1.4} stroke={INK_SOFT}>
        <div style={{ padding: 10 }}><Mono size={10 * scale}>type your guess…</Mono></div>
      </SBox>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Mono size={9 * scale}>enter ↵ to submit</Mono>
        <SBtn accent>guess</SBtn>
      </div>
    </div>
  );
  return <PairLayout mobile={<Body scale={0.85} mobile />} desktop={<Body scale={1} />}
    notes="B1 — Wordle-clone classic (dark). Title XL, single multiline input, primary button bottom-right. No image. Defaults that ship fastest." />;
}

// =========================================================
// SOLO ROUND 2 — IMAGE-POST variant (post comes with an image)
// =========================================================
function Round2({ withImage = true }) {
  const Body = ({ scale = 1, mobile = false }) => {
    const colW = mobile ? 252 : 670;
    return (
      <div style={{ padding: mobile ? 10 : 14, height: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Mono size={9 * scale}>round 219 · r/facepalm</Mono>
          <Mono size={9 * scale}>skip ›</Mono>
        </div>
        <Hand size={mobile ? 14 : 18} weight={600} style={{ lineHeight: 1.15, display: 'block' }}>
          "I asked the cashier if they sold left-handed scissors and she actually went to check"
        </Hand>
        {withImage && (
          <ImgPlaceholder w={colW} h={mobile ? 110 : 170} label="post image · attached (optional)" />
        )}
        <div style={{ flex: 1 }} />
        <SBox w={colW} h={mobile ? 60 : 70} dashed sw={1.4} stroke={INK_SOFT}>
          <div style={{ padding: 10 }}><Mono size={10 * scale}>your guess at the top comment…</Mono></div>
        </SBox>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Mono size={9 * scale}>enter ↵ to submit</Mono>
          <SBtn accent>guess</SBtn>
        </div>
      </div>
    );
  };
  return <PairLayout mobile={<Body scale={0.85} mobile />} desktop={<Body scale={1} />}
    notes="B2 — Image-aware round. Image is OPTIONAL — when the post has one (r/facepalm, r/mildlyinfuriating), it slots in between title and input. When the post is text-only, the image block is omitted and the title/input expand to fill. Same chrome both ways. Mobile widths fit inside the 280px frame, no clipping." />;
}

// =========================================================
// SOLO ROUND 3 — Reply composer (Reddit-thread metaphor)
// =========================================================
function Round3() {
  const Body = ({ scale = 1, mobile = false }) => (
    <div style={{ padding: 12, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Mono size={9 * scale}>r/AskReddit · 8h ago · 24.1k ↑</Mono>
      <Hand size={mobile ? 16 : 20} weight={600} style={{ marginTop: 4, lineHeight: 1.15, display: 'block' }}>
        What's the most expensive thing you've ever broken without telling anyone?
      </Hand>
      <div style={{ marginTop: 8, borderLeft: `2px solid ${INK_FAINT}`, paddingLeft: 8 }}>
        <Mono size={9 * scale}>14.2k ↑ · top comment</Mono>
        <div style={{ marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {[40, 60, 30, 80, 50, 28, 70].map((w, i) => <div key={i} style={{ width: w, height: 8, background: INK_FAINT, opacity: 0.6, borderRadius: 2 }} />)}
        </div>
        <Annot style={{ marginTop: 4 }}>↑ hidden until you guess</Annot>
      </div>
      <div style={{ flex: 1 }} />
      <div style={{ borderTop: `1.5px solid ${INK_FAINT}`, paddingTop: 8, display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        <AvatarBubble name="you" you size={28} />
        <SBox w={mobile ? 170 : 540} h={48} dashed sw={1.3} stroke={INK_SOFT}>
          <div style={{ padding: 8 }}><Mono size={10 * scale}>reply as the top comment…</Mono></div>
        </SBox>
        <SBtn accent h={32}>↑</SBtn>
      </div>
    </div>
  );
  return <PairLayout mobile={<Body scale={0.9} mobile />} desktop={<Body scale={1} />}
    notes="B3 — Reply-composer metaphor. Hidden top comment shows as a redacted block. You write your guess into Reddit's reply UI. Pairs with Welcome A4." />;
}

// =========================================================
// SOLO ROUND 4 — MULTIPLAYER LIVE ROUND (streamer-readable XL with player chips)
// =========================================================
function Round4() {
  const players = [
    { n: 'streamer_dave', c: ACCENT, score: 412 },
    { n: 'kev', c: ACCENT_2, you: true, score: 387 },
    { n: 'maya', c: TEAM_PURPLE, score: 380 },
    { n: 'logan', c: TEAM_GREEN, score: 351 },
    { n: 'pip', c: TEAM_BLUE, score: 322 },
  ];
  const submitted = [true, false, true, true, false];
  const Body = ({ scale = 1, mobile = false }) => (
    <div style={{ padding: 12, height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Top bar: room code + round + timer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <RoomCode code="PIZZA-7" size={mobile ? 'sm' : 'md'} />
        <Mono size={9 * scale}>round 3 / 8</Mono>
        <Hand size={mobile ? 18 : 22} weight={700} color={ACCENT}>00:14</Hand>
      </div>
      <Squiggle w="100%" h={4} style={{ marginTop: 4 }} color={ACCENT} />
      {/* Post */}
      <div style={{ marginTop: 8 }}>
        <Mono size={9 * scale}>r/AmItheAsshole</Mono>
        <Hand size={mobile ? 15 : 19} weight={700} style={{ display: 'block', marginTop: 2, lineHeight: 1.1, letterSpacing: -0.3 }}>
          AITA for refusing to eat my mother-in-law's vegan lasagna at my own birthday dinner?
        </Hand>
      </div>
      {/* Player chips with submitted state */}
      <div style={{ marginTop: 8, display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
        {players.map((p, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '2px 6px 2px 2px', border: `1px solid ${submitted[i] ? p.c : INK_FAINT}`, borderRadius: 14, opacity: submitted[i] ? 1 : 0.6 }}>
            <AvatarBubble name={p.n} color={p.c} you={p.you} size={18} />
            <Mono size={8 * scale} color={submitted[i] ? p.c : INK_FAINT}>{submitted[i] ? '✓' : '...'}</Mono>
          </div>
        ))}
        <Mono size={9 * scale} style={{ marginLeft: 4 }}>3 / 5 in</Mono>
      </div>
      <div style={{ flex: 1 }} />
      <SBox w={mobile ? 250 : 670} h={mobile ? 60 : 80} dashed sw={1.4} stroke={ACCENT_2}>
        <div style={{ padding: 8 }}><Mono size={10 * scale} color={ACCENT_2}>your guess (locked once timer hits 0)…</Mono></div>
      </SBox>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
        <Mono size={9 * scale}>chat is muted while you guess</Mono>
        <SBtn accent>lock it in →</SBtn>
      </div>
    </div>
  );
  return <PairLayout mobile={<Body scale={0.85} mobile />} desktop={<Body scale={1} />}
    desktopLabel="desktop / 1080p stream overlay"
    notes="B4 — Multiplayer live round. Room code + 30s timer pinned top. Player chips show submitted/typing state in real time. Mirrors competitive game-show format (Jackbox / Skribbl)." />;
}

// =========================================================
// SOLO ROUND 5 — Word-bank / Mad-libs
// =========================================================
function Round5() {
  const Chip = ({ children, scale = 1, picked }) => (
    <div style={{
      display: 'inline-block', padding: '4px 10px', margin: '3px 4px 3px 0',
      border: `1.4px solid ${picked ? ACCENT : INK_SOFT}`, borderRadius: 14,
      fontFamily: 'Patrick Hand', fontSize: 12 * scale,
      background: picked ? ACCENT_SOFT : 'transparent',
      color: picked ? ACCENT : INK,
    }}>{children}</div>
  );
  const Body = ({ scale = 1, mobile = false }) => (
    <div style={{ padding: 12, height: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <Mono size={9 * scale}>r/MaliciousCompliance · easy mode</Mono>
      <Hand size={mobile ? 15 : 18} weight={600} style={{ display: 'block', lineHeight: 1.15 }}>
        Boss said "do exactly what the manual says." Now we have 400 boxes of staples.
      </Hand>
      <Hand size={11 * scale} color={INK_SOFT}>build your guess from the word bank ↓</Hand>
      <SBox w={mobile ? 240 : 670} h={50} dashed sw={1.3} stroke={INK_SOFT}>
        <div style={{ padding: 6 }}>
          <Chip picked scale={scale}>guess</Chip>
          <Chip picked scale={scale}>that</Chip>
          <Chip picked scale={scale}>was</Chip>
          <span style={{ display: 'inline-block', width: 2, height: 14, background: INK, verticalAlign: 'middle', animation: 'blink 1s infinite' }} />
        </div>
      </SBox>
      <div style={{ flex: 1 }}>
        <Mono size={9 * scale}>tap to add</Mono>
        <div style={{ marginTop: 4 }}>
          {['the', 'manager', 'idiot', 'malicious', 'compliance', 'staples', 'forever', 'literally', 'genius', 'lol', 'unionize', 'fired', 'corporate'].map((w, i) => <Chip key={i} scale={scale}>{w}</Chip>)}
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <SBtn>switch to typing</SBtn>
        <SBtn accent>guess</SBtn>
      </div>
    </div>
  );
  return <PairLayout mobile={<Body scale={0.9} mobile />} desktop={<Body scale={1} />}
    notes="B5 — Word-bank / Mad-libs. ‘Easy mode’ alt where you tap chips. Lower friction for casual / TikTok pickup, but constrains scoring. Pitch as opt-in mode." />;
}

// =========================================================
// SOLO ROUND 6 — Confidence slider (poker-style)
// =========================================================
function Round6() {
  const Body = ({ scale = 1, mobile = false }) => (
    <div style={{ padding: 12, height: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <Mono size={9 * scale}>r/AskReddit</Mono>
      <Hand size={mobile ? 16 : 20} weight={600} style={{ display: 'block', lineHeight: 1.15 }}>
        What's the most useless skill you've mastered?
      </Hand>
      <SBox w={mobile ? 250 : 670} h={56} dashed sw={1.3} stroke={INK_SOFT}>
        <div style={{ padding: 8 }}><Mono size={10 * scale}>your guess…</Mono></div>
      </SBox>
      <Hand size={11 * scale} color={INK_SOFT}>or… commit how confident you are ↓</Hand>
      <div style={{ position: 'relative', marginTop: 4 }}>
        <div style={{ height: 32, border: `1.5px solid ${INK_SOFT}`, borderRadius: 16, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '60%', background: ACCENT_SOFT, borderRight: `1.5px solid ${ACCENT}` }} />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px', fontFamily: 'JetBrains Mono', fontSize: 9, color: INK_SOFT }}>
            <span>blind guess (1×)</span>
            <span>all-in (3×)</span>
          </div>
          <div style={{ position: 'absolute', left: '60%', top: -4, bottom: -4, width: 4, background: ACCENT, transform: 'translateX(-2px)', borderRadius: 2 }} />
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Hand size={11 * scale} color={ACCENT}>×1.8 multiplier</Hand>
        <SBtn accent>commit & guess</SBtn>
      </div>
    </div>
  );
  return <PairLayout mobile={<Body scale={0.9} mobile />} desktop={<Body scale={1} />}
    notes="B6 — Confidence slider. Stake your score multiplier. Adds risk/reward — surprisingly fun on streams. Risk: complicates scoring story." />;
}

Object.assign(window, { Round1, Round2, Round3, Round4, Round5, Round6 });
