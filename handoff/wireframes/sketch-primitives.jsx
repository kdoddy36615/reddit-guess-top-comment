/* global React */
// Sketchy low-fi primitives — DARK THEME, party-game energy.
// Hand-drawn feel via subtle rotations + dashed/wavy borders.

const INK = '#f1ece2';        // off-white "ink" for text on dark
const INK_SOFT = '#a39c8e';
const INK_FAINT = '#5e574c';
const PAPER = '#171513';      // near-black with warm tone (midnight paper)
const PAPER_2 = '#1f1c18';    // slightly raised surface
const PAPER_3 = '#2a2620';    // card/input surface
const ACCENT = '#e8814a';     // warmer, softer orange (reddit-leaning, not harsh)
const ACCENT_SOFT = '#3a261a';
const ACCENT_2 = '#ffd166';   // secondary (leaderboard / "you" highlights)
const ACCENT_2_SOFT = '#3a3217';
const TEAM_BLUE = '#7cc6ff';  // multiplayer player accents
const TEAM_PURPLE = '#c39bff';
const TEAM_GREEN = '#9be38a';

const BAND_GREEN = '#9be38a';
const BAND_BLUE = '#7cc6ff';
const BAND_YELLOW = '#ffd166';
const BAND_RED = '#ff7363';

// A hand-drawn-ish box. Uses a slightly squiggly SVG path as the border.
function SBox({ children, style, w, h, rot = 0, fill = 'transparent', stroke = INK, sw = 1.4, dashed = false, ...rest }) {
  const id = React.useId().replace(/:/g, '');
  const jitter = (n) => n + (Math.sin(n * 9.7 + id.length) * 0.6);
  const W = w, H = h;
  const path = `
    M ${jitter(2)} ${jitter(2)}
    L ${W - jitter(2)} ${jitter(3)}
    L ${W - jitter(3)} ${H - jitter(2)}
    L ${jitter(2)} ${H - jitter(3)}
    Z
  `;
  return (
    <div style={{ position: 'relative', width: w, height: h, transform: `rotate(${rot}deg)`, ...style }} {...rest}>
      <svg width={w} height={h} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <path d={path} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" strokeLinecap="round" strokeDasharray={dashed ? '5 4' : 'none'} />
      </svg>
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>{children}</div>
    </div>
  );
}

function SOval({ w, h, fill = 'transparent', stroke = INK, sw = 1.4, style, children, rot = 0 }) {
  return (
    <div style={{ position: 'relative', width: w, height: h, transform: `rotate(${rot}deg)`, ...style }}>
      <svg width={w} height={h} style={{ position: 'absolute', inset: 0 }}>
        <ellipse cx={w / 2} cy={h / 2} rx={w / 2 - 2} ry={h / 2 - 2} fill={fill} stroke={stroke} strokeWidth={sw} />
      </svg>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>{children}</div>
    </div>
  );
}

function Squiggle({ w = 80, h = 8, color = ACCENT, style }) {
  const seg = 8;
  const n = Math.floor(w / seg);
  return (
    <svg width={w} height={h} style={{ display: 'block', ...style }}>
      <path d={`M 0 ${h / 2} ` + Array.from({ length: n }, (_, i) => {
        const x = ((i + 1) * w) / n;
        const y = i % 2 === 0 ? 1 : h - 1;
        return `Q ${x - w / (n * 2)} ${i % 2 === 0 ? h - 1 : 1}, ${x} ${y}`;
      }).join(' ')} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function Scribble({ w, h, color = INK_FAINT, density = 6, style }) {
  const lines = [];
  const step = h / density;
  for (let i = 0; i < density; i++) {
    const y = i * step + step / 2 + (Math.sin(i) * 1.5);
    lines.push(<line key={i} x1={4} y1={y} x2={w - 4} y2={y + (i % 2 ? 1.5 : -1.5)} stroke={color} strokeWidth="0.8" strokeLinecap="round" />);
  }
  return <svg width={w} height={h} style={{ display: 'block', ...style }}>{lines}</svg>;
}

// Image placeholder — for Reddit posts that include an image attachment
function ImgPlaceholder({ w, h, label = 'post image', style, rot = 0 }) {
  const id = `stripe-${w}-${h}-${Math.round(Math.random() * 1e6)}`;
  return (
    <div style={{ position: 'relative', width: w, height: h, transform: `rotate(${rot}deg)`, ...style }}>
      <svg width={w} height={h} style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <pattern id={id} patternUnits="userSpaceOnUse" width="10" height="10" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="10" stroke={INK_SOFT} strokeWidth="1" opacity="0.25" />
          </pattern>
        </defs>
        <rect x="1" y="1" width={w - 2} height={h - 2} fill={`url(#${id})`} stroke={INK_SOFT} strokeWidth="1.2" strokeDasharray="4 3" opacity="0.7" />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 2, fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: INK_SOFT, letterSpacing: 0.5 }}>
        <span style={{ opacity: 0.6 }}>◇</span>
        <span>{label}</span>
      </div>
    </div>
  );
}

