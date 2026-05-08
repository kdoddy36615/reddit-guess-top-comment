import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LegalContent } from './legal-content';
import { getLegalPage } from './legal-pages';

describe('LegalContent', () => {
  it('renders the page title as the H1 heading', () => {
    const page = getLegalPage('terms');
    if (!page) throw new Error('terms page must exist');
    render(<LegalContent page={page} />);

    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1.textContent).toBe(page.title);
  });

  it('renders an H2 for every section', () => {
    const page = getLegalPage('privacy');
    if (!page) throw new Error('privacy page must exist');
    render(<LegalContent page={page} />);

    const h2s = screen.getAllByRole('heading', { level: 2 });
    expect(h2s.map((h) => h.textContent)).toEqual(page.sections.map((s) => s.heading));
  });

  it('shows a clearly-marked placeholder banner', () => {
    const page = getLegalPage('terms');
    if (!page) throw new Error('terms page must exist');
    render(<LegalContent page={page} />);

    const banner = screen.getByRole('note');
    expect(banner.textContent?.toLowerCase()).toContain('placeholder');
  });

  it('uses Fraunces (display) for headings and Inter Tight (sans) for body', () => {
    const page = getLegalPage('terms');
    if (!page) throw new Error('terms page must exist');
    render(<LegalContent page={page} />);

    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1.className).toMatch(/font-display/);

    const h2 = screen.getAllByRole('heading', { level: 2 })[0];
    expect(h2.className).toMatch(/font-display/);

    // The article wrapper applies the body sans font.
    const article = screen.getByRole('article');
    expect(article.className).toMatch(/font-sans/);
  });

  it('constrains line length to max-w 65ch (DESIGN.md §4 prose)', () => {
    const page = getLegalPage('terms');
    if (!page) throw new Error('terms page must exist');
    render(<LegalContent page={page} />);

    const article = screen.getByRole('article');
    expect(article.className).toMatch(/max-w-\[65ch\]/);
  });
});
