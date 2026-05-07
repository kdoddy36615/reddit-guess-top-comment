/* global React, SBox, ImgPlaceholder, Squiggle, MobileFrame, DesktopFrame, PairLayout, SBtn, Hand, Mono, Annot, AvatarBubble, RoomCode, ScoreDot, LeaderRow, INK, INK_SOFT, INK_FAINT, PAPER, PAPER_2, PAPER_3, ACCENT, ACCENT_SOFT, ACCENT_2, ACCENT_2_SOFT, TEAM_BLUE, TEAM_PURPLE, TEAM_GREEN */

// =========================================================
// MULTI 1 — Room lobby (host view, pre-match)
// =========================================================
function Multi1() {
  const players = [
    { n: 'streamer_dave', c: ACCENT, host: true },
    { n: 'kev', c: ACCENT_2, you: true },
    { n: 'maya', c: TEAM_PURPLE },
    { n: 'logan', c: TEAM_GREEN },
    { n: 'pip', c: TEAM_BLUE },
    { n: 'jordan', c: TEAM_PURPLE },
    { n: 'sam', c: TEAM_BLUE },
  ];
  const Body = ({ scale = 1, mobile = false }) => (
    <div style={{ padding: 12, height: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ textAlign: 'center' }}>
        <Mono size={9 * scale}>your room code · share to join</Mono>
        <div style={{ marginTop: 4 }}><RoomCode code="PIZZA-7" size={mobile ? 'md' : 'lg'} /></div>
        <Mono size={9 * scale} style={{ display: 'block', marginTop: 4 }}>guesstopcomment.app/r/PIZZA-7</Mono>
      </div>
      <Squiggle w={120} h={5} style={{ alignSelf: 'center' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Mono size={9 * scale}>{players.length} players in lobby</Mono>
        <Mono size={9 * scale} color={ACCENT}>● live</Mono>
      </div>
      <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: 6, alignContent: 'flex-start' }}>
        {players.map((p, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px 3px 3px', border: `1px solid ${p.c}`, borderRadius: 14 }}>
            <AvatarBubble name={p.n} color={p.c} you={p.you} size={20} />
            <Hand size={10 * scale} color={p.you ? ACCENT_2 : INK}>{p.n}{p.host ? ' 👑' : ''}</Hand>
          </div>
        ))}
        <SBtn dashed h={26} style={{ fontSize: 11 }}>+ invite</SBtn>
      </div>
      <SBox w="100%" h={mobile ? 70 : 60} sw={1.3} stroke={INK_FAINT} fill={PAPER_2}>
        <div style={{ padding: 8, display: 'flex', flexDirection: mobile ? 'column' : 'row', gap: 8, alignItems: mobile ? 'flex-start' : 'center', justifyContent: 'space-between' }}>
          <Mono size={9 * scale}>match settings</Mono>
          <div style={{ display: 'flex', gap: 8, fontFamily: 'JetBrains Mono', fontSize: 9 * scale, color: INK_SOFT }}>
            <span>rounds: <span style={{ color: ACCENT }}>8</span></span>
            <span>timer: <span style={{ color: ACCENT }}>30s</span></span>
            <span>subs: <span style={{ color: ACCENT }}>all</span></span>
          </div>
        </div>
      </SBox>
      <SBtn accent>start match (host) →</SBtn>
    </div>
  );
  return <PairLayout mobile={<Body scale={0.9} mobile />} desktop={<Body scale={1} />}
    notes="D1 — Room lobby (host view). Big share-friendly code, live player chips, match settings (rounds 5–10, timer, subs). Streamer-readable on a 2nd monitor while waiting for chat to join." />;
}

