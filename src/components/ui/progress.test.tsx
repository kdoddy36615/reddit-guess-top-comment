import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Progress } from './progress';

describe('Progress (round pips)', () => {
  it('defaults to 5 pips matching the daily session length', () => {
    render(<Progress current={1} data-testid="p" />);
    const root = screen.getByTestId('p');
    const pips = within(root).getAllByTestId('pip');
    expect(pips).toHaveLength(5);
  });

  it('marks pips before current as done, current as now, and the rest as pending', () => {
    render(<Progress current={3} total={5} data-testid="p" />);
    const root = screen.getByTestId('p');
    const pips = within(root).getAllByTestId('pip');
    const states = pips.map((p) => p.getAttribute('data-state'));
    expect(states).toEqual(['done', 'done', 'now', 'pending', 'pending']);
  });

  it('done pips use accent, now uses text-muted, pending uses text-disabled', () => {
    render(<Progress current={2} total={3} data-testid="p" />);
    const root = screen.getByTestId('p');
    const [done, now, pending] = within(root).getAllByTestId('pip');
    expect(done.className).toMatch(/bg-accent\b/);
    expect(now.className).toMatch(/bg-text-muted/);
    expect(pending.className).toMatch(/bg-text-disabled/);
  });

  it('pip dimensions match DESIGN.md §2 (18×4 px, rounded-sm)', () => {
    render(<Progress current={1} data-testid="p" />);
    const pip = within(screen.getByTestId('p')).getAllByTestId('pip')[0];
    expect(pip.className).toMatch(/h-1\b/);
    expect(pip.className).toMatch(/w-\[18px\]/);
    expect(pip.className).toMatch(/rounded-sm/);
  });

  it('exposes ARIA progressbar semantics', () => {
    render(<Progress current={2} total={5} data-testid="p" aria-label="round" />);
    const root = screen.getByTestId('p');
    expect(root).toHaveAttribute('role', 'progressbar');
    expect(root).toHaveAttribute('aria-valuenow', '2');
    expect(root).toHaveAttribute('aria-valuemin', '1');
    expect(root).toHaveAttribute('aria-valuemax', '5');
    expect(root).toHaveAttribute('aria-label', 'round');
  });

  it('clamps current outside [1, total] without crashing', () => {
    render(<Progress current={99} total={5} data-testid="p" />);
    const states = within(screen.getByTestId('p'))
      .getAllByTestId('pip')
      .map((p) => p.getAttribute('data-state'));
    // All previous rounds done; the final pip becomes the "now" indicator.
    expect(states).toEqual(['done', 'done', 'done', 'done', 'now']);
  });
});
