import { readFileSync } from 'node:fs';
import path from 'node:path';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { ReactionBand } from '@/scoring/reaction';
import { ScoreReveal } from './score-reveal';

describe('ScoreReveal', () => {
  it('renders left block: "your guess" label (mono xs accent-2) + quote (Caveat lg ink)', () => {
    render(<ScoreReveal guess="sounds like she's running things" score={87} band="bullseye" />);
    const label = screen.getByText(/your guess/i);
    expect(label.className).toMatch(/font-mono/);
    expect(label.className).toMatch(/text-xs/);
    expect(label.className).toMatch(/text-accent-2\b/);

    const quote = screen.getByTestId('score-reveal-quote');
    expect(quote.className).toMatch(/font-hand/);
    expect(quote.className).toMatch(/text-lg/);
    expect(quote.className).toMatch(/text-text\b/);
    expect(quote.textContent).toContain("sounds like she's running things");
  });

  it('renders right block: score (Fraunces 700, 56px desktop / 42px mobile) + meta', () => {
    render(<ScoreReveal guess="x" score={87} band="bullseye" matchedRank={1} />);
    const num = screen.getByTestId('score-reveal-number');
    expect(num.className).toMatch(/font-display/);
    expect(num.className).toMatch(/font-bold/);
    expect(num.className).toMatch(/leading-none/);
    expect(num.className).toMatch(/tabular-nums/);
    expect(num.className).toMatch(/text-\[42px\]/);
    expect(num.className).toMatch(/md:text-\[56px\]/);
    expect(num.textContent).toMatch(/87/);

    const meta = screen.getByTestId('score-reveal-meta');
    expect(meta.className).toMatch(/font-mono/);
    expect(meta.className).toMatch(/text-xs/);
    expect(meta.textContent).toBe('matched #1');
  });

  it('container: gradient accent-2-soft → transparent, border-accent-2-soft, rounded-lg', () => {
    render(<ScoreReveal guess="x" score={87} band="bullseye" />);
    const root = screen.getByTestId('score-reveal');
    expect(root.className).toMatch(/from-accent-2-soft/);
    expect(root.className).toMatch(/to-transparent/);
    expect(root.className).toMatch(/border-accent-2-soft/);
    expect(root.className).toMatch(/rounded-lg/);
  });

  it('score color is set per band via the --band-color CSS var on the root', () => {
    const cases: Array<[ReactionBand, string]> = [
      ['bullseye', 'var(--color-success)'],
      ['close', 'var(--color-accent-2)'],
      ['almost', 'var(--color-accent)'],
      ['way_off', 'var(--color-danger)'],
    ];
    for (const [band, expectedVar] of cases) {
      const { container, unmount } = render(<ScoreReveal guess="x" score={50} band={band} />);
      const root = container.querySelector('[data-testid="score-reveal"]') as HTMLElement;
      expect(root.getAttribute('data-band')).toBe(band);
      expect(root.style.getPropertyValue('--band-color')).toBe(expectedVar);

      const num = container.querySelector('[data-testid="score-reveal-number"]') as HTMLElement;
      // Number's resolved color follows --band-color (final state in both motion modes).
      expect(num.style.color).toBe('var(--band-color)');
      unmount();
    }
  });

  it('score animation is gated behind motion-safe so reduced-motion has no transforms', () => {
    render(<ScoreReveal guess="x" score={87} band="bullseye" />);
    const num = screen.getByTestId('score-reveal-number');
    // The signature score-up animation only runs when the user has not asked
    // for reduced motion. The class itself is present, but the prefix gates it.
    expect(num.className).toMatch(/motion-safe:animate-score-up/);
    // No bare animate-score-up — that would fire transforms for reduced-motion users.
    expect(num.className).not.toMatch(/(?:^|\s)animate-score-up/);
  });

  it('container has motion-safe-gated entrance animation; reduced-motion path is opacity-only', () => {
    render(<ScoreReveal guess="x" score={87} band="bullseye" />);
    const root = screen.getByTestId('score-reveal');
    // Entrance is opacity-only; the score-up handles the transform.
    expect(root.className).toMatch(/motion-safe:animate-fade-in/);
  });

  it('matched meta is omitted when matchedRank is not provided', () => {
    render(<ScoreReveal guess="x" score={50} band="almost" />);
    expect(screen.queryByTestId('score-reveal-meta')).toBeNull();
  });

  it('exposes the score with aria-live polite + an sr-only "your score:" prefix', () => {
    render(<ScoreReveal guess="x" score={87} band="bullseye" />);
    const num = screen.getByTestId('score-reveal-number');
    expect(num.getAttribute('aria-live')).toBe('polite');
    expect(num.textContent ?? '').toMatch(/your score:/i);
  });

  it('forwards className and merges with the gradient container classes', () => {
    render(<ScoreReveal guess="x" score={87} band="bullseye" className="extra-x" />);
    const root = screen.getByTestId('score-reveal');
    expect(root.className).toMatch(/extra-x/);
    expect(root.className).toMatch(/border-accent-2-soft/);
  });
});

describe('score-reveal animation (CSS)', () => {
  const css = readFileSync(path.resolve(__dirname, '..', '..', 'app', 'globals.css'), 'utf8');

  it('defines a score-up keyframe matching DESIGN.md §5 exactly', () => {
    // DESIGN.md §5: 0% translateY(20px) scale(0.8) opacity 0 → 60% translateY(-4px) scale(1.06) → 100% identity.
    const block = css.match(/@keyframes\s+score-up\s*\{([\s\S]*?)\n\}/);
    expect(block, 'score-up @keyframes block missing').not.toBeNull();
    const body = block![1];
    expect(body).toMatch(/0%[\s\S]*translateY\(20px\)[\s\S]*scale\(0\.8\)/);
    expect(body).toMatch(/60%[\s\S]*translateY\(-4px\)[\s\S]*scale\(1\.06\)/);
    expect(body).toMatch(/100%[\s\S]*translateY\(0\)[\s\S]*scale\(1\)/);
  });

  it('exposes animate-score-up via @theme with 550ms ease-out', () => {
    const tokenLine = css.match(/--animate-score-up\s*:\s*([^;]+);/);
    expect(tokenLine, '--animate-score-up token missing in @theme').not.toBeNull();
    const value = tokenLine![1];
    expect(value).toMatch(/score-up/);
    expect(value).toMatch(/550ms/);
    expect(value).toMatch(/var\(--ease-out\)|cubic-bezier\(\.2,\.7,\.2,1\)/);
  });

  it('color tween — score number transitions text-faint → band-color over 550ms', () => {
    // The band color comes from --band-color (set inline per-band on the root).
    const block = css.match(/@keyframes\s+score-color\s*\{([\s\S]*?)\n\}/);
    expect(block, 'score-color @keyframes block missing').not.toBeNull();
    const body = block![1];
    expect(body).toMatch(/var\(--color-text-faint\)/);
    expect(body).toMatch(/var\(--band-color\)/);
  });
});
