import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Avatar } from './avatar';

describe('Avatar', () => {
  it('renders a round container with subtle inner border', () => {
    render(<Avatar name="Kevin" data-testid="a" />);
    const el = screen.getByTestId('a');
    expect(el.className).toMatch(/rounded-full/);
    expect(el.className).toMatch(/border\b/);
  });

  it('falls back to the first initial when no src is given', () => {
    render(<Avatar name="kevin" data-testid="a" />);
    const el = screen.getByTestId('a');
    expect(el.textContent).toBe('K');
    expect(el.className).toMatch(/font-mono/);
    expect(el.className).toMatch(/font-semibold/);
  });

  it('ignores name initial when an image src is provided', () => {
    render(<Avatar name="Kevin" src="/avatar.png" alt="Kevin's avatar" data-testid="a" />);
    const el = screen.getByTestId('a');
    const img = el.querySelector('img');
    expect(img).not.toBeNull();
    expect(img?.getAttribute('src')).toBe('/avatar.png');
    expect(img?.getAttribute('alt')).toBe("Kevin's avatar");
    expect(el.textContent).not.toContain('K');
  });

  it("'you' variant uses accent-2 background", () => {
    render(<Avatar name="me" variant="you" data-testid="a" />);
    const el = screen.getByTestId('a');
    expect(el.className).toMatch(/bg-accent-2\b/);
    expect(el.className).toMatch(/text-accent-foreground/);
  });

  it('non-you avatars derive a decorative color slot from the slot prop', () => {
    render(<Avatar name="A" slot={0} data-testid="a0" />);
    render(<Avatar name="B" slot={3} data-testid="a3" />);
    const a0 = screen.getByTestId('a0');
    const a3 = screen.getByTestId('a3');
    // Slots use CSS variables exposed on the element via inline style.
    expect(a0.getAttribute('style')).toMatch(/background/);
    expect(a3.getAttribute('style')).toMatch(/background/);
    expect(a0.getAttribute('style')).not.toBe(a3.getAttribute('style'));
  });

  it('size variants control diameter', () => {
    render(<Avatar name="A" size="sm" data-testid="sm" />);
    render(<Avatar name="A" size="md" data-testid="md" />);
    render(<Avatar name="A" size="lg" data-testid="lg" />);
    expect(screen.getByTestId('sm').className).toMatch(/h-7/);
    expect(screen.getByTestId('md').className).toMatch(/h-9/);
    expect(screen.getByTestId('lg').className).toMatch(/h-12/);
  });

  it('exposes the user name as aria-label when no image is present', () => {
    render(<Avatar name="Kevin" data-testid="a" />);
    expect(screen.getByTestId('a')).toHaveAttribute('aria-label', 'Kevin');
  });

  it('forwards className', () => {
    render(<Avatar name="A" className="extra" data-testid="a" />);
    expect(screen.getByTestId('a').className).toMatch(/extra/);
  });
});
