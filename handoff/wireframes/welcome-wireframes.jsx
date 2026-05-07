/* global React, SBox, SOval, ImgPlaceholder, Squiggle, Scribble, Arrow, MobileFrame, DesktopFrame, PairLayout, SBtn, Hand, Mono, Annot, AvatarBubble, RoomCode, ScoreDot, LeaderRow, INK, INK_SOFT, INK_FAINT, PAPER, PAPER_2, PAPER_3, ACCENT, ACCENT_SOFT, ACCENT_2, ACCENT_2_SOFT, TEAM_BLUE, TEAM_PURPLE, TEAM_GREEN */

// =========================================================
// WELCOME 1 — "Sober Wordle-clone" (still the safest ship-it path, dark)
// =========================================================
function Welcome1() {
  const Body = ({ scale = 1 }) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 16, gap: 14 * scale, textAlign: 'center' }}>
      <Mono size={9 * scale}>r/AskReddit · r/tifu · r/Showerthoughts</Mono>
      <Hand size={28 * scale} weight={600} style={{ lineHeight: 1.05, letterSpacing: -0.5, paddingBottom: 4 }}>guess the<br />top comment.</Hand>
      <Squiggle w={120 * scale} h={6} style={{ marginTop: 4 }} />
      <Hand size={13 * scale} color={INK_SOFT} style={{ maxWidth: 280 * scale }}>
        Read a Reddit title. Type what you think the top comment said. Get scored 0–100.
      </Hand>
      <SBtn accent style={{ marginTop: 6 }}>play solo →</SBtn>
      <SBtn secondary style={{ marginTop: -2 }}>or join a room ↓</SBtn>
      <div style={{ display: 'flex', gap: 10, marginTop: 6, fontFamily: 'Patrick Hand', fontSize: 11 * scale, color: INK_FAINT }}>
        <span style={{ textDecoration: 'underline' }}>daily</span>
        <span style={{ textDecoration: 'underline' }}>archive</span>
        <span style={{ textDecoration: 'underline' }}>sign in</span>
      </div>
    </div>
  );
  return (
    <PairLayout
      mobile={<Body scale={0.85} />}
      desktop={<Body scale={1.1} />}
      notes="A1 — Sober & centered (dark). Two CTAs surface the multiplayer path early. Safest ship-it, but ‘join a room’ is now a first-class action."
    />
  );
}

