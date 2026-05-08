import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReadonlyURLSearchParams } from 'next/navigation';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  type BoardRow,
  LeaderboardClient,
  type Timeframe,
  type TimeframeBoard,
} from './leaderboard-client';

const initialNow = '2026-05-08T19:48:00.000Z';

const mockReplace = vi.fn();
let mockSearchParams = new URLSearchParams() as unknown as ReadonlyURLSearchParams;

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: mockReplace }),
  usePathname: () => '/leaderboard',
  useSearchParams: () => mockSearchParams,
}));

const todayRows: BoardRow[] = [
  { playerId: 'p1', rank: 1, name: 'comment_king', score: 742 },
  { playerId: 'p2', rank: 2, name: 'snorlax_42', score: 718 },
  { playerId: 'p3', rank: 3, name: 'midnight_mike', score: 612 },
];

const weekRows: BoardRow[] = [
  { playerId: 'p4', rank: 1, name: 'week_winner', score: 4912 },
  { playerId: 'p5', rank: 2, name: 'consistent_carl', score: 4811 },
];

const allTimeRows: BoardRow[] = [
  { playerId: 'p6', rank: 1, name: 'gigachad', score: 91204 },
  { playerId: 'p7', rank: 2, name: 'old_guard', score: 88112 },
];

function makeBoards(): Record<Timeframe, TimeframeBoard> {
  return {
    today: { topRows: todayRows, youWindow: null, totalPlayers: 14392 },
    week: { topRows: weekRows, youWindow: null, totalPlayers: 41203 },
    'all-time': { topRows: allTimeRows, youWindow: null, totalPlayers: 102488 },
  };
}

