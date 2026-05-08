import { describe, expect, it } from 'vitest';
import { legacyRedirects } from './redirects';

function findRedirect(source: string) {
  return legacyRedirects.find((r) => r.source === source);
}

describe('legacyRedirects', () => {
  it('redirects /round/:id to /play/solo with 301', () => {
    const r = findRedirect('/round/:id');
    expect(r).toBeDefined();
    expect(r?.destination).toBe('/play/solo');
    expect(r?.statusCode).toBe(301);
  });

  it('redirects /round/:id/result/:token to /play/solo with 301', () => {
    const r = findRedirect('/round/:id/result/:token');
    expect(r).toBeDefined();
    expect(r?.destination).toBe('/play/solo');
    expect(r?.statusCode).toBe(301);
  });

  it('redirects /archive to / with 301 (covers ?page=N via query passthrough)', () => {
    const r = findRedirect('/archive');
    expect(r).toBeDefined();
    expect(r?.destination).toBe('/');
    expect(r?.statusCode).toBe(301);
  });

  it('redirects /welcome to /play/solo with 301', () => {
    const r = findRedirect('/welcome');
    expect(r).toBeDefined();
    expect(r?.destination).toBe('/play/solo');
    expect(r?.statusCode).toBe(301);
  });

  it('redirects /sign-in to /login with 301', () => {
    const r = findRedirect('/sign-in');
    expect(r).toBeDefined();
    expect(r?.destination).toBe('/login');
    expect(r?.statusCode).toBe(301);
  });

  it('redirects /daily to /play/daily with 301', () => {
    const r = findRedirect('/daily');
    expect(r).toBeDefined();
    expect(r?.destination).toBe('/play/daily');
    expect(r?.statusCode).toBe(301);
  });

  it('uses statusCode (not permanent) so all redirects resolve to 301', () => {
    for (const r of legacyRedirects) {
      expect(r.statusCode).toBe(301);
      expect((r as { permanent?: unknown }).permanent).toBeUndefined();
    }
  });

  it('does not redirect any source onto itself (no infinite loops)', () => {
    for (const r of legacyRedirects) {
      expect(r.destination).not.toBe(r.source);
    }
  });

  it('exposes exactly the six PRD redirects', () => {
    expect(legacyRedirects).toHaveLength(6);
  });
});
