/* global React, useState, useEffect, Avatar, SquiggleDeco, bandColor */

// =================================================================
// D1 — Lobby
// =================================================================
function LobbyScreen({ onStart, mobile = false }) {
  const players = [
    { n: 'streamer_dave', c: 'var(--accent)', host: true },
    { n: 'kev', c: 'var(--accent-2)', you: true },
    { n: 'maya', c: 'var(--team-purple)' },
    { n: 'logan', c: 'var(--team-green)' },
    { n: 'pip', c: 'var(--team-blue)' },
    { n: 'jordan', c: 'var(--team-purple)' },
    { n: 'sam', c: 'var(--team-blue)' },
  ];
  return (
    <div className={`lobby ${mobile ? 'lobby--mobile' : ''}`}>
      <div className="lobby-code">
        <span className="label">your room code</span>
        <span className="code">PIZZA-7</span>
        <span className="url">guesstop.app/r/PIZZA-7</span>
      </div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span className="mono">{players.length} players in lobby</span>
          <span className="chip chip--accent"><span className="dot" style={{ background: 'var(--accent)' }}></span>live</span>
        </div>
        <div className="lobby-players">
          {players.map((p, i) => (
            <span key={i} className={`player-chip ${p.you ? 'you' : ''} ${p.host ? 'host' : ''}`}>
              <Avatar name={p.n} color={p.c} you={p.you} size={22} />
              <span>{p.n}</span>
            </span>
          ))}
          <button className="btn btn--ghost btn--sm">+ invite</button>
        </div>
      </div>

      <div className="match-settings">
        <div className="setting"><span className="k">rounds</span><span className="v">8</span></div>
        <div className="setting"><span className="k">timer</span><span className="v">30s</span></div>
        <div className="setting"><span className="k">subs</span><span className="v">all</span></div>
        <div className="setting"><span className="k">scoring</span><span className="v">match-any</span></div>
      </div>

      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: mobile ? 'column' : 'row', gap: 10 }}>
        <button className="btn btn--ghost btn--lg">change settings</button>
        <button className="btn btn--primary btn--lg" style={{ flex: 1 }} onClick={onStart}>start match · 5 ready →</button>
      </div>
    </div>
  );
}

