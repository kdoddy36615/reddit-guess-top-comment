import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// Foundation: tokens + fonts (issue #17). Asserts the design-system foundation
// from handoff/DESIGN.md §1.2 is present in globals.css and layout.tsx.
const globalsCss = readFileSync(path.resolve(__dirname, 'globals.css'), 'utf8');
const layoutTsx = readFileSync(path.resolve(__dirname, 'layout.tsx'), 'utf8');

describe('typography foundation — globals.css @theme block', () => {
  it('declares the canonical color tokens', () => {
    expect(globalsCss).toMatch(/--color-bg:\s*#14110e;/);
    expect(globalsCss).toMatch(/--color-surface:\s*#1c1814;/);
    expect(globalsCss).toMatch(/--color-surface-2:\s*#25201a;/);
    expect(globalsCss).toMatch(/--color-surface-3:\s*#1a1612;/);
    expect(globalsCss).toMatch(/--color-text:\s*#f6efe1;/);
    expect(globalsCss).toMatch(/--color-text-muted:\s*#b8ad97;/);
    expect(globalsCss).toMatch(/--color-accent:\s*#e8814a;/);
    expect(globalsCss).toMatch(/--color-accent-hi:\s*#f29560;/);
    expect(globalsCss).toMatch(/--color-accent-foreground:\s*#1a0e07;/);
    expect(globalsCss).toMatch(/--color-accent-2:\s*#f4c95d;/);
    expect(globalsCss).toMatch(/--color-success:\s*#9be38a;/);
    expect(globalsCss).toMatch(/--color-warning:\s*#f4c95d;/);
    expect(globalsCss).toMatch(/--color-danger:\s*#d96152;/);
  });

  it('declares the four design-system font stacks', () => {
    expect(globalsCss).toMatch(/--font-display:\s*"Fraunces"/);
    expect(globalsCss).toMatch(/--font-sans:\s*"Inter Tight"/);
    expect(globalsCss).toMatch(/--font-mono:\s*"JetBrains Mono"/);
    expect(globalsCss).toMatch(/--font-hand:\s*"Caveat"/);
  });

  it('declares the type-scale, radius, shadow, and motion tokens', () => {
    expect(globalsCss).toMatch(/--text-xs:\s*0\.6875rem;/);
    expect(globalsCss).toMatch(/--text-base:\s*0\.9375rem;/);
    expect(globalsCss).toMatch(/--text-display:\s*6rem;/);
    expect(globalsCss).toMatch(/--radius-sm:\s*6px;/);
    expect(globalsCss).toMatch(/--radius-pill:\s*999px;/);
    expect(globalsCss).toMatch(/--shadow-sm:/);
    expect(globalsCss).toMatch(/--shadow-glow:/);
    expect(globalsCss).toMatch(/--ease-out:\s*cubic-bezier\(\.2,\.7,\.2,1\);/);
    expect(globalsCss).toMatch(/--ease-in-out:\s*cubic-bezier\(\.65,\.05,\.35,1\);/);
  });
});

describe('typography foundation — layout.tsx next/font wiring', () => {
  it('imports the four design fonts from next/font/google', () => {
    expect(layoutTsx).toMatch(/from\s+'next\/font\/google'/);
    expect(layoutTsx).toMatch(/\bFraunces\b/);
    expect(layoutTsx).toMatch(/\bInter_Tight\b/);
    expect(layoutTsx).toMatch(/\bJetBrains_Mono\b/);
    expect(layoutTsx).toMatch(/\bCaveat\b/);
  });

  it('configures all four fonts with display: swap', () => {
    for (const name of ['Fraunces', 'Inter_Tight', 'JetBrains_Mono', 'Caveat']) {
      const re = new RegExp(`${name}\\(\\{[\\s\\S]*?\\}\\)`);
      const match = layoutTsx.match(re);
      expect(match, `${name}({...}) call not found`).not.toBeNull();
      expect(match![0], `${name} missing display: 'swap'`).toMatch(/display:\s*'swap'/);
    }
  });

  it('preloads Fraunces and Inter Tight, lazy-loads JetBrains Mono and Caveat', () => {
    const fraunces = layoutTsx.match(/Fraunces\(\{[\s\S]*?\}\)/)![0];
    const interTight = layoutTsx.match(/Inter_Tight\(\{[\s\S]*?\}\)/)![0];
    const mono = layoutTsx.match(/JetBrains_Mono\(\{[\s\S]*?\}\)/)![0];
    const caveat = layoutTsx.match(/Caveat\(\{[\s\S]*?\}\)/)![0];

    expect(fraunces).toMatch(/preload:\s*true/);
    expect(interTight).toMatch(/preload:\s*true/);
    expect(mono).toMatch(/preload:\s*false/);
    expect(caveat).toMatch(/preload:\s*false/);
  });
});
