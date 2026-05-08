import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Footer } from './footer';

describe('Footer', () => {
  it('renders a contentinfo landmark', () => {
    render(<Footer />);
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });

  it('renders Terms, Privacy, and GitHub links', () => {
    render(<Footer />);
    const footer = screen.getByRole('contentinfo');
    const terms = within(footer).getByRole('link', { name: /terms/i });
    const privacy = within(footer).getByRole('link', { name: /privacy/i });
    const github = within(footer).getByRole('link', { name: /github/i });

    expect(terms).toHaveAttribute('href', '/legal/terms');
    expect(privacy).toHaveAttribute('href', '/legal/privacy');
    expect(github.getAttribute('href')).toMatch(/^https:\/\/github\.com\//);
  });

  it('opens the GitHub link in a new tab with safe rel', () => {
    render(<Footer />);
    const github = within(screen.getByRole('contentinfo')).getByRole('link', { name: /github/i });
    expect(github).toHaveAttribute('target', '_blank');
    expect(github.getAttribute('rel') ?? '').toMatch(/noopener/);
    expect(github.getAttribute('rel') ?? '').toMatch(/noreferrer/);
  });

  it('forwards className for layout overrides', () => {
    render(<Footer className="extra-x" />);
    expect(screen.getByRole('contentinfo').className).toMatch(/extra-x/);
  });
});
