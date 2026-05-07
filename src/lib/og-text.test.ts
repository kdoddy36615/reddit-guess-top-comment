import { describe, expect, it } from 'vitest';
import { truncateTitle } from './og-text';

describe('truncateTitle', () => {
  it('returns short titles unchanged', () => {
    expect(truncateTitle('Short title', 120)).toBe('Short title');
  });

  it('returns titles at exactly max length unchanged', () => {
    const exactly10 = 'abcdefghij';
    expect(truncateTitle(exactly10, 10)).toBe(exactly10);
  });

  it('truncates oversize titles to (max-1) chars plus an ellipsis', () => {
    expect(truncateTitle('abcdefghijk', 10)).toBe('abcdefghi…');
  });

  it('trims trailing whitespace before the ellipsis', () => {
    // slice(0,9) ends with a space — drop it so we get "abcdefgh…" not "abcdefgh …"
    expect(truncateTitle('abcdefgh ijklmnop', 10)).toBe('abcdefgh…');
  });
});
