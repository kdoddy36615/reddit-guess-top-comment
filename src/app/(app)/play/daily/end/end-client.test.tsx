import { render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EndClient, type EndClientProps } from './end-client';

const baseProps: EndClientProps = {
  dateLabel: '2026-05-08',
  totalScore: 412,
  rank: 47,
  totalPlayers: 14392,
  rounds: [
    {
      index: 1,
      subreddit: 'tifu',
      guess: 'sounds like she runs the place',
      score: 92,
      band: 'bullseye',
    },
    { index: 2, subreddit: 'AskReddit', guess: 'the cat is in charge', score: 64, band: 'close' },
    {
      index: 3,
      subreddit: 'mildlyinteresting',
      guess: 'never seen this before',
      score: 41,
      band: 'almost',
    },
    { index: 4, subreddit: 'aww', guess: 'huh', score: 18, band: 'way_off' },
    { index: 5, subreddit: 'todayilearned', guess: 'didn’t know that', score: 71, band: 'close' },
  ],
  streak: { count: 4, active: true },
  initialNow: '2026-05-08T19:48:00.000Z',
  justFinished: true,
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(baseProps.initialNow));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('EndClient', () => {
  it('renders the date eyebrow and "nice run." flavor text', () => {
    render(<EndClient {...baseProps} />);
    expect(screen.getByText(/daily complete · 2026-05-08/i)).toBeInTheDocument();
    expect(screen.getByText(/nice run\./i)).toBeInTheDocument();
  });

  it('renders the total score in the hero', () => {
    render(<EndClient {...baseProps} />);
    expect(screen.getByTestId('daily-total-score')).toHaveTextContent('412');
  });

  it('renders rank-of-N today', () => {
    render(<EndClient {...baseProps} />);
    const rank = screen.getByTestId('daily-rank');
    expect(rank).toHaveTextContent(/rank 47 of 14,392/i);
  });

  it('renders one row per round with subreddit, guess, score, and band-color border', () => {
    render(<EndClient {...baseProps} />);
    const rows = screen.getAllByTestId('daily-round-row');
    expect(rows).toHaveLength(5);
    expect(rows[0]).toHaveAttribute('data-band', 'bullseye');
    expect(rows[0]).toHaveTextContent(/r\/tifu/);
    expect(rows[0]).toHaveTextContent(/sounds like she runs the place/);
    expect(rows[0]).toHaveTextContent(/92/);
    expect(rows[3]).toHaveAttribute('data-band', 'way_off');
  });

  it('renders the streak card with 🔥 when active', () => {
    render(<EndClient {...baseProps} />);
    const card = screen.getByTestId('daily-streak');
    expect(card).toHaveTextContent(/4 days/);
    expect(card).toHaveTextContent(/🔥/);
  });

  it('renders the streak card without 🔥 when inactive', () => {
    render(<EndClient {...baseProps} streak={{ count: 0, active: false }} />);
    const card = screen.getByTestId('daily-streak');
    expect(card).toHaveTextContent(/0 days/);
    expect(card.textContent ?? '').not.toContain('🔥');
  });

  it('renders the next-daily countdown', () => {
    render(<EndClient {...baseProps} />);
    const countdown = screen.getByTestId('daily-next-countdown');
    // 19:48 UTC → next reset at 00:00 UTC = 4h 12m → '04:12'
    expect(countdown).toHaveTextContent(/next daily 04:12/i);
  });

  it('renders both CTAs with correct hrefs', () => {
    render(<EndClient {...baseProps} />);
    const seeBoard = screen.getByTestId('daily-end-see-leaderboard');
    expect(seeBoard).toHaveAttribute('href', '/leaderboard');
    const playUnlimited = screen.getByTestId('daily-end-play-unlimited');
    expect(playUnlimited).toHaveAttribute('href', '/play/solo');
  });

  it('plays the score animation when just-finished', () => {
    render(<EndClient {...baseProps} justFinished />);
    const score = screen.getByTestId('daily-total-score');
    expect(score.className).toMatch(/motion-safe:animate-score-up/);
    const root = screen.getByTestId('daily-end');
    expect(root).toHaveAttribute('data-just-finished', 'true');
  });

  it('does NOT play animations on revisit', () => {
    render(<EndClient {...baseProps} justFinished={false} />);
    const score = screen.getByTestId('daily-total-score');
    expect(score.className).not.toMatch(/animate-score-up/);
    const root = screen.getByTestId('daily-end');
    expect(root).toHaveAttribute('data-just-finished', 'false');
    // Round-row staggered fade-up only fires when just-finished.
    const rows = screen.getAllByTestId('daily-round-row');
    for (const row of rows) {
      expect(row.className).not.toMatch(/animate-fade-in/);
    }
  });

  it('renders a band-color left border on each round row via CSS var', () => {
    render(<EndClient {...baseProps} />);
    const rows = screen.getAllByTestId('daily-round-row');
    // success / accent-2 / accent / danger / accent-2
    expect(rows[0].getAttribute('style')).toMatch(/--band-color: var\(--color-success\)/);
    expect(rows[1].getAttribute('style')).toMatch(/--band-color: var\(--color-accent-2\)/);
    expect(rows[2].getAttribute('style')).toMatch(/--band-color: var\(--color-accent\)/);
    expect(rows[3].getAttribute('style')).toMatch(/--band-color: var\(--color-danger\)/);
  });

  it('renders round indices zero-padded (01, 02, ...)', () => {
    render(<EndClient {...baseProps} />);
    const rows = screen.getAllByTestId('daily-round-row');
    expect(within(rows[0]).getByText(/^01$/)).toBeInTheDocument();
    expect(within(rows[4]).getByText(/^05$/)).toBeInTheDocument();
  });
});
