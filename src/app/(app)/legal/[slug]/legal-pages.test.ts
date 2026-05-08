import { describe, expect, it } from 'vitest';
import { getLegalPage, LEGAL_SLUGS } from './legal-pages';

describe('legal-pages', () => {
  it('exposes terms and privacy as the supported slugs', () => {
    expect([...LEGAL_SLUGS].sort()).toEqual(['privacy', 'terms']);
  });

  it('returns content for a known slug', () => {
    const terms = getLegalPage('terms');
    expect(terms).not.toBeNull();
    expect(terms?.title.toLowerCase()).toContain('terms');
    expect(terms?.sections.length).toBeGreaterThan(0);
  });

  it('returns null for unknown slugs', () => {
    expect(getLegalPage('cookies')).toBeNull();
    expect(getLegalPage('')).toBeNull();
    expect(getLegalPage('TERMS')).toBeNull();
  });

  it('marks every page as placeholder content', () => {
    for (const slug of LEGAL_SLUGS) {
      const page = getLegalPage(slug);
      expect(page?.placeholder).toBe(true);
    }
  });
});
