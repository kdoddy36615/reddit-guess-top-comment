import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LandingAuxRow } from './landing-aux-row';

describe('LandingAuxRow', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the SSR-supplied countdown initially (no flash)', () => {
    // 2026-05-08T19:48:12Z → 4h 11m 48s until next UTC midnight.
    vi.setSystemTime(new Date('2026-05-08T19:48:12Z'));
    render(<LandingAuxRow nowIso="2026-05-08T19:48:12Z" playersToday={1423} />);
    expect(screen.getByTestId('aux-countdown').textContent ?? '').toMatch(/04:11:48/);
    expect(screen.getByText(/1,423/)).toBeInTheDocument();
  });

  it('ticks down every second once mounted', () => {
    vi.setSystemTime(new Date('2026-05-08T23:59:55Z'));
    render(<LandingAuxRow nowIso="2026-05-08T23:59:55Z" playersToday={0} />);
    expect(screen.getByTestId('aux-countdown').textContent ?? '').toMatch(/00:00:05/);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    // After 1s: 4 seconds remain.
    expect(screen.getByTestId('aux-countdown').textContent ?? '').toMatch(/00:00:04/);
  });

  it('formats large player counts with thousands separators', () => {
    vi.setSystemTime(new Date('2026-05-08T12:00:00Z'));
    render(<LandingAuxRow nowIso="2026-05-08T12:00:00Z" playersToday={14392} />);
    expect(screen.getByText(/14,392/)).toBeInTheDocument();
  });

  it('uses singular copy when exactly one player has finished', () => {
    vi.setSystemTime(new Date('2026-05-08T12:00:00Z'));
    render(<LandingAuxRow nowIso="2026-05-08T12:00:00Z" playersToday={1} />);
    expect(screen.getByText(/1 played/i)).toBeInTheDocument();
  });
});