// =========================================================
// MULTI 2 — Mid-round live scoreboard (companion to Round 4)
// =========================================================
function Multi2() {
  const players = [
    { rank: 1, n: 'streamer_dave', c: ACCENT, score: 412, this: 92 },
    { rank: 2, n: 'kev', c: ACCENT_2, you: true, score: 387, this: 87 },
    { rank: 3, n: 'maya', c: TEAM_PURPLE, score: 380, this: 79 },
    { rank: 4, n: 'logan', c: TEAM_GREEN, score: 351, this: 64 },
    { rank: 5, n: 'pip', c: TEAM_BLUE, score: 322, this: 41 },
  ];
  const Body = ({ scale = 1, mobile = false }) => (
    <div style={{ padding: 12, height: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <RoomCode code="PIZZA-7" size="sm" />
        <Mono size={9 * scale}>between rounds · 3 / 8</Mono>
        <Mono size={9 * scale} color={ACCENT}>next in 00:08</Mono>
      </div>
      <Mono size={9 * scale}>round 3 just revealed — top comment "{`sounds like she's the boss now`}"</Mono>
      <Mono size={9 * scale} color={ACCENT_2}>LIVE SCOREBOARD</Mono>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {players.map((p, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 6px', borderRadius: 6,
            background: p.you ? ACCENT_2_SOFT : 'transparent', border: p.you ? `1px solid ${ACCENT_2}` : '1px solid transparent' }}>
            <Mono size={10 * scale} color={p.you ? ACCENT_2 : INK_SOFT} style={{ width: 18 }}>{String(p.rank).padStart(2, '0')}</Mono>
            <AvatarBubble name={p.n} color={p.c} you={p.you} size={20} />
            <Hand size={12 * scale} color={p.you ? ACCENT_2 : INK} style={{ flex: 1 }}>{p.n}</Hand>
            <Mono size={9 * scale} color={ACCENT}>+{p.this}</Mono>
            <Hand size={13 * scale} weight={700} color={p.you ? ACCENT_2 : INK} style={{ minWidth: 36, textAlign: 'right' }}>{p.score}</Hand>
          </div>
        ))}
      </div>
      <div style={{ flex: 1 }} />
      <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <ScoreDot key={i} filled={i <= 3} color={ACCENT} />)}
      </div>
      <SBtn accent>i'm ready →</SBtn>
    </div>
  );
  return <PairLayout mobile={<Body scale={0.9} mobile />} desktop={<Body scale={1} />}
    notes="D2 — Between-rounds scoreboard. Shows running total + this-round delta (+87) per player. ‘i'm ready’ advances; auto-advances on timer." />;
}

// =========================================================
// MULTI 3 — End-of-match results (winner card + final standings)
// =========================================================
function Multi3() {
  const final = [
    { rank: 1, n: 'streamer_dave', c: ACCENT, score: 712, w: '🥇' },
    { rank: 2, n: 'maya', c: TEAM_PURPLE, score: 698, w: '🥈' },
    { rank: 3, n: 'kev', c: ACCENT_2, you: true, score: 654, w: '🥉' },
    { rank: 4, n: 'logan', c: TEAM_GREEN, score: 612 },
    { rank: 5, n: 'pip', c: TEAM_BLUE, score: 543 },
  ];
  const Body = ({ scale = 1, mobile = false }) => (
    <div style={{ padding: 12, height: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ textAlign: 'center' }}>
        <Mono size={9 * scale}>match complete · 8 rounds · room PIZZA-7</Mono>
        <Hand size={mobile ? 22 : 28} weight={700} style={{ display: 'block', lineHeight: 1, marginTop: 4 }}>winner: <span style={{ color: ACCENT }}>streamer_dave</span></Hand>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {final.map((p, i) => (
          <LeaderRow key={i} scale={scale} rank={p.rank} name={`${p.w || ''} ${p.n}`.trim()} color={p.c} you={p.you} score={p.score} />
        ))}
      </div>
      <SBox w="100%" h={mobile ? 80 : 70} sw={1.3} fill={PAPER_2} stroke={INK_FAINT}>
        <div style={{ padding: 8 }}>
          <Mono size={9 * scale} color={ACCENT_2}>YOUR HIGHLIGHTS</Mono>
          <Hand size={11 * scale} style={{ display: 'block', marginTop: 2 }}>· best round: r/tifu · 92 (round 5)</Hand>
          <Hand size={11 * scale} style={{ display: 'block' }}>· clutch on r/Showerthoughts · +8 over avg</Hand>
        </div>
      </SBox>
      <div style={{ flex: 1 }} />
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <SBtn accent style={{ flex: 1 }}>rematch →</SBtn>
        <SBtn secondary style={{ flex: 1 }}>new room</SBtn>
        <SBtn dashed h={36}>save scores (sign up)</SBtn>
      </div>
    </div>
  );
  return <PairLayout mobile={<Body scale={0.9} mobile />} desktop={<Body scale={1} />}
    notes="D3 — End of match. Winner banner, final standings, your highlights, rematch / save-scores CTAs. Save-scores hooks into the linkIdentity upgrade — a high-emotion moment to convert anonymous → registered." />;
}

