import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LeaderboardRow } from './leaderboard-row';

describe('LeaderboardRow', () => {
  it('uses the spec grid (36px 28px 1fr auto), 10px 12px padding, rounded-md', () => {
    render(<LeaderboardRow rank={1} name="redditor_42" score={920} data-testid="row" />);
    const row = screen.getByTestId('row');
    expect(row.style.gridTemplateColumns).toBe('36px 28px 1fr auto');
    expect(row.className).toMatch(/grid\b/);
    expect(row.className).toMatch(/px-\[12px\]/);
    expect(row.className).toMatch(/py-\[10px\]/);
    expect(row.className).toMatch(/rounded-md/);
  });

  it('default variant: surface bg with ink text on rank/name/score', () => {
    render(<LeaderboardRow rank={2} name="caffeineghost" score={714} data-testid="row" />);
    const row = screen.getByTestId('row');
    expect(row.className).toMatch(/bg-surface-2\b/);
    expect(row.dataset.variant).toBe('default');

    const rankEl = within(row).getByTestId('leaderboard-rank');
    const scoreEl = within(row).getByTestId('leaderboard-score');
    expect(rankEl.className).toMatch(/text-text\b/);
    expect(scoreEl.className).toMatch(/text-text\b/);
    expect(rankEl.className).not.toMatch(/text-accent-2\b/);
    expect(scoreEl.className).not.toMatch(/text-accent-2\b/);
  });

  it("'you' variant: accent-2-soft bg with accent-2 text on rank/score", () => {
    render(<LeaderboardRow rank={14} name="me" score={612} variant="you" data-testid="row" />);
    const row = screen.getByTestId('row');
    expect(row.className).toMatch(/bg-accent-2-soft\b/);
    expect(row.dataset.variant).toBe('you');

    const rankEl = within(row).getByTestId('leaderboard-rank');
    const scoreEl = within(row).getByTestId('leaderboard-score');
    expect(rankEl.className).toMatch(/text-accent-2\b/);
    expect(scoreEl.className).toMatch(/text-accent-2\b/);
  });

  it('renders rank, name, and score textually', () => {
    render(<LeaderboardRow rank={3} name="midnight_mike" score={501} data-testid="row" />);
    const row = screen.getByTestId('row');
    expect(within(row).getByTestId('leaderboard-rank').textContent).toBe('3');
    expect(within(row).getByTestId('leaderboard-name').textContent).toBe('midnight_mike');
    expect(within(row).getByTestId('leaderboard-score').textContent).toBe('501');
  });

  it("mounts an avatar in the 28px column; 'you' variant passes through to Avatar", () => {
    render(<LeaderboardRow rank={1} name="redditor_42" score={920} slot={3} data-testid="row" />);
    const row = screen.getByTestId('row');
    // Avatar renders as role=img with the player name as aria-label.
    expect(within(row).getByRole('img', { name: /redditor_42/i })).toBeInTheDocument();

    render(<LeaderboardRow rank={14} name="me" score={612} variant="you" data-testid="you-row" />);
    const youRow = screen.getByTestId('you-row');
    const youAvatar = within(youRow).getByRole('img', { name: /me/i });
    // 'you' avatar uses the accent-2 background (per Avatar's `you` variant).
    expect(youAvatar.className).toMatch(/bg-accent-2\b/);
  });

  it('forwards className and arbitrary attrs', () => {
    render(
      <LeaderboardRow
        rank={1}
        name="redditor_42"
        score={920}
        className="extra-x"
        data-testid="row"
      />,
    );
    expect(screen.getByTestId('row').className).toMatch(/extra-x/);
  });
});
