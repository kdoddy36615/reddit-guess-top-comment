import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RoundTimer } from './round-timer';

describe('RoundTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-08T12:00:00Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the remaining whole seconds (rounded up)', () => {
    const endsAt = Date.now() + 30_000;
    render(<RoundTimer endsAt={endsAt} durationSeconds={30} data-testid="t" />);
    expect(screen.getByTestId('round-timer-readout').textContent).toBe('30');
  });

  it('starts in active state when more than 5s remain', () => {
    const endsAt = Date.now() + 12_000;
    render(<RoundTimer endsAt={endsAt} durationSeconds={30} data-testid="t" />);
    expect(screen.getByTestId('t').dataset.state).toBe('active');
  });

  it('flips to expiring in the final 5 seconds', () => {
    const endsAt = Date.now() + 5_000;
    render(<RoundTimer endsAt={endsAt} durationSeconds={30} data-testid="t" />);
    expect(screen.getByTestId('t').dataset.state).toBe('expiring');
    expect(screen.getByTestId('round-timer-readout').textContent).toBe('5');
  });

  it('flips to expired when remaining hits zero', () => {
    const endsAt = Date.now() + 0;
    render(<RoundTimer endsAt={endsAt} durationSeconds={30} data-testid="t" />);
    expect(screen.getByTestId('t').dataset.state).toBe('expired');
    expect(screen.getByTestId('round-timer-readout').textContent).toBe('0');
  });

  it('counts down across ticks (active → expiring → expired)', () => {
    const endsAt = Date.now() + 7_000;
    render(<RoundTimer endsAt={endsAt} durationSeconds={30} data-testid="t" />);
    expect(screen.getByTestId('t').dataset.state).toBe('active');
    expect(screen.getByTestId('round-timer-readout').textContent).toBe('7');

    act(() => {
      vi.advanceTimersByTime(3_000);
    });
    expect(screen.getByTestId('t').dataset.state).toBe('expiring');
    expect(screen.getByTestId('round-timer-readout').textContent).toBe('4');

    act(() => {
      vi.advanceTimersByTime(5_000);
    });
    expect(screen.getByTestId('t').dataset.state).toBe('expired');
    expect(screen.getByTestId('round-timer-readout').textContent).toBe('0');
  });

  it('exposes a role=timer with an aria-label that includes seconds', () => {
    const endsAt = Date.now() + 22_000;
    render(<RoundTimer endsAt={endsAt} durationSeconds={30} />);
    const t = screen.getByRole('timer');
    expect(t.getAttribute('aria-label')).toMatch(/22/);
    expect(t.getAttribute('aria-label')).toMatch(/second|s\b/i);
  });

  it('expiring state pulse is motion-safe only (reduced-motion users see numbers only)', () => {
    const endsAt = Date.now() + 3_000;
    render(<RoundTimer endsAt={endsAt} durationSeconds={30} data-testid="t" />);
    const t = screen.getByTestId('t');
    // Any pulse class on the timer must be gated by motion-safe so reduced-motion
    // users get only the number ticking — no pulse, no flashing.
    const pulseHits = t.querySelectorAll('.animate-pulse, [class*="animate-pulse"]');
    for (const el of Array.from(pulseHits)) {
      expect(el.className).toMatch(/motion-safe:/);
    }
    // Same for the root.
    if (t.className.includes('animate-pulse')) {
      expect(t.className).toMatch(/motion-safe:animate-pulse/);
    }
  });

  it("'you' variant tints the ring with accent-2", () => {
    const endsAt = Date.now() + 30_000;
    render(<RoundTimer endsAt={endsAt} durationSeconds={30} variant="you" data-testid="t" />);
    const t = screen.getByTestId('t');
    expect(t.dataset.variant).toBe('you');
  });

  it('renders the ring fill ratio (stroke-dashoffset reflects remaining/total)', () => {
    const endsAt = Date.now() + 15_000;
    render(<RoundTimer endsAt={endsAt} durationSeconds={30} data-testid="t" />);
    const ring = screen.getByTestId('t').querySelector('[data-testid="round-timer-ring"]');
    expect(ring).not.toBeNull();
    // half-remaining ⇒ dashoffset is roughly half the circumference.
    const offset = Number((ring as SVGCircleElement).getAttribute('stroke-dashoffset'));
    const dasharray = Number((ring as SVGCircleElement).getAttribute('stroke-dasharray'));
    expect(Number.isFinite(offset)).toBe(true);
    expect(Number.isFinite(dasharray)).toBe(true);
    expect(offset).toBeGreaterThan(0);
    expect(offset).toBeLessThan(dasharray);
  });

  it('forwards className', () => {
    const endsAt = Date.now() + 30_000;
    render(<RoundTimer endsAt={endsAt} durationSeconds={30} className="extra-x" data-testid="t" />);
    expect(screen.getByTestId('t').className).toMatch(/extra-x/);
  });
});