// =========================================================
// LEADERBOARD 1 — Daily leaderboard
// =========================================================
function Leader1() {
  const rows = [
    { rank: 1, n: 'comment_king', c: ACCENT, score: 742 },
    { rank: 2, n: 'snorlax_42', c: TEAM_PURPLE, score: 718 },
    { rank: 3, n: 'lurkybird', c: TEAM_GREEN, score: 705 },
    { rank: 4, n: 'caffeineghost', c: TEAM_BLUE, score: 691 },
    { rank: 5, n: 'workfromhomer', c: TEAM_PURPLE, score: 672 },
    { rank: 6, n: 'midnight_mike', c: ACCENT, score: 658 },
  ];
  const Body = ({ scale = 1, mobile = false }) => (
    <div style={{ padding: 12, height: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Hand size={mobile ? 22 : 26} weight={600}>today's leaderboard</Hand>
        <Mono size={9 * scale}>resets in 04:12</Mono>
      </div>
      <Mono size={9 * scale}>2026-05-07 · 8 rounds · 14,392 players</Mono>
      <div style={{ display: 'flex', gap: 4 }}>
        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <ScoreDot key={i} filled={i <= 5} color={ACCENT} />)}
        <Mono size={9 * scale} style={{ marginLeft: 6 }}>you · 5 / 8 · 412</Mono>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, overflow: 'hidden' }}>
        {rows.map((r, i) => <LeaderRow key={i} scale={scale} rank={r.rank} name={r.n} color={r.c} score={r.score} />)}
        <div style={{ borderTop: `1px dashed ${INK_FAINT}`, margin: '4px 0' }} />
        <LeaderRow scale={scale} rank={47} name="you (kev)" you score={412} delta="↑3" />
        <LeaderRow scale={scale} rank={48} name="anon_47" color={TEAM_BLUE} score={409} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <SBtn h={28}>friends only</SBtn>
        <SBtn accent h={32}>finish daily →</SBtn>
      </div>
    </div>
  );
  return <PairLayout mobile={<Body scale={0.9} mobile />} desktop={<Body scale={1} />}
    notes="E1 — Daily leaderboard. Top of board + your row pinned with neighbors. ‘Friends only’ toggle for once login is wired up. Finishing the daily pushes you up the board — strong come-back-tomorrow hook." />;
}

