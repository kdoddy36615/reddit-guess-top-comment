// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getSiteUrl } from './site-url';

describe('getSiteUrl', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.VERCEL_URL;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('uses NEXT_PUBLIC_SITE_URL when set, stripping trailing slash', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://example.com/';
    expect(getSiteUrl()).toBe('https://example.com');
  });

  it('falls back to VERCEL_URL with https scheme', () => {
    process.env.VERCEL_URL = 'reddit-guess-top-comment.vercel.app';
    expect(getSiteUrl()).toBe('https://reddit-guess-top-comment.vercel.app');
  });

  it('falls back to localhost when nothing is set', () => {
    expect(getSiteUrl()).toBe('http://localhost:3000');
  });

  it('prefers NEXT_PUBLIC_SITE_URL over VERCEL_URL', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://prod.example.com';
    process.env.VERCEL_URL = 'preview.vercel.app';
    expect(getSiteUrl()).toBe('https://prod.example.com');
  });
});