// =================================================================
// D2 — Mid-match scoreboard
// =================================================================
function ScoreboardScreen({ onNext, mobile = false }) {
  const players = [
    { rank: 1, n: 'streamer_dave', c: 'var(--accent)', score: 412, this: 92 },
    { rank: 2, n: 'kev', c: 'var(--accent-2)', you: true, score: 387, this: 87 },
    { rank: 3, n: 'maya', c: 'var(--team-purple)', score: 380, this: 79 },
    { rank: 4, n: 'logan', c: 'var(--team-green)', score: 351, this: 64 },
    { rank: 5, n: 'pip', c: 'var(--team-blue)', score: 322, this: 41 },
  ];
  return (
    <div className={`leader ${mobile ? 'leader--mobile' : ''}`}>
      <div className="round-meta">
        <span className="chip">PIZZA-7</span>
        <span className="mono">round 3 / 8 just revealed</span>
        <span className="timer">00:08</span>
      </div>

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--hairline)', borderRadius: 'var(--r-lg)', padding: '14px 18px' }}>
        <div className="mono">top comment was</div>
        <div className="hero-card-title" style={{ fontSize: 18, marginTop: 4 }}>"sounds like she's the boss now."</div>
      </div>

      <div className="scoreboard">
        {players.map((p) => (
          <div key={p.rank} className={`score-row ${p.you ? 'you' : ''}`}>
            <span className="rank">{String(p.rank).padStart(2, '0')}</span>
            <Avatar name={p.n} color={p.c} you={p.you} size={26} />
            <span className="name">{p.n}{p.you ? ' (you)' : ''}</span>
            <span className="delta">+{p.this}</span>
            <span className="total" style={{ color: p.you ? 'var(--accent-2)' : 'var(--ink)' }}>{p.score}</span>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn btn--primary btn--lg" onClick={onNext}>i'm ready · next round →</button>
      </div>
    </div>
  );
}

// =================================================================
// D3 — End of match
// =================================================================
function MatchEndScreen({ onNext, mobile = false }) {
  const final = [
    { rank: 1, n: 'streamer_dave', c: 'var(--accent)', score: 712, w: '🥇' },
    { rank: 2, n: 'maya', c: 'var(--team-purple)', score: 698, w: '🥈' },
    { rank: 3, n: 'kev', c: 'var(--accent-2)', you: true, score: 654, w: '🥉' },
    { rank: 4, n: 'logan', c: 'var(--team-green)', score: 612 },
    { rank: 5, n: 'pip', c: 'var(--team-blue)', score: 543 },
  ];
  return (
    <div className={`leader ${mobile ? 'leader--mobile' : ''}`}>
      <div className="summary-hero" style={{ paddingTop: 4, marginBottom: 12 }}>
        <span className="label">match complete · 8 rounds</span>
        <span className="sub" style={{ color: 'var(--ink)', fontStyle: 'normal', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: mobile ? 22 : 28, lineHeight: 1.2 }}>
          winner: <span style={{ color: 'var(--accent)' }}>streamer_dave</span>
        </span>
      </div>

      <div className="leader-rows">
        {final.map((p) => (
          <div key={p.rank} className={`leader-row ${p.you ? 'you' : ''}`}>
            <span className="rank">#{p.rank}</span>
            <Avatar name={p.n} color={p.c} you={p.you} size={26} />
            <span className="name">{p.w ? `${p.w} ` : ''}{p.n}{p.you ? ' (you)' : ''}</span>
            <span className="score" style={{ color: p.you ? 'var(--accent-2)' : 'var(--ink)' }}>{p.score}</span>
          </div>
        ))}
      </div>

      <div className="streak">
        <div className="left">
          <span className="label">your highlights</span>
          <span className="value" style={{ color: 'var(--ink)', fontSize: 14, fontFamily: 'var(--font-body)' }}>best: r/tifu · 92 (round 5) · clutched r/Showerthoughts +8 over avg</span>
        </div>
      </div>

      <div style={{ marginTop: 'auto', display: 'flex', gap: 10, flexDirection: mobile ? 'column' : 'row' }}>
        <button className="btn btn--ghost btn--lg" style={{ flex: 1 }}>save scores (sign up)</button>
        <button className="btn btn--lg" style={{ flex: 1 }}>new room</button>
        <button className="btn btn--primary btn--lg" style={{ flex: 1 }} onClick={onNext}>rematch →</button>
      </div>
    </div>
  );
}

// =================================================================
// E1 — Daily leaderboard
// =================================================================
function DailyLeaderboardScreen({ onNext, mobile = false }) {
  const rows = [
    { rank: 1, n: 'comment_king', c: 'var(--accent)', score: 742 },
    { rank: 2, n: 'snorlax_42', c: 'var(--team-purple)', score: 718 },
    { rank: 3, n: 'lurkybird', c: 'var(--team-green)', score: 705 },
    { rank: 4, n: 'caffeineghost', c: 'var(--team-blue)', score: 691 },
    { rank: 5, n: 'workfromhomer', c: 'var(--team-purple)', score: 672 },
  ];
  return (
    <div className={`leader ${mobile ? 'leader--mobile' : ''}`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h1 className="serif" style={{ margin: 0, fontWeight: 600, fontSize: mobile ? 22 : 30, letterSpacing: '-0.02em' }}>today's board</h1>
        <span className="mono">resets in 04:12</span>
      </div>
      <div className="mono">2026-05-07 · 14,392 players</div>
      <div className="leader-tabs">
        <button className="leader-tab active">today</button>
        <button className="leader-tab">friends</button>
      </div>
      <div className="leader-rows">
        {rows.map((r) => (
          <div key={r.rank} className="leader-row">
            <span className="rank">#{r.rank}</span>
            <Avatar name={r.n} color={r.c} size={26} />
            <span className="name">{r.n}</span>
            <span className="score">{r.score}</span>
          </div>
        ))}
        <div className="leader-divider"></div>
        <div className="leader-row you">
          <span className="rank" style={{ color: 'var(--accent-2)' }}>#47</span>
          <Avatar name="kev" color="var(--accent-2)" you size={26} />
          <span className="name">kev (you) <span className="mono" style={{ color: 'var(--accent)', marginLeft: 6 }}>↑3</span></span>
          <span className="score" style={{ color: 'var(--accent-2)' }}>412</span>
        </div>
        <div className="leader-row">
          <span className="rank">#48</span>
          <Avatar name="anon_47" color="var(--team-blue)" size={26} />
          <span className="name">anon_47</span>
          <span className="score">409</span>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'auto' }}>
        <button className="btn btn--ghost">friends only</button>
        <button className="btn btn--primary" onClick={onNext}>finish daily →</button>
      </div>
    </div>
  );
}

// =================================================================
// E3 — End of daily summary
// =================================================================
function DailySummaryScreen({ onLeaderboard, onUnlimited, mobile = false }) {
  const rounds = [
    { sub: 'r/tifu', score: 92, you: "sounds like she's running things now" },
    { sub: 'r/AskReddit', score: 64, you: "the cat is a vibe" },
    { sub: 'r/facepalm', score: 78, you: "absolute legend behavior" },
    { sub: 'r/Showerthoughts', score: 41, you: "deep but not THAT deep" },
    { sub: 'r/MaliciousCompliance', score: 87, you: "[redacted by hr]" },
    { sub: 'r/AmItheAsshole', score: 53, you: "yta, gently" },
    { sub: 'r/mildlyinfuriating', score: 71, you: "this is why we can't" },
    { sub: 'r/relationship_advice', score: 26, you: "leave him girl" },
  ];
  const total = rounds.reduce((a, r) => a + r.score, 0);
  return (
    <div className={`leader ${mobile ? 'leader--mobile' : ''}`}>
      <div className="summary-hero">
        <span className="label">daily complete · 2026-05-07</span>
        <span className="sub">nice run.</span>
        <span className="num">{total}</span>
        <span className="mono">total · rank 47 of 14,392 today</span>
        <SquiggleDeco width={140} stroke={2} />
      </div>

      <span className="mono" style={{ marginTop: 4 }}>round-by-round</span>
      <div className="summary-rounds">
        {rounds.map((r, i) => (
          <div key={i} className="summary-round" style={{ borderLeftColor: bandColor(r.score) }}>
            <span className="n">{String(i + 1).padStart(2, '0')}</span>
            <span className="sub-name">{r.sub}</span>
            <span className="quote">"{r.you}"</span>
            <span className="pts" style={{ color: bandColor(r.score) }}>{r.score}</span>
          </div>
        ))}
      </div>

      <div className="streak">
        <div className="left">
          <span className="label">streak</span>
          <span className="value">4 days 🔥</span>
        </div>
        <div className="countdown">next daily in <strong style={{ color: 'var(--accent)' }}>04:12</strong></div>
      </div>

      <div style={{ marginTop: 'auto', display: 'flex', gap: 10, flexDirection: mobile ? 'column' : 'row' }}>
        <button className="btn btn--lg" style={{ flex: 1 }} onClick={onLeaderboard}>see leaderboard</button>
        <button className="btn btn--primary btn--lg" style={{ flex: 1 }} onClick={onUnlimited}>play unlimited →</button>
      </div>
    </div>
  );
}

Object.assign(window, { LobbyScreen, ScoreboardScreen, MatchEndScreen, DailyLeaderboardScreen, DailySummaryScreen });
