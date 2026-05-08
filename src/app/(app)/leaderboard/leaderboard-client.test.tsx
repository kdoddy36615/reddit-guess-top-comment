import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { type BoardRow, LeaderboardClient } from './leaderboard-client';

const initialNow = '2026-05-08T19:48:00.000Z';

const baseRows: BoardRow[] = [
  { playerId: 'p1', rank: 1, name: 'comment_king', score: 742 },
  { playerId: 'p2', rank: 2, name: 'snorlax_42', score: 718 },
  { playerId: 'p3', rank: 3, name: 'midnight_mike', score: 612 },
];

describe('LeaderboardClient', () => {
  it('renders the header with title, date, player count, and resets-in countdown', () => {
    render(
      <LeaderboardClient
        dateLabel="2026-05-08"
        totalPlayers={14392}
        topRows={baseRows}
        youWindow={null}
        currentPlayerId={null}
        isAnonymous={true}
        initialNow={initialNow}
      />,
    );
    expect(screen.getByRole('heading', { name: /today's board/i })).toBeInTheDocument();
    expect(screen.getByText(/2026-05-08/)).toBeInTheDocument();
    expect(screen.getByText(/14,392 players/)).toBeInTheDocument();
    expect(screen.getByTestId('resets-in')).toHaveTextContent(/resets in 04:12/);
  });

  it("renders three tabs with 'today' active and the others disabled", () => {
    render(
      <LeaderboardClient
        dateLabel="2026-05-08"
        totalPlayers={3}
        topRows={baseRows}
        youWindow={null}
        currentPlayerId={null}
        isAnonymous={true}
        initialNow={initialNow}
      />,
    );
    const today = screen.getByTestId('leaderboard-tab-today');
    const week = screen.getByTestId('leaderboard-tab-week');
    const allTime = screen.getByTestId('leaderboard-tab-all-time');
    expect(today).toHaveAttribute('aria-selected', 'true');
    expect(today).not.toBeDisabled();
    expect(week).toBeDisabled();
    expect(allTime).toBeDisabled();
  });

  it('renders a LeaderboardRow per top row, default variant when no current player', () => {
    render(
      <LeaderboardClient
        dateLabel="2026-05-08"
        totalPlayers={3}
        topRows={baseRows}
        youWindow={null}
        currentPlayerId={null}
        isAnonymous={true}
        initialNow={initialNow}
      />,
    );
    const rows = screen.getAllByTestId('leaderboard-top-row');
    expect(rows).toHaveLength(3);
    for (const row of rows) {
      expect(row.dataset.variant).toBe('default');
    }
    expect(within(rows[0]).getByText('comment_king')).toBeInTheDocument();
  });

  it("marks the current player's row 'you' when they are inside the top board", () => {
    render(
      <LeaderboardClient
        dateLabel="2026-05-08"
        totalPlayers={3}
        topRows={baseRows}
        youWindow={null}
        currentPlayerId="p2"
        isAnonymous={false}
        initialNow={initialNow}
      />,
    );
    const rows = screen.getAllByTestId('leaderboard-top-row');
    expect(rows[0].dataset.variant).toBe('default');
    expect(rows[1].dataset.variant).toBe('you');
    expect(rows[2].dataset.variant).toBe('default');
  });

  it("renders a dashed divider + window with the player's row pinned in 'you' variant when off-screen", () => {
    const youWindow: BoardRow[] = [
      { playerId: 'p45', rank: 45, name: 'anon_45', score: 414 },
      { playerId: 'p46', rank: 46, name: 'anon_46', score: 413 },
      { playerId: 'pme', rank: 47, name: 'kev', score: 412 },
      { playerId: 'p48', rank: 48, name: 'anon_48', score: 409 },
      { playerId: 'p49', rank: 49, name: 'anon_49', score: 408 },
    ];
    render(
      <LeaderboardClient
        dateLabel="2026-05-08"
        totalPlayers={500}
        topRows={baseRows}
        youWindow={youWindow}
        currentPlayerId="pme"
        isAnonymous={false}
        initialNow={initialNow}
      />,
    );
    expect(screen.getByTestId('leaderboard-window-divider')).toBeInTheDocument();
    const windowRows = screen.getAllByTestId('leaderboard-window-row');
    expect(windowRows).toHaveLength(5);
    const youRow = windowRows.find((r) => r.dataset.variant === 'you');
    expect(youRow).toBeDefined();
    expect(within(youRow as HTMLElement).getByText('kev')).toBeInTheDocument();
    expect(within(youRow as HTMLElement).getByText('412')).toBeInTheDocument();
    // Top-3 rows should still all be default in this scenario.
    for (const row of screen.getAllByTestId('leaderboard-top-row')) {
      expect(row.dataset.variant).toBe('default');
    }
  });

  it("shows 'sign in to compete →' linking to /sign-in when anonymous", () => {
    render(
      <LeaderboardClient
        dateLabel="2026-05-08"
        totalPlayers={3}
        topRows={baseRows}
        youWindow={null}
        currentPlayerId={null}
        isAnonymous={true}
        initialNow={initialNow}
      />,
    );
    const cta = screen.getByTestId('leaderboard-sign-in-cta');
    expect(cta).toHaveTextContent(/sign in to compete/i);
    expect(cta).toHaveAttribute('href', '/sign-in');
  });

  it('hides the sign-in CTA when the viewer is signed in', () => {
    render(
      <LeaderboardClient
        dateLabel="2026-05-08"
        totalPlayers={3}
        topRows={baseRows}
        youWindow={null}
        currentPlayerId="p2"
        isAnonymous={false}
        initialNow={initialNow}
      />,
    );
    expect(screen.queryByTestId('leaderboard-sign-in-cta')).toBeNull();
  });

  it('renders an empty-state message when no rows exist yet', () => {
    render(
      <LeaderboardClient
        dateLabel="2026-05-08"
        totalPlayers={0}
        topRows={[]}
        youWindow={null}
        currentPlayerId={null}
        isAnonymous={true}
        initialNow={initialNow}
      />,
    );
    expect(screen.getByTestId('leaderboard-empty')).toBeInTheDocument();
    expect(screen.queryAllByTestId('leaderboard-top-row')).toHaveLength(0);
  });
});