function Arrow({ w = 40, h = 18, color = INK, dir = 'right', style, sw = 1.4 }) {
  const path = dir === 'right'
    ? `M 2 ${h / 2} Q ${w / 2} ${h / 2 - 2}, ${w - 6} ${h / 2}`
    : `M ${w - 2} ${h / 2} Q ${w / 2} ${h / 2 - 2}, 6 ${h / 2}`;
  const head = dir === 'right'
    ? `M ${w - 6} ${h / 2} L ${w - 12} ${h / 2 - 5} M ${w - 6} ${h / 2} L ${w - 12} ${h / 2 + 5}`
    : `M 6 ${h / 2} L 12 ${h / 2 - 5} M 6 ${h / 2} L 12 ${h / 2 + 5}`;
  return (
    <svg width={w} height={h} style={{ display: 'inline-block', ...style }}>
      <path d={path} stroke={color} strokeWidth={sw} fill="none" strokeLinecap="round" />
      <path d={head} stroke={color} strokeWidth={sw} fill="none" strokeLinecap="round" />
    </svg>
  );
}

function FrameLabel({ children }) {
  return (
    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: 1.5, color: INK_FAINT, textTransform: 'uppercase', marginBottom: 6 }}>
      {children}
    </div>
  );
}

function Annot({ children, style, color = ACCENT }) {
  return (
    <div style={{
      fontFamily: 'Architects Daughter, cursive',
      fontSize: 11,
      color,
      transform: 'rotate(-2deg)',
      lineHeight: 1.2,
      ...style,
    }}>
      {children}
    </div>
  );
}

function MobileFrame({ children, w = 280, h = 520, style }) {
  return (
    <div style={{ position: 'relative', width: w, height: h, ...style }}>
      <svg width={w} height={h} style={{ position: 'absolute', inset: 0 }}>
        <rect x="2" y="2" width={w - 4} height={h - 4} rx="22" ry="22" fill={PAPER} stroke={INK_SOFT} strokeWidth="1.4" />
        <rect x={w / 2 - 28} y="10" width="56" height="6" rx="3" fill={INK_FAINT} opacity="0.8" />
      </svg>
      <div style={{ position: 'absolute', inset: '26px 14px 14px 14px', overflow: 'hidden', borderRadius: 18 }}>{children}</div>
    </div>
  );
}

function DesktopFrame({ children, w = 720, h = 460, style }) {
  return (
    <div style={{ position: 'relative', width: w, height: h, ...style }}>
      <svg width={w} height={h} style={{ position: 'absolute', inset: 0 }}>
        <rect x="2" y="2" width={w - 4} height={h - 4} rx="8" ry="8" fill={PAPER} stroke={INK_SOFT} strokeWidth="1.4" />
        <line x1="2" y1="28" x2={w - 2} y2="28" stroke={INK_FAINT} strokeWidth="1" />
        <circle cx="14" cy="15" r="3.5" fill="none" stroke={INK_SOFT} strokeWidth="1" />
        <circle cx="26" cy="15" r="3.5" fill="none" stroke={INK_SOFT} strokeWidth="1" />
        <circle cx="38" cy="15" r="3.5" fill="none" stroke={INK_SOFT} strokeWidth="1" />
        <rect x="60" y="9" width={w - 80} height="13" rx="6" fill="none" stroke={INK_FAINT} strokeWidth="0.8" />
        <text x="74" y="18" fontFamily="JetBrains Mono, monospace" fontSize="9" fill={INK_FAINT}>guesstopcomment.app</text>
      </svg>
      <div style={{ position: 'absolute', inset: '32px 8px 8px 8px', overflow: 'hidden' }}>{children}</div>
    </div>
  );
}

function PairLayout({ mobile, desktop, mobileLabel = 'mobile', desktopLabel = 'desktop / stream', notes, style }) {
  return (
    <div style={{ display: 'flex', gap: 28, alignItems: 'flex-start', padding: '20px 24px 24px', ...style }}>
      <div>
        <FrameLabel>{mobileLabel}</FrameLabel>
        <MobileFrame>{mobile}</MobileFrame>
      </div>
      <div style={{ flex: 1 }}>
        <FrameLabel>{desktopLabel}</FrameLabel>
        <DesktopFrame>{desktop}</DesktopFrame>
        {notes && <div style={{ marginTop: 12, fontFamily: 'Patrick Hand, cursive', fontSize: 14, color: INK_SOFT, lineHeight: 1.4, maxWidth: 720 }}>{notes}</div>}
      </div>
    </div>
  );
}

