import { ImageResponse } from 'next/og';
import { getPublicRound } from '@/db/rounds';
import { truncateTitle } from '@/lib/og-text';
import { createServiceRoleClient } from '@/lib/supabase/server';

export const alt = 'Guess the Top Comment';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const TITLE_MAX = 120;

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = createServiceRoleClient();
  const round = await getPublicRound(db, id);

  const title = round ? truncateTitle(round.title, TITLE_MAX) : 'Round not found';
  const subreddit = round ? `r/${round.subreddit}` : '';

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '80px',
        background: 'linear-gradient(135deg, #18181b 0%, #27272a 100%)',
        color: '#fafafa',
        fontFamily: 'sans-serif',
      }}
    >
      <div style={{ display: 'flex', fontSize: 28, color: '#a1a1aa', letterSpacing: 2 }}>
        {subreddit.toUpperCase()}
      </div>
      <div style={{ display: 'flex', fontSize: 64, fontWeight: 700, lineHeight: 1.15 }}>
        {title}
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          fontSize: 32,
        }}
      >
        <div style={{ display: 'flex', color: '#fafafa', fontWeight: 600 }}>
          Guess the Top Comment
        </div>
        <div style={{ display: 'flex', color: '#71717a' }}>reddit-guess-top-comment</div>
      </div>
    </div>,
    { ...size },
  );
}
