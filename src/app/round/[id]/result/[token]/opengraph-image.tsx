import { ImageResponse } from 'next/og';
import { findGuessByShareToken } from '@/db/guesses';
import { getPublicRound } from '@/db/rounds';
import { truncateTitle } from '@/lib/og-text';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { type ReactionBand, reactionFor } from '@/scoring/reaction';

export const alt = 'Beat my score — guess the top comment';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const TITLE_MAX = 90;
const GUESS_MAX = 80;

const BAND_GRADIENT: Record<ReactionBand, string> = {
  way_off: 'linear-gradient(135deg, #7f1d1d 0%, #b91c1c 100%)',
  almost: 'linear-gradient(135deg, #78350f 0%, #d97706 100%)',
  close: 'linear-gradient(135deg, #064e3b 0%, #059669 100%)',
  bullseye: 'linear-gradient(135deg, #4c1d95 0%, #7c3aed 100%)',
};

const BAND_ACCENT: Record<ReactionBand, string> = {
  way_off: '#fca5a5',
  almost: '#fcd34d',
  close: '#6ee7b7',
  bullseye: '#c4b5fd',
};

export default async function Image({
  params,
}: {
  params: Promise<{ id: string; token: string }>;
}) {
  const { id, token } = await params;

  const db = createServiceRoleClient();
  const [round, friend] = await Promise.all([
    getPublicRound(db, id),
    findGuessByShareToken(db, { roundId: id, token }),
  ]);

  // Fall back to a generic card if the lookup misses; the main page will 404
  // separately, this just keeps the OG endpoint from throwing.
  if (!round || !friend) {
    return new ImageResponse(
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#18181b',
          color: '#fafafa',
          fontSize: 56,
          fontFamily: 'sans-serif',
        }}
      >
        Guess the Top Comment
      </div>,
      { ...size },
    );
  }

  const reaction = reactionFor(friend.score);
  const title = truncateTitle(round.title, TITLE_MAX);
  const guess = truncateTitle(friend.guessText, GUESS_MAX);
  const accent = BAND_ACCENT[reaction.band];

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '72px',
        background: BAND_GRADIENT[reaction.band],
        color: '#fafafa',
        fontFamily: 'sans-serif',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 26 }}>
        <span style={{ display: 'flex', color: accent, letterSpacing: 2 }}>
          r/{round.subreddit.toUpperCase()}
        </span>
        <span style={{ display: 'flex', color: accent, letterSpacing: 4 }}>
          {reaction.label.toUpperCase()}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 24,
          }}
        >
          <span style={{ display: 'flex', fontSize: 140, fontWeight: 800, lineHeight: 1 }}>
            {friend.score}
          </span>
          <span style={{ display: 'flex', fontSize: 56, color: accent, fontWeight: 600 }}>
            {friend.nickname}
          </span>
        </div>
        <div
          style={{
            display: 'flex',
            marginTop: 24,
            fontSize: 38,
            fontStyle: 'italic',
            color: '#fafafa',
            opacity: 0.95,
          }}
        >
          “{guess}”
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', fontSize: 28, fontWeight: 600 }}>{title}</div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 26,
            color: accent,
          }}
        >
          <span style={{ display: 'flex' }}>Can you beat it?</span>
          <span style={{ display: 'flex' }}>reddit-guess-top-comment</span>
        </div>
      </div>
    </div>,
    { ...size },
  );
}
