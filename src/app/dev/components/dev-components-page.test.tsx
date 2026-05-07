import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import DevComponentsPage from './page';

describe('/dev/components page', () => {
  it('renders a sectioned matrix with anchor nav for every primitive', () => {
    render(<DevComponentsPage />);

    // Top nav lets reviewers jump to each section.
    const nav = screen.getByRole('navigation', { name: /sections/i });
    for (const anchor of ['#button', '#input', '#textarea', '#card', '#badge']) {
      expect(
        within(nav).getByRole('link', { name: new RegExp(anchor.slice(1), 'i') }),
      ).toHaveAttribute('href', anchor);
    }

    for (const id of ['button', 'input', 'textarea', 'card', 'badge']) {
      const section = document.getElementById(id);
      expect(section, `section #${id} missing`).not.toBeNull();
    }
  });

  it('covers every Button variant × size × state combination', () => {
    render(<DevComponentsPage />);
    const section = document.getElementById('button');
    expect(section).not.toBeNull();
    const root = section as HTMLElement;

    const variants = ['primary', 'secondary', 'ghost', 'danger'];
    const sizes = ['sm', 'md', 'lg', 'icon'];
    const states = ['default', 'hover', 'focus-visible', 'active', 'disabled', 'loading'];

    for (const v of variants) {
      expect(within(root).getByRole('heading', { level: 3, name: v })).toBeInTheDocument();
    }
    for (const s of sizes) {
      expect(within(root).getAllByText(new RegExp(`\\b${s}\\b`)).length).toBeGreaterThan(0);
    }
    for (const st of states) {
      expect(within(root).getAllByText(new RegExp(st)).length).toBeGreaterThan(0);
    }
  });

  it('covers Input + Textarea: default / focus / error / disabled', () => {
    render(<DevComponentsPage />);
    for (const id of ['input', 'textarea']) {
      const section = document.getElementById(id);
      expect(section, `#${id}`).not.toBeNull();
      const root = section as HTMLElement;
      for (const state of ['default', 'focus', 'error', 'disabled']) {
        expect(within(root).getAllByText(new RegExp(state, 'i')).length).toBeGreaterThan(0);
      }
    }
  });

  it('covers Card variants: default / elevated / dashed', () => {
    render(<DevComponentsPage />);
    const root = document.getElementById('card') as HTMLElement;
    expect(root).not.toBeNull();
    for (const variant of ['default', 'elevated', 'dashed']) {
      expect(within(root).getAllByText(new RegExp(variant, 'i')).length).toBeGreaterThan(0);
    }
  });

  it('covers Badge variants: default / accent / gold / success / danger', () => {
    render(<DevComponentsPage />);
    const root = document.getElementById('badge') as HTMLElement;
    expect(root).not.toBeNull();
    for (const variant of ['default', 'accent', 'gold', 'success', 'danger']) {
      expect(within(root).getAllByText(new RegExp(variant, 'i')).length).toBeGreaterThan(0);
    }
  });
});