// =========================================================
// LEADERBOARD 2 — Global leaderboard (day · week · all-time)
// =========================================================
function Leader2() {
  const rows = [
    { rank: 1, n: 'u/HavingaBadDay', c: ACCENT, score: '98,412' },
    { rank: 2, n: 'streamer_dave', c: TEAM_PURPLE, score: '91,228' },
    { rank: 3, n: 'commentcat', c: TEAM_GREEN, score: '87,054' },
    { rank: 4, n: 'punchline_pat', c: TEAM_BLUE, score: '82,901' },
    { rank: 5, n: 'reddit_lurker', c: ACCENT_2, score: '79,103' },
  ];
  const Body = ({ scale = 1, mobile = false }) => (
    <div style={{ padding: 12, height: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <Hand size={mobile ? 22 : 26} weight={600}>global leaderboard</Hand>
      <div style={{ display: 'flex', gap: 4 }}>
        {['day', 'week', 'all-time', 'friends'].map((t, i) => (
          <div key={t} style={{ padding: '3px 10px', border: `1.4px solid ${i === 2 ? ACCENT : INK_FAINT}`, borderRadius: 14, fontFamily: 'JetBrains Mono', fontSize: 10, color: i === 2 ? ACCENT : INK_SOFT, background: i === 2 ? ACCENT_SOFT : 'transparent' }}>{t}</div>
        ))}
      </div>
      <Mono size={9 * scale}>2.1M players · ranks update hourly</Mono>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, overflow: 'hidden' }}>
        {rows.map((r, i) => <LeaderRow key={i} scale={scale} rank={r.rank} name={r.n} color={r.c} score={r.score} />)}
        <div style={{ borderTop: `1px dashed ${INK_FAINT}`, margin: '4px 0' }} />
        <LeaderRow scale={scale} rank={1204} name="you (kev)" you score="14,832" delta="↑22 wk" />
        <LeaderRow scale={scale} rank={1205} name="randomguy" color={TEAM_BLUE} score="14,801" />
      </div>
      <SBox w="100%" h={mobile ? 60 : 50} sw={1.3} fill={PAPER_2} stroke={INK_FAINT}>
        <div style={{ padding: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Hand size={11 * scale} color={INK_SOFT}>climb 122 ranks to crack <span style={{ color: ACCENT_2 }}>top 1000</span></Hand>
          <SBtn accent h={28}>play →</SBtn>
        </div>
      </SBox>
    </div>
  );
  return <PairLayout mobile={<Body scale={0.9} mobile />} desktop={<Body scale={1} />}
    notes="E2 — Global leaderboard. Tabbed (day/week/all/friends). ‘Climb 122 ranks’ nudge at bottom = retention loop. Requires sign-in to score globally." />;
}

// =========================================================
// LEADERBOARD 3 — End-of-daily summary
// =========================================================
function Leader3() {
  const rounds = [
    { sub: 'r/tifu', score: 92, you: "sounds like she's running things now" },
    { sub: 'r/AskReddit', score: 64, you: "the cat is a vibe" },
    { sub: 'r/facepalm', score: 78, you: "absolute legend behavior" },
    { sub: 'r/Showerthoughts', score: 41, you: "deep, but not THAT deep" },
    { sub: 'r/MaliciousCompliance', score: 87, you: "[redacted by hr]" },
    { sub: 'r/AmItheAsshole', score: 53, you: "yta, gently" },
    { sub: 'r/mildlyinfuriating', score: 71, you: "this is why we can't" },
    { sub: 'r/relationship_advice', score: 26, you: "leave him girl" },
  ];
  const total = rounds.reduce((a, r) => a + r.score, 0);
  const Body = ({ scale = 1, mobile = false }) => (
    <div style={{ padding: 12, height: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ textAlign: 'center' }}>
        <Mono size={9 * scale}>daily complete · 2026-05-07</Mono>
        <Hand size={mobile ? 18 : 22} weight={600} style={{ display: 'block', lineHeight: 1, marginTop: 2 }}>nice run.</Hand>
        <Hand size={mobile ? 60 : 84} weight={700} color={ACCENT} style={{ display: 'block', lineHeight: 0.9, letterSpacing: -2, marginTop: 4 }}>{total}</Hand>
        <Mono size={9 * scale} style={{ display: 'block', marginTop: 2 }}>total · rank 47 of 14,392 today</Mono>
      </div>
      <Squiggle w={140} h={5} style={{ alignSelf: 'center' }} />
      <Mono size={9 * scale}>round-by-round</Mono>
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 3 }}>
        {rounds.map((r, i) => {
          const c = r.score >= 80 ? BAND_GREEN : r.score >= 60 ? BAND_YELLOW : r.score >= 40 ? ACCENT : BAND_RED;
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 6px', borderLeft: `3px solid ${c}` }}>
              <Mono size={9 * scale} color={INK_SOFT} style={{ width: 18 }}>{String(i + 1).padStart(2, '0')}</Mono>
              <Mono size={9 * scale} style={{ width: mobile ? 70 : 110, color: INK_SOFT }}>{r.sub}</Mono>
              <Hand size={10 * scale} color={INK_SOFT} style={{ flex: 1, lineHeight: 1.1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>"{r.you}"</Hand>
              <Hand size={mobile ? 14 : 16} weight={700} color={c} style={{ minWidth: 28, textAlign: 'right' }}>{r.score}</Hand>
            </div>
          );
        })}
      </div>
      <SBox w="100%" h={mobile ? 70 : 60} sw={1.3} fill={PAPER_2} stroke={INK_FAINT}>
        <div style={{ padding: 8, display: 'flex', flexDirection: mobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: mobile ? 'flex-start' : 'center', gap: 6 }}>
          <Hand size={11 * scale} color={INK_SOFT}>streak: <span style={{ color: ACCENT_2 }}>4 days 🔥</span> · come back at midnight</Hand>
          <Mono size={9 * scale} color={ACCENT}>next daily in 04:12</Mono>
        </div>
      </SBox>
      <div style={{ display: 'flex', gap: 6 }}>
        <SBtn style={{ flex: 1 }}>see leaderboard</SBtn>
        <SBtn accent style={{ flex: 1 }}>play unlimited →</SBtn>
      </div>
    </div>
  );
  return <PairLayout mobile={<Body scale={0.9} mobile />} desktop={<Body scale={1} />}
    notes="E3 — End-of-daily. Big total score hero, round-by-round breakdown with color bands, streak callout, next-daily countdown. Two CTAs: see leaderboard / play unlimited (uses fresh posts so users don't burn the dailies for friends). The streak + countdown is the real retention hook." />;
}

Object.assign(window, { Multi1, Multi2, Multi3, Leader1, Leader2, Leader3 });
