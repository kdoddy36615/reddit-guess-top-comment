// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { buildQuizJsonLd } from './quiz-jsonld';

describe('buildQuizJsonLd', () => {
  it('produces a Quiz with the post title as name and subreddit as about', () => {
    const json = buildQuizJsonLd({
      title: 'TIFU by saying X',
      subreddit: 'tifu',
      url: 'https://example.com/round/abc',
    });
    expect(json['@context']).toBe('https://schema.org');
    expect(json['@type']).toBe('Quiz');
    expect(json.name).toBe('TIFU by saying X');
    expect(json.about).toEqual({ '@type': 'Thing', name: 'r/tifu' });
    expect(json.url).toBe('https://example.com/round/abc');
  });

  it('NEVER includes acceptedAnswer (would leak the top comment to Google)', () => {
    const json = buildQuizJsonLd({
      title: 't',
      subreddit: 's',
      url: 'https://example.com/round/x',
    });
    const serialized = JSON.stringify(json);
    expect(serialized).not.toContain('acceptedAnswer');
    expect(serialized).not.toContain('answer');
  });
});
