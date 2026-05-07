import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Footer } from './footer';

describe('Footer', () => {
  it('renders a contentinfo landmark', () => {
    render(<Footer />);
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });

  it('renders empty for now (legal links wired in #48)', () => {
    render(<Footer />);
    const footer = screen.getByRole('contentinfo');
    // No nav links yet — legal links land in slice 32 / issue #48.
    expect(footer.querySelectorAll('a').length).toBe(0);
  });

  it('forwards className for layout overrides', () => {
    render(<Footer className="extra-x" />);
    expect(screen.getByRole('contentinfo').className).toMatch(/extra-x/);
  });
});