function SBtn({ children, w, h = 36, accent = false, secondary = false, dashed = false, style }) {
  const W = w || 'auto';
  const fg = accent ? PAPER : (secondary ? ACCENT_2 : INK);
  const bg = accent ? ACCENT : 'transparent';
  const bd = accent ? ACCENT : (secondary ? ACCENT_2 : INK);
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      padding: '0 16px', width: W, height: h,
      border: `1.6px ${dashed ? 'dashed' : 'solid'} ${bd}`,
      borderRadius: 22,
      background: bg, color: fg,
      fontFamily: 'Patrick Hand, cursive', fontSize: 16, fontWeight: 600, letterSpacing: 0.3,
      ...style,
    }}>{children}</div>
  );
}

function Hand({ children, size = 14, color = INK, style, rot, weight }) {
  return (
    <span style={{
      fontFamily: 'Patrick Hand, cursive',
      fontSize: size, color, fontWeight: weight,
      transform: rot ? `rotate(${rot}deg)` : undefined,
      display: rot ? 'inline-block' : undefined,
      lineHeight: 1.25, ...style,
    }}>{children}</span>
  );
}

function Mono({ children, size = 10, color = INK_FAINT, style }) {
  return <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: size, color, letterSpacing: 0.5, ...style }}>{children}</span>;
}

// ===== NEW: party-game / multiplayer primitives =====

function AvatarBubble({ name, color = TEAM_BLUE, size = 28, rot = 0, you = false, style }) {
  const initial = (name || '?').slice(0, 1).toUpperCase();
  return (
    <div title={name} style={{
      width: size, height: size, borderRadius: '50%',
      border: `1.5px ${you ? 'solid' : 'dashed'} ${you ? ACCENT_2 : color}`,
      background: you ? ACCENT_2_SOFT : 'transparent',
      color: you ? ACCENT_2 : color,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Patrick Hand, cursive', fontSize: size * 0.55, fontWeight: 700,
      transform: `rotate(${rot}deg)`,
      flexShrink: 0,
      ...style,
    }}>{initial}</div>
  );
}

function RoomCode({ code = 'PIZZA-7', size = 'lg' }) {
  const fontSize = size === 'lg' ? 28 : size === 'md' ? 20 : 14;
  return (
    <div style={{
      display: 'inline-flex', gap: 4, padding: '4px 10px',
      border: `1.5px dashed ${ACCENT_2}`, borderRadius: 8, background: ACCENT_2_SOFT,
    }}>
      {code.split('').map((c, i) => (
        <span key={i} style={{
          fontFamily: 'JetBrains Mono, monospace', fontSize, color: ACCENT_2, fontWeight: 500,
          letterSpacing: 2,
        }}>{c}</span>
      ))}
    </div>
  );
}

function ScoreDot({ filled = false, color = ACCENT, size = 10 }) {
  return (
    <span style={{
      display: 'inline-block', width: size, height: size, borderRadius: '50%',
      border: `1.5px solid ${color}`, background: filled ? color : 'transparent',
      margin: '0 2px',
    }} />
  );
}

// Leaderboard row — used in multiplayer + daily + global
function LeaderRow({ rank, name, score, you = false, color = TEAM_BLUE, scale = 1, delta }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '5px 8px', borderRadius: 6,
      background: you ? ACCENT_2_SOFT : 'transparent',
      border: you ? `1px solid ${ACCENT_2}` : `1px solid transparent`,
    }}>
      <Mono size={10 * scale} color={you ? ACCENT_2 : INK_SOFT} style={{ width: 18 }}>{String(rank).padStart(2, '0')}</Mono>
      <AvatarBubble name={name} color={color} you={you} size={20 * scale} />
      <Hand size={12 * scale} color={you ? ACCENT_2 : INK} style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</Hand>
      {delta && <Mono size={9 * scale} color={INK_FAINT}>{delta}</Mono>}
      <Hand size={13 * scale} weight={700} color={you ? ACCENT_2 : INK}>{score}</Hand>
    </div>
  );
}

Object.assign(window, {
  SBox, SOval, Squiggle, Scribble, ImgPlaceholder, Arrow, FrameLabel, Annot,
  MobileFrame, DesktopFrame, PairLayout, SBtn, Hand, Mono,
  AvatarBubble, RoomCode, ScoreDot, LeaderRow,
  INK, INK_SOFT, INK_FAINT, PAPER, PAPER_2, PAPER_3, ACCENT, ACCENT_SOFT,
  ACCENT_2, ACCENT_2_SOFT, TEAM_BLUE, TEAM_PURPLE, TEAM_GREEN,
  BAND_GREEN, BAND_BLUE, BAND_YELLOW, BAND_RED,
});
