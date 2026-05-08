import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PlayerChip } from './player-chip';

describe('PlayerChip', () => {
  it('renders the player name and an avatar', () => {
    render(<PlayerChip name="kev" state="typing" data-testid="chip" />);
    const chip = screen.getByTestId('chip');
    expect(within(chip).getByTestId('player-chip-name').textContent).toBe('kev');
    // Avatar mounts as role=img with the name as aria-label.
    expect(within(chip).getByRole('img', { name: /kev/i })).toBeInTheDocument();
  });

  it('exposes the state via data-state and aria-label', () => {
    render(<PlayerChip name="kev" state="submitted" data-testid="chip" />);
    const chip = screen.getByTestId('chip');
    expect(chip.dataset.state).toBe('submitted');
    expect(chip.getAttribute('aria-label')).toMatch(/kev.*submitted/i);
  });

  it('typing state uses muted copy (still typing)', () => {
    render(<PlayerChip name="kev" state="typing" data-testid="chip" />);
    const chip = screen.getByTestId('chip');
    expect(chip.getAttribute('aria-label')).toMatch(/still typing|typing/i);
  });

  it('disconnected state visually de-emphasises the chip', () => {
    render(<PlayerChip name="kev" state="disconnected" data-testid="chip" />);
    const chip = screen.getByTestId('chip');
    expect(chip.dataset.state).toBe('disconnected');
    expect(chip.className).toMatch(/opacity-/);
  });

  it('kicked state is even more de-emphasised and uses danger accent', () => {
    render(<PlayerChip name="kev" state="kicked" data-testid="chip" />);
    const chip = screen.getByTestId('chip');
    expect(chip.dataset.state).toBe('kicked');
    expect(chip.className).toMatch(/opacity-/);
    expect(chip.className).toMatch(/line-through|text-danger|border-danger/);
  });

  it("'you' highlight uses accent-2 (forwards to Avatar + chip background)", () => {
    render(<PlayerChip name="me" state="typing" isYou data-testid="chip" />);
    const chip = screen.getByTestId('chip');
    expect(chip.dataset.variant).toBe('you');
    expect(chip.className).toMatch(/bg-accent-2-soft|border-accent-2/);
    // Avatar inside also picks up the 'you' variant (accent-2 background).
    const avatar = within(chip).getByRole('img', { name: /me/i });
    expect(avatar.className).toMatch(/bg-accent-2\b/);
  });

  it('non-you chips pass the slot through to Avatar', () => {
    render(<PlayerChip name="A" state="typing" slot={3} data-testid="a" />);
    render(<PlayerChip name="B" state="typing" slot={5} data-testid="b" />);
    const a = within(screen.getByTestId('a')).getByRole('img', { name: /A/i });
    const b = within(screen.getByTestId('b')).getByRole('img', { name: /B/i });
    expect(a.getAttribute('style')).not.toBe(b.getAttribute('style'));
  });

  it('submitted state border/opacity transition is motion-safe only (reduced-motion stays static)', () => {
    render(<PlayerChip name="kev" state="submitted" data-testid="chip" />);
    const chip = screen.getByTestId('chip');
    // Per DESIGN.md §5: submitted chip animates border + opacity 200ms ease-out.
    // Must be motion-safe so reduced-motion users get the final state instantly.
    expect(chip.className).toMatch(/motion-safe:/);
  });

  it('forwards className', () => {
    render(<PlayerChip name="kev" state="typing" className="extra-x" data-testid="chip" />);
    expect(screen.getByTestId('chip').className).toMatch(/extra-x/);
  });
});
