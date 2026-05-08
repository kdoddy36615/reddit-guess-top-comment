import { render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LandingContent } from './landing-content';

const FIXED_NOW = new Date('2026-05-08T19:48:12Z'); // → 4h 11m 48s until next UTC midnight

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(FIXED_NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('LandingContent — anonymous variant', () => {
  it('renders the DESIGN.md §4 hero (eyebrow, title with italic "next", body)', () => {
    render(
      <LandingContent authState="anonymous" nowIso={FIXED_NOW.toISOString()} playersToday={0} />,
    );
    expect(screen.getByText(/a reddit guessing game/i)).toBeInTheDocument();
    const title = screen.getByRole('heading', { level: 1 });
    // The accent "next" word is italic + accent-coloured.
    const next = within(title).getByText(/next/i);
    expect(next.tagName).toBe('EM');
    expect(next.className).toMatch(/text-accent\b/);
    expect(screen.getByTestId('landing-body')).toBeInTheDocument();
  });

  it('renders three CTAs: solo (primary) → /play/solo, daily (secondary) → /play/daily, rooms (ghost) → /rooms', () => {
    render(
      <LandingContent authState="anonymous" nowIso={FIXED_NOW.toISOString()} playersToday={0} />,
    );
    const solo = screen.getByTestId('cta-solo');
    const daily = screen.getByTestId('cta-daily');
    const rooms = screen.getByTestId('cta-rooms');
    expect(solo).toHaveAttribute('href', '/play/solo');
    expect(daily).toHaveAttribute('href', '/play/daily');
    expect(rooms).toHaveAttribute('href', '/rooms');
    expect(solo.textContent ?? '').toMatch(/play solo/i);
    expect(daily.textContent ?? '').toMatch(/today's daily/i);
    expect(rooms.textContent ?? '').toMatch(/play with others/i);
  });

  it('hides the signed-in CTAs', () => {
    render(
      <LandingContent authState="anonymous" nowIso={FIXED_NOW.toISOString()} playersToday={0} />,
    );
    expect(screen.queryByTestId('cta-continue-daily')).not.toBeInTheDocument();
    expect(screen.queryByTestId('cta-your-stats')).not.toBeInTheDocument();
  });

  it('renders the aux row with a daily-reset countdown and players-today count', () => {
    render(
      <LandingContent authState="anonymous" nowIso={FIXED_NOW.toISOString()} playersToday={1423} />,
    );
    const aux = screen.getByTestId('landing-aux');
    expect(aux).toBeInTheDocument();
    // Countdown: 4h 11m → "04:11" prefix in mm:ss-style display.
    expect(within(aux).getByTestId('aux-countdown').textContent ?? '').toMatch(/04:11/);
    expect(within(aux).getByText(/1,?423/)).toBeInTheDocument();
  });

  it('renders three decorative example top comments hidden on mobile', () => {
    render(
      <LandingContent authState="anonymous" nowIso={FIXED_NOW.toISOString()} playersToday={0} />,
    );
    const section = screen.getByTestId('landing-examples');
    // Decorative — aria-hidden so screen readers skip it.
    expect(section.getAttribute('aria-hidden')).toBe('true');
    // Hidden on mobile, surfaced ≥md.
    expect(section.className).toMatch(/\bhidden\b/);
    expect(section.className).toMatch(/md:grid|md:flex|md:block/);
    expect(within(section).getAllByTestId('example-comment')).toHaveLength(3);
  });
});

describe('LandingContent — signed-in variant', () => {
  it('replaces the CTA row with [continue your daily] + [your stats]', () => {
    render(
      <LandingContent authState="permanent" nowIso={FIXED_NOW.toISOString()} playersToday={0} />,
    );
    const cont = screen.getByTestId('cta-continue-daily');
    const stats = screen.getByTestId('cta-your-stats');
    expect(cont).toHaveAttribute('href', '/play/daily');
    expect(stats).toHaveAttribute('href', '/account');
    expect(cont.textContent ?? '').toMatch(/continue your daily/i);
    expect(stats.textContent ?? '').toMatch(/your stats/i);
  });

  it('hides the anonymous three-CTA row', () => {
    render(
      <LandingContent authState="permanent" nowIso={FIXED_NOW.toISOString()} playersToday={0} />,
    );
    expect(screen.queryByTestId('cta-solo')).not.toBeInTheDocument();
    expect(screen.queryByTestId('cta-daily')).not.toBeInTheDocument();
    expect(screen.queryByTestId('cta-rooms')).not.toBeInTheDocument();
  });

  it('still renders the hero and aux row in the signed-in variant', () => {
    render(
      <LandingContent authState="permanent" nowIso={FIXED_NOW.toISOString()} playersToday={42} />,
    );
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.getByTestId('landing-aux')).toBeInTheDocument();
  });
});
