import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ConnectionBanner } from './connection-banner';

describe('ConnectionBanner', () => {
  it('renders nothing when status is live', () => {
    const { container } = render(<ConnectionBanner status="live" />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the reconnecting state with role=status (warning, polite)', () => {
    render(<ConnectionBanner status="reconnecting" />);
    const region = screen.getByRole('status');
    expect(region).toHaveAttribute('aria-live', 'polite');
    expect(region.textContent ?? '').toMatch(/reconnect/i);
    expect(region.className).toMatch(/text-warning\b/);
    expect(region.className).toMatch(/border-warning\b|border-warning\//);
  });

  it('renders the disconnected state with role=alert (danger, assertive)', () => {
    render(<ConnectionBanner status="disconnected" />);
    const region = screen.getByRole('alert');
    expect(region).toHaveAttribute('aria-live', 'assertive');
    expect(region.textContent ?? '').toMatch(/disconnect|offline|lost/i);
    expect(region.className).toMatch(/text-danger\b/);
    expect(region.className).toMatch(/border-danger\b|border-danger\//);
  });

  it('positions itself fixed at the top, above content', () => {
    render(<ConnectionBanner status="reconnecting" />);
    const region = screen.getByRole('status');
    expect(region.className).toMatch(/\bfixed\b/);
    expect(region.className).toMatch(/\btop-0\b/);
    expect(region.className).toMatch(/\bz-/);
  });

  it('uses motion-safe animation only (reduced-motion users see opacity, no slide-in)', () => {
    render(<ConnectionBanner status="disconnected" />);
    const region = screen.getByRole('alert');
    // The class that performs the slide-in must be gated on motion-safe.
    // Reduced-motion users get only opacity (animate-[fade-in_...] or similar).
    expect(region.className).toMatch(/motion-safe:/);
    expect(region.className).not.toMatch(/(?<!motion-safe:)translate-y-/);
  });

  it('exposes the reconnect-attempt count in the reconnecting message when given', () => {
    render(<ConnectionBanner status="reconnecting" attempt={3} />);
    expect(screen.getByRole('status').textContent ?? '').toMatch(/3/);
  });

  it('honors a custom message override', () => {
    render(<ConnectionBanner status="disconnected" message="we lost the room" />);
    expect(screen.getByRole('alert').textContent).toMatch(/we lost the room/i);
  });
});
