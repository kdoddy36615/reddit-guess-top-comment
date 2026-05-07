/* global React, useState, useEffect, SAMPLE_POSTS, scoreGuess, Avatar, SquiggleDeco, bandColor, AppBar */

// =================================================================
// A1 — Welcome screen
// =================================================================
function WelcomeScreen({ onStart, onJoin, mobile = false }) {
  const proof = [
    { sub: 'r/tifu', text: "sounds like she's the boss now.", up: '14.2k', win: true },
    { sub: 'r/AskReddit', text: "the cat is the only one with healthy boundaries", up: '6.8k' },
    { sub: 'r/facepalm', text: "the customer is always right (handed)", up: '4.9k' },
  ];
  return (
    <div className={`welcome ${mobile ? 'welcome--mobile' : ''}`}>
      <div className="brand">
        <span className="brand-mark"></span>
        <span>guesstop</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: mobile ? 4 : 16 }}>
        <span className="hero-eyebrow">a reddit guessing game</span>
        <h1 className="hero-title">guess what reddit said <em>next.</em></h1>
        <p className="hero-sub">we show you a post. you guess the top comment. score is how close you got. {mobile ? '' : 'play solo, daily, or in a room with friends.'}</p>
      </div>

      <div className="hero-card">
        <div className="hero-card-head">
          <span className="hero-card-sub">r/tifu · 24.1k ↑</span>
          <span className="chip">round 1 of 8</span>
        </div>
        <div className="hero-card-title">TIFU by texting my boss a photo of my cat at 2am</div>
        <div className="hero-card-comment">your guess goes here…</div>
      </div>

      <div className="cta-row">
        <button className="btn btn--primary btn--lg" onClick={onStart}>play solo →</button>
        <button className="btn btn--lg" onClick={() => onJoin('daily')}>today's daily</button>
        <button className="btn btn--ghost btn--lg" onClick={() => onJoin('room')}>play with friends</button>
      </div>

      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="aux-row">
          <span className="daily-pill"><span className="dot"></span>daily resets in <strong style={{ color: 'var(--accent-2)' }}>04:12</strong></span>
          <span>· <strong>14,392</strong> played today</span>
          <span>· no signup required</span>
        </div>
        {!mobile && (
          <div className="proof-strip">
            {proof.map((p, i) => (
              <div key={i} className={`proof-card ${p.win ? 'win' : ''}`}>
                <span className="meta">{p.sub} · {p.up} ↑ {p.win ? '· top' : ''}</span>
                "{p.text}"
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// =================================================================
// B2 — Round screen (image optional)
// =================================================================
function RoundScreen({ post, roundNum = 1, totalRounds = 8, onSubmit, mobile = false }) {
  const [val, setVal] = useState('');
  return (
    <div className={`round ${mobile ? 'round--mobile' : ''}`}>
      <div className="round-meta">
        <div className="round-progress">
          {Array.from({ length: totalRounds }).map((_, i) => (
            <span key={i} className={`pip ${i < roundNum - 1 ? 'done' : i === roundNum - 1 ? 'now' : ''}`}></span>
          ))}
          <span className="mono" style={{ marginLeft: 8 }}>round {roundNum} / {totalRounds}</span>
        </div>
        <button className="btn btn--sm btn--ghost">skip ›</button>
      </div>

      <div className="post">
        <div className="post-head">
          <span className="sub">{post.sub}</span>
          <span className="sep">·</span>
          <span>posted {post.age}</span>
          <span className="sep">·</span>
          <span>{post.up} ↑</span>
        </div>
        <h2 className="post-title">{post.title}</h2>
        {post.body && <p className="post-body">{post.body}</p>}
        {post.image && <div className="post-image">post image · attached</div>}
      </div>

      <div className="guess-block">
        <div className="guess-prompt">what do you think the top comment said?</div>
        <textarea
          className="guess-input"
          placeholder="type your best guess…"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) onSubmit(val); }}
          rows={3}
        />
        <div className="guess-row">
          <span className="guess-hint"><span className="kbd">⌘</span> + <span className="kbd">↵</span> to submit</span>
          <button className="btn btn--primary btn--lg" onClick={() => onSubmit(val)} disabled={!val.trim()}>guess →</button>
        </div>
      </div>
    </div>
  );
}

// =================================================================
// C5 — Reveal: detached your-answer + thread
// =================================================================
function RevealScreen({ post, guess, score, onNext, mobile = false }) {
  return (
    <div className={`reveal ${mobile ? 'reveal--mobile' : ''}`}>
      <div className="your-answer">
        <div className="your-answer-text">
          <div className="your-answer-label">your guess</div>
          <div className="your-answer-quote">"{guess || '—'}"</div>
        </div>
        <div className="your-answer-score">
          <span className="num" style={{ color: bandColor(score) }}>{score}</span>
          <span className="meta">matched #1</span>
        </div>
      </div>

      <div className="thread-head">
        <span className="label">{post.sub} · the actual thread</span>
        <span className="post-title-mini">{post.title.slice(0, mobile ? 36 : 70)}{post.title.length > (mobile ? 36 : 70) ? '…' : ''}</span>
      </div>

      <div className="thread">
        {post.top3.map((c, i) => (
          <div key={i} className={`thread-item ${i === 0 ? 'top' : ''}`} style={{ animationDelay: `${i * 80}ms`, animation: 'slideUp .35s var(--ease-out) both' }}>
            <div className="thread-item-meta">
              <span className="rank">#{i + 1}</span>
              <span>u/{c.user}</span>
              <span className="up">{c.up}</span>
              {i === 0 && <span className="chip chip--accent" style={{ padding: '1px 8px', fontSize: 10 }}>TOP</span>}
            </div>
            <div className="thread-item-text">"{c.text}"</div>
            <div className="thread-reply">
              <div className="thread-reply-meta">u/{c.reply.user} · {c.reply.up} ↑</div>
              <div className="thread-reply-text">{c.reply.text}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="guess-row" style={{ marginTop: 8 }}>
        <button className="btn btn--ghost btn--sm">flag content</button>
        <button className="btn btn--primary btn--lg" onClick={onNext}>next round →</button>
      </div>
    </div>
  );
}

Object.assign(window, { WelcomeScreen, RoundScreen, RevealScreen });