// =========================================================
// WELCOME 2 — "Image-post hero" (round w/ attached image, full-bleed)
// =========================================================
function Welcome2() {
  const Body = ({ scale = 1, mobile = false }) => (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
        <ImgPlaceholder w={mobile ? 252 : 720} h={mobile ? 220 : 280} label="r/facepalm post image" style={{ position: 'absolute', inset: 0 }} />
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, transparent 30%, ${PAPER} 100%)` }} />
        <div style={{ position: 'absolute', top: 10, left: 12, right: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Mono size={9 * scale}>r/facepalm · 4.8k ↑</Mono>
          <Mono size={9 * scale}>round 219</Mono>
        </div>
        <div style={{ position: 'absolute', bottom: 10, left: 12, right: 12 }}>
          <Hand size={mobile ? 17 : 22} weight={600} style={{ lineHeight: 1.1, display: 'block' }}>
            "I asked the cashier if they sold left-handed scissors and she actually went to check"
          </Hand>
        </div>
      </div>
      <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Hand size={13 * scale} color={INK_SOFT} style={{ textAlign: 'center' }}>
          there's an <span style={{ color: ACCENT }}>image</span>. there's a <span style={{ color: ACCENT }}>title</span>.<br />
          what did the top comment say?
        </Hand>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
          <SBtn accent>guess this one →</SBtn>
          <SBtn>↻ pick another</SBtn>
        </div>
      </div>
    </div>
  );
  return (
    <PairLayout
      mobile={<Body scale={0.85} mobile />}
      desktop={<Body scale={1} />}
      notes="A2 — Image-post hero. Welcome IS a real round with the post image as the bg. Proves out the image-attachment story up front (PRD: r/facepalm, r/funny eligible once images render). Best for browsing-from-search / ‘shows-don't-tell’."
    />
  );
}

// =========================================================
// WELCOME 3 — "Create-or-join room" (multiplayer-first)
// =========================================================
function Welcome3() {
  const Body = ({ scale = 1, mobile = false }) => (
    <div style={{ padding: 14, height: '100%', display: 'flex', flexDirection: 'column', gap: 10, justifyContent: 'center' }}>
      <Hand size={mobile ? 22 : 28} weight={600} style={{ lineHeight: 1, textAlign: 'center', display: 'block' }}>
        bring your friends.<br />guess together.
      </Hand>
      <Squiggle w={120} h={6} style={{ alignSelf: 'center' }} />
      <div style={{ display: 'flex', flexDirection: mobile ? 'column' : 'row', gap: 10, marginTop: 6 }}>
        <SBox w={mobile ? 250 : 340} h={140} sw={1.4} fill={PAPER_2}>
          <div style={{ padding: 12, height: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Mono size={9 * scale} color={ACCENT}>HOST A ROOM</Mono>
            <Hand size={13 * scale} weight={600}>start a match for your stream or friends</Hand>
            <Hand size={11 * scale} color={INK_SOFT}>up to 50 players · 5–10 rounds · 30s timer</Hand>
            <div style={{ flex: 1 }} />
            <SBtn accent>create room →</SBtn>
          </div>
        </SBox>
        <SBox w={mobile ? 250 : 320} h={140} sw={1.4} fill={PAPER_2} dashed>
          <div style={{ padding: 12, height: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Mono size={9 * scale} color={ACCENT_2}>JOIN A ROOM</Mono>
            <RoomCode code="_____" size="md" />
            <Hand size={11 * scale} color={INK_SOFT}>got a code? type it here</Hand>
            <div style={{ flex: 1 }} />
            <SBtn secondary>join →</SBtn>
          </div>
        </SBox>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 6 }}>
        <Mono size={9 * scale}>or play solo</Mono>
        <Mono size={9 * scale}>·</Mono>
        <Mono size={9 * scale} color={ACCENT}>today's daily →</Mono>
      </div>
    </div>
  );
  return (
    <PairLayout
      mobile={<Body scale={0.9} mobile />}
      desktop={<Body scale={1} />}
      notes="A3 — Multiplayer-first. Two equal CTAs (host / join), solo demoted to a small link. Pitches the Phase-2 vision on day one — pair with the room-lobby flow."
    />
  );
}

// =========================================================
// WELCOME 4 — "Reddit thread / pinned mod post" (kept; updated darker)
// =========================================================
function Welcome4() {
  const Comment = ({ scale = 1, name, text, score, faded, accent, color = TEAM_BLUE }) => (
    <div style={{ display: 'flex', gap: 8, padding: '6px 0' }}>
      <AvatarBubble name={name} color={color} size={20} />
      <div style={{ flex: 1, opacity: faded ? 0.55 : 1 }}>
        <Mono size={9 * scale}>u/{name} · {score}↑</Mono>
        <Hand size={12 * scale} style={{ display: 'block', marginTop: 2, lineHeight: 1.2 }}>{text}</Hand>
      </div>
    </div>
  );
  const Body = ({ scale = 1, mobile = false }) => (
    <div style={{ height: '100%', padding: 12, display: 'flex', flexDirection: 'column' }}>
      <Mono size={9 * scale}>r/guesstopcomment · pinned</Mono>
      <div style={{ marginTop: 6, padding: '10px 12px', border: `1.6px solid ${ACCENT}`, borderRadius: 8, background: ACCENT_SOFT }}>
        <Mono size={9 * scale} color={ACCENT}>📌 PINNED · MOD POST</Mono>
        <Hand size={mobile ? 16 : 19} weight={600} style={{ display: 'block', marginTop: 4, lineHeight: 1.15 }}>
          welcome — you're the comment now.
        </Hand>
        <Hand size={12 * scale} color={INK_SOFT} style={{ display: 'block', marginTop: 4 }}>
          we'll show you a post (and sometimes an image). you write the top comment. we score how close you got.
        </Hand>
        <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
          <SBtn accent h={28}>play solo</SBtn>
          <SBtn secondary h={28}>host a room</SBtn>
          <SBtn h={28} dashed>daily</SBtn>
        </div>
      </div>
      <div style={{ marginTop: 10 }}>
        <Mono size={9 * scale}>recent rounds</Mono>
        <Comment scale={scale} faded color={TEAM_BLUE} name="random_guesser" text="someone scored 94 on the airport one 5min ago" score="3" />
        <Comment scale={scale} faded color={TEAM_PURPLE} name="anon_47" text="this game is unhealthy. 12 in a row." score="8" />
        <Comment scale={scale} faded color={TEAM_GREEN} name="kev" text="finally got bullseye on r/Showerthoughts" score="2" />
      </div>
    </div>
  );
  return (
    <PairLayout
      mobile={<Body scale={0.9} mobile />}
      desktop={<Body scale={1} />}
      notes="A4 — Reddit-thread metaphor (dark). Welcome is a pinned mod post with three CTAs (solo / room / daily). Below: faded recent rounds as comment chains for content density + retention hook."
    />
  );
}

// =========================================================
// WELCOME 5 — "Daily + leaderboard preview"
// Replaces the 3-panel explainer; surfaces retention loop on the front door.
// =========================================================
function Welcome5() {
  const Body = ({ scale = 1, mobile = false }) => (
    <div style={{ padding: 14, height: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Hand size={mobile ? 22 : 26} weight={600} style={{ lineHeight: 1 }}>today's daily</Hand>
        <Mono size={9 * scale}>resets in 04:12:08</Mono>
      </div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <ScoreDot key={i} filled={i <= 3} color={ACCENT} />)}
        <Mono size={9 * scale} style={{ marginLeft: 6 }}>3 / 8 played · score 247</Mono>
      </div>
      <SBtn accent style={{ alignSelf: mobile ? 'stretch' : 'flex-start' }}>continue daily →</SBtn>
      <div style={{ display: 'flex', flexDirection: mobile ? 'column' : 'row', gap: 10, marginTop: 4, flex: 1, minHeight: 0 }}>
        <SBox w={mobile ? 250 : 330} h="auto" sw={1.3} fill={PAPER_2} style={{ flex: 1 }}>
          <div style={{ padding: 10 }}>
            <Mono size={9 * scale} color={ACCENT_2}>TODAY'S LEADERBOARD</Mono>
            <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <LeaderRow scale={scale} rank={1} name="comment_king" color={TEAM_PURPLE} score={742} />
              <LeaderRow scale={scale} rank={2} name="snorlax_42" color={TEAM_BLUE} score={701} />
              <LeaderRow scale={scale} rank={3} name="lurkybird" color={TEAM_GREEN} score={689} />
              <LeaderRow scale={scale} rank={47} name="you" you score={247} delta="+3" />
            </div>
          </div>
        </SBox>
        <SBox w={mobile ? 250 : 320} h="auto" sw={1.3} fill={PAPER_2} style={{ flex: 1 }}>
          <div style={{ padding: 10 }}>
            <Mono size={9 * scale} color={ACCENT}>YOUR STREAK</Mono>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
              <Hand size={mobile ? 28 : 36} weight={700} color={ACCENT}>12</Hand>
              <Hand size={11 * scale} color={INK_SOFT}>days · best 23</Hand>
            </div>
            <div style={{ display: 'flex', gap: 3, marginTop: 6 }}>
              {Array.from({ length: 14 }).map((_, i) => (
                <div key={i} style={{ width: 12, height: 12, borderRadius: 2, background: i < 12 ? ACCENT : INK_FAINT, opacity: i < 12 ? 0.85 : 0.3 }} />
              ))}
            </div>
            <Hand size={11 * scale} color={INK_SOFT} style={{ display: 'block', marginTop: 8 }}>play 1 more → keep streak</Hand>
          </div>
        </SBox>
      </div>
    </div>
  );
  return (
    <PairLayout
      mobile={<Body scale={0.85} mobile />}
      desktop={<Body scale={1} />}
      notes="A5 — Retention front-door. Daily progress dots + today's leaderboard + streak panel. Aimed at returning users: ‘there's a reason to come back tomorrow.’ For first-timers, a small CTA below leads to the explainer."
    />
  );
}

// =========================================================
// WELCOME 6 — "Profile / signed-in dashboard" (global leaderboard hook)
// =========================================================
function Welcome6() {
  const Body = ({ scale = 1, mobile = false }) => (
    <div style={{ padding: 14, height: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <AvatarBubble name="Kev" color={ACCENT_2} you size={42} />
        <div style={{ flex: 1 }}>
          <Hand size={mobile ? 17 : 20} weight={600} style={{ display: 'block' }}>welcome back, kev.</Hand>
          <Mono size={9 * scale}>432 rounds · avg 71 · rank #1,204 global</Mono>
        </div>
        <SBtn accent h={30}>play →</SBtn>
      </div>
      <Squiggle w={120} h={5} />
      <div style={{ display: 'flex', flexDirection: mobile ? 'column' : 'row', gap: 10, flex: 1, minHeight: 0 }}>
        <SBox w={mobile ? 250 : 330} h="auto" sw={1.3} fill={PAPER_2} style={{ flex: 1 }}>
          <div style={{ padding: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Mono size={9 * scale} color={ACCENT_2}>GLOBAL · ALL-TIME</Mono>
              <Mono size={8 * scale}>day · week · all</Mono>
            </div>
            <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <LeaderRow scale={scale} rank={1} name="u/HavingaBadDay" color={ACCENT} score="98.4k" />
              <LeaderRow scale={scale} rank={2} name="streamer_dave" color={TEAM_PURPLE} score="91.2k" />
              <LeaderRow scale={scale} rank={3} name="commentcat" color={TEAM_GREEN} score="87.0k" />
              <div style={{ height: 4 }} />
              <LeaderRow scale={scale} rank={1204} name="you (kev)" you score="14.8k" delta="↑22" />
            </div>
          </div>
        </SBox>
        <SBox w={mobile ? 250 : 320} h="auto" sw={1.3} fill={PAPER_2} style={{ flex: 1 }}>
          <div style={{ padding: 10 }}>
            <Mono size={9 * scale} color={ACCENT}>RECENT ROOMS</Mono>
            <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Hand size={11 * scale}>w/ streamer_dave's chat</Hand>
                <Mono size={9 * scale} color={ACCENT_2}>2nd / 18</Mono>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Hand size={11 * scale}>w/ friends-fri-night</Hand>
                <Mono size={9 * scale} color={ACCENT_2}>1st / 6 🥇</Mono>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Hand size={11 * scale}>w/ random pub</Hand>
                <Mono size={9 * scale} color={INK_SOFT}>5th / 12</Mono>
              </div>
            </div>
            <SBtn dashed h={28} style={{ marginTop: 10 }}>+ host a new room</SBtn>
          </div>
        </SBox>
      </div>
    </div>
  );
  return (
    <PairLayout
      mobile={<Body scale={0.85} mobile />}
      desktop={<Body scale={1} />}
      notes="A6 — Signed-in dashboard. Identity moment up top, global leaderboard left, recent rooms right. Drives both retention (rank) and replayability (re-host favorite room)."
    />
  );
}

Object.assign(window, { Welcome1, Welcome2, Welcome3, Welcome4, Welcome5, Welcome6 });
