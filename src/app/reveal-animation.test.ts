import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// Streamer-clip cadence requirement (PRD user story #25 / issue #15):
// the reveal animation must finish well under 2 seconds.
const MAX_REVEAL_ANIMATION_MS = 2000;

function parseDurationMs(value: string): number {
  const trimmed = value.trim();
  if (trimmed.endsWith('ms')) return Number.parseFloat(trimmed.slice(0, -2));
  if (trimmed.endsWith('s')) return Number.parseFloat(trimmed.slice(0, -1)) * 1000;
  throw new Error(`unrecognized CSS duration: ${value}`);
}

describe('reveal animation', () => {
  it('completes in under 2 seconds for clip-friendly cadence', () => {
    const css = readFileSync(path.resolve(__dirname, 'globals.css'), 'utf8');
    const match = css.match(
      /\[data-testid=['"]reveal['"]\]\s*\{[^}]*animation:\s*reveal-in\s+([\d.]+m?s)/,
    );
    expect(match, 'reveal animation rule not found in globals.css').not.toBeNull();
    const duration = parseDurationMs(match![1]);
    expect(duration).toBeLessThan(MAX_REVEAL_ANIMATION_MS);
  });
});
