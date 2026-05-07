import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AppBar } from './app-bar';

describe('AppBar', () => {
  it('renders a banner landmark with sticky h-14 surface/70 backdrop-blur shell (DESIGN.md §3)', () => {
    render(<AppBar />);
    const banner = screen.getByRole('banner');
    expect(banner.className).toMatch(/\bsticky\b/);
    expect(banner.className).toMatch(/\btop-0\b/);
    expect(banner.className).toMatch(/\bh-14\b/);
    // surface/70 + backdrop-blur are the spec'd visual treatment.
    expect(banner.className).toMatch(/bg-surface\/70/);
    expect(banner.className).toMatch(/backdrop-blur/);
    expect(banner.className).toMatch(/border-b/);
    expect(banner.className).toMatch(/border-border\b/);
  });

  it('renders the brand mark (link to "/") on the left', () => {
    render(<AppBar />);
    const banner = screen.getByRole('banner');
    const brand = within(banner).getByRole('link', { name: /guesstop/i });
    expect(brand).toHaveAttribute('href', '/');
  });

  it('renders the title slot in the center when provided', () => {
    render(<AppBar title={<span data-testid="route-title">solo · round 1 / 5</span>} />);
    expect(screen.getByTestId('route-title')).toBeInTheDocument();
  });

  it('always renders an avatar slot on the right (empty by default)', () => {
    render(<AppBar />);
    const slot = screen.getByTestId('app-bar-avatar-slot');
    expect(slot).toBeInTheDocument();
    expect(slot.textContent).toBe('');
  });

  it('renders the avatar slot contents when actions are provided', () => {
    render(
      <AppBar
        actions={
          <button type="button" data-testid="avatar-menu">
            menu
          </button>
        }
      />,
    );
    const slot = screen.getByTestId('app-bar-avatar-slot');
    expect(within(slot).getByTestId('avatar-menu')).toBeInTheDocument();
  });

  it('guards backdrop transitions behind motion-safe so reduced-motion users skip them', () => {
    render(<AppBar />);
    const banner = screen.getByRole('banner');
    // Any backdrop transition must be motion-safe-prefixed so prefers-reduced-motion gets a static treatment.
    expect(banner.className).toMatch(/motion-safe:transition/);
  });
});