beforeEach(() => {
  mockReplace.mockReset();
  mockSearchParams = new URLSearchParams() as unknown as ReadonlyURLSearchParams;
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('LeaderboardClient — header + today tab', () => {
  it('renders the today header with title, date, player count, and resets-in countdown', () => {
    render(
      <LeaderboardClient
        dateLabel="2026-05-08"
        initialNow={initialNow}
        currentPlayerId={null}
        isAnonymous={true}
        boards={makeBoards()}
        initialTab="today"
      />,
    );
    expect(screen.getByRole('heading', { name: /today's board/i })).toBeInTheDocument();
    expect(screen.getByText(/2026-05-08/)).toBeInTheDocument();
    expect(screen.getByText(/14,392 players/)).toBeInTheDocument();
    expect(screen.getByTestId('resets-in')).toHaveTextContent(/resets in 04:12/);
  });

  it('renders three tabs with the initial tab selected and none disabled', () => {
    render(
      <LeaderboardClient
        dateLabel="2026-05-08"
        initialNow={initialNow}
        currentPlayerId={null}
        isAnonymous={true}
        boards={makeBoards()}
        initialTab="today"
      />,
    );
    const today = screen.getByTestId('leaderboard-tab-today');
    const week = screen.getByTestId('leaderboard-tab-week');
    const allTime = screen.getByTestId('leaderboard-tab-all-time');
    expect(today).toHaveAttribute('aria-selected', 'true');
    expect(week).not.toBeDisabled();
    expect(allTime).not.toBeDisabled();
  });

  it('renders a LeaderboardRow per top row, default variant when no current player', () => {
    render(
      <LeaderboardClient
        dateLabel="2026-05-08"
        initialNow={initialNow}
        currentPlayerId={null}
        isAnonymous={true}
        boards={makeBoards()}
        initialTab="today"
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
        initialNow={initialNow}
        currentPlayerId="p2"
        isAnonymous={false}
        boards={makeBoards()}
        initialTab="today"
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
    const boards = makeBoards();
    boards.today = { ...boards.today, totalPlayers: 500, youWindow };
    render(
      <LeaderboardClient
        dateLabel="2026-05-08"
        initialNow={initialNow}
        currentPlayerId="pme"
        isAnonymous={false}
        boards={boards}
        initialTab="today"
      />,
    );
    expect(screen.getByTestId('leaderboard-window-divider')).toBeInTheDocument();
    const windowRows = screen.getAllByTestId('leaderboard-window-row');
    expect(windowRows).toHaveLength(5);
    const youRow = windowRows.find((r) => r.dataset.variant === 'you');
    expect(youRow).toBeDefined();
    expect(within(youRow as HTMLElement).getByText('kev')).toBeInTheDocument();
    expect(within(youRow as HTMLElement).getByText('412')).toBeInTheDocument();
    for (const row of screen.getAllByTestId('leaderboard-top-row')) {
      expect(row.dataset.variant).toBe('default');
    }
  });

  it("shows 'sign in to compete →' linking to /sign-in when anonymous", () => {
    render(
      <LeaderboardClient
        dateLabel="2026-05-08"
        initialNow={initialNow}
        currentPlayerId={null}
        isAnonymous={true}
        boards={makeBoards()}
        initialTab="today"
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
        initialNow={initialNow}
        currentPlayerId="p2"
        isAnonymous={false}
        boards={makeBoards()}
        initialTab="today"
      />,
    );
    expect(screen.queryByTestId('leaderboard-sign-in-cta')).toBeNull();
  });

  it('renders an empty-state message when no rows exist yet', () => {
    const boards = makeBoards();
    boards.today = { topRows: [], youWindow: null, totalPlayers: 0 };
    render(
      <LeaderboardClient
        dateLabel="2026-05-08"
        initialNow={initialNow}
        currentPlayerId={null}
        isAnonymous={true}
        boards={boards}
        initialTab="today"
      />,
    );
    expect(screen.getByTestId('leaderboard-empty')).toBeInTheDocument();
    expect(screen.queryAllByTestId('leaderboard-top-row')).toHaveLength(0);
  });
});

describe('LeaderboardClient — week + all-time tabs', () => {
  it('renders the week board when initialTab is "week"', () => {
    render(
      <LeaderboardClient
        dateLabel="2026-05-08"
        initialNow={initialNow}
        currentPlayerId={null}
        isAnonymous={true}
        boards={makeBoards()}
        initialTab="week"
      />,
    );
    expect(screen.getByTestId('leaderboard-tab-week')).toHaveAttribute('aria-selected', 'true');
    const rows = screen.getAllByTestId('leaderboard-top-row');
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByText('week_winner')).toBeInTheDocument();
    expect(screen.getByText(/41,203 players/)).toBeInTheDocument();
    // resets-in countdown is today-specific
    expect(screen.queryByTestId('resets-in')).toBeNull();
  });

  it('renders the all-time board when initialTab is "all-time"', () => {
    render(
      <LeaderboardClient
        dateLabel="2026-05-08"
        initialNow={initialNow}
        currentPlayerId={null}
        isAnonymous={true}
        boards={makeBoards()}
        initialTab="all-time"
      />,
    );
    expect(screen.getByTestId('leaderboard-tab-all-time')).toHaveAttribute('aria-selected', 'true');
    const rows = screen.getAllByTestId('leaderboard-top-row');
    expect(rows.map((r) => within(r).getByTestId('leaderboard-name').textContent)).toEqual([
      'gigachad',
      'old_guard',
    ]);
    expect(screen.getByText(/102,488 players/)).toBeInTheDocument();
  });

  it('switches the rendered board when the user clicks a tab', async () => {
    const user = userEvent.setup();
    render(
      <LeaderboardClient
        dateLabel="2026-05-08"
        initialNow={initialNow}
        currentPlayerId={null}
        isAnonymous={true}
        boards={makeBoards()}
        initialTab="today"
      />,
    );
    expect(
      within(screen.getAllByTestId('leaderboard-top-row')[0]).getByText('comment_king'),
    ).toBeInTheDocument();

    await user.click(screen.getByTestId('leaderboard-tab-week'));

    const weekRowsRendered = screen.getAllByTestId('leaderboard-top-row');
    expect(within(weekRowsRendered[0]).getByText('week_winner')).toBeInTheDocument();

    await user.click(screen.getByTestId('leaderboard-tab-all-time'));
    expect(
      within(screen.getAllByTestId('leaderboard-top-row')[0]).getByText('gigachad'),
    ).toBeInTheDocument();
  });

  it('syncs the active tab to the URL via ?tab= on tab change (replace, no scroll)', async () => {
    const user = userEvent.setup();
    render(
      <LeaderboardClient
        dateLabel="2026-05-08"
        initialNow={initialNow}
        currentPlayerId={null}
        isAnonymous={true}
        boards={makeBoards()}
        initialTab="today"
      />,
    );
    await user.click(screen.getByTestId('leaderboard-tab-week'));
    expect(mockReplace).toHaveBeenLastCalledWith('/leaderboard?tab=week', { scroll: false });

    await user.click(screen.getByTestId('leaderboard-tab-today'));
    // today is the default — strip the param so the URL stays clean.
    expect(mockReplace).toHaveBeenLastCalledWith('/leaderboard', { scroll: false });
  });

  it("renders a windowed 'you' row on the week tab when off-screen", () => {
    const youWindow: BoardRow[] = [{ playerId: 'pme', rank: 22, name: 'kev', score: 1820 }];
    const boards = makeBoards();
    boards.week = { ...boards.week, youWindow };
    render(
      <LeaderboardClient
        dateLabel="2026-05-08"
        initialNow={initialNow}
        currentPlayerId="pme"
        isAnonymous={false}
        boards={boards}
        initialTab="week"
      />,
    );
    const windowRows = screen.getAllByTestId('leaderboard-window-row');
    expect(windowRows).toHaveLength(1);
    expect(windowRows[0].dataset.variant).toBe('you');
    expect(within(windowRows[0]).getByText('kev')).toBeInTheDocument();
  });
});
