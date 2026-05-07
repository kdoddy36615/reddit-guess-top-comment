import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import DevComponentsPage from './page';

describe('/dev/components page', () => {
  it('renders a sectioned matrix with anchor nav for every primitive', () => {
    render(<DevComponentsPage />);

    // Top nav lets reviewers jump to each section.
    const nav = screen.getByRole('navigation', { name: /sections/i });
    const navHrefs = within(nav)
      .getAllByRole('link')
      .map((l) => l.getAttribute('href'));
    for (const anchor of [
      '#button',
      '#input',
      '#textarea',
      '#card',
      '#badge',
      '#avatar',
      '#skeleton',
      '#progress',
      '#dialog',
      '#toast',
      '#tabs',
      '#tooltip',
      '#round-card',
      '#guess-input',
      '#score-reveal',
    ]) {
      expect(navHrefs, `nav anchor ${anchor}`).toContain(anchor);
    }

    for (const id of [
      'button',
      'input',
      'textarea',
      'card',
      'badge',
      'avatar',
      'skeleton',
      'progress',
      'dialog',
      'toast',
      'tabs',
      'tooltip',
      'round-card',
      'guess-input',
      'score-reveal',
    ]) {
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

  it('covers Avatar: image, initial fallback, you variant, slot palette, sizes', () => {
    render(<DevComponentsPage />);
    const root = document.getElementById('avatar') as HTMLElement;
    expect(root).not.toBeNull();
    // At least one avatar of each size renders.
    for (const size of ['sm', 'md', 'lg']) {
      expect(within(root).getAllByText(new RegExp(`\\b${size}\\b`)).length).toBeGreaterThan(0);
    }
    // 'you' label and at least one image fallback row.
    expect(within(root).getAllByText(/you/i).length).toBeGreaterThan(0);
    expect(within(root).getAllByText(/initial/i).length).toBeGreaterThan(0);
    expect(within(root).getAllByText(/image/i).length).toBeGreaterThan(0);
    // Slot palette rendered (multiple slots side-by-side).
    expect(within(root).getAllByText(/slot/i).length).toBeGreaterThan(0);
  });

  it('covers Skeleton with at least one rendered placeholder', () => {
    render(<DevComponentsPage />);
    const root = document.getElementById('skeleton') as HTMLElement;
    expect(root).not.toBeNull();
    const skeletons = root.querySelectorAll('[aria-hidden="true"].animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('mounts the four overlay primitives (dialog, toast, tabs, tooltip)', () => {
    render(<DevComponentsPage />);
    // Dialog section has the trigger button (closed by default).
    const dialog = document.getElementById('dialog') as HTMLElement;
    expect(within(dialog).getByRole('button', { name: /open dialog/i })).toBeInTheDocument();

    // Toast section has its trigger button + the live region (Toaster).
    const toast = document.getElementById('toast') as HTMLElement;
    expect(within(toast).getByRole('button', { name: /fire default/i })).toBeInTheDocument();
    expect(within(toast).getByRole('region', { name: /notifications/i })).toBeInTheDocument();

    // Tabs section has a tablist with three triggers.
    const tabs = document.getElementById('tabs') as HTMLElement;
    expect(within(tabs).getByRole('tablist')).toBeInTheDocument();
    expect(within(tabs).getAllByRole('tab').length).toBeGreaterThanOrEqual(3);

    // Tooltip section has trigger buttons (tip itself is closed at rest).
    const tooltip = document.getElementById('tooltip') as HTMLElement;
    expect(within(tooltip).getAllByRole('button').length).toBeGreaterThanOrEqual(2);
  });

  it('covers RoundCard with four example states (image / no image / body / title-only)', () => {
    render(<DevComponentsPage />);
    const root = document.getElementById('round-card') as HTMLElement;
    expect(root).not.toBeNull();
    // Four labelled example states.
    for (const label of ['with image', 'without image', 'with body', 'title-only']) {
      expect(within(root).getAllByText(new RegExp(label, 'i')).length).toBeGreaterThan(0);
    }
    // Exactly one image placeholder rendered (only the "with image" example).
    const placeholders = root.querySelectorAll('[data-testid="round-card-image"]');
    expect(placeholders.length).toBe(1);
    // At least one body slot rendered ("with body" + "with image" both have a body).
    const bodies = root.querySelectorAll('[data-testid="round-card-body"]');
    expect(bodies.length).toBeGreaterThanOrEqual(1);
    // Multiple titles rendered as headings.
    expect(within(root).getAllByRole('heading').length).toBeGreaterThanOrEqual(4);
  });

  it('covers GuessInput with default / typing / submitting / error examples', () => {
    render(<DevComponentsPage />);
    const root = document.getElementById('guess-input') as HTMLElement;
    expect(root).not.toBeNull();
    for (const label of ['default', 'typing', 'submitting', 'error']) {
      expect(within(root).getAllByText(new RegExp(label, 'i')).length).toBeGreaterThan(0);
    }
    const textareas = root.querySelectorAll('textarea');
    expect(textareas.length).toBe(4);
    // The submitting example has aria-busy on its root.
    const busyRoots = root.querySelectorAll('[data-testid="guess-input"][aria-busy="true"]');
    expect(busyRoots.length).toBe(1);
    // The error example has helper text.
    expect(within(root).getAllByTestId('guess-input-error').length).toBe(1);
  });

  it('covers ScoreReveal with one example per band (bullseye / close / almost / way off)', () => {
    render(<DevComponentsPage />);
    const root = document.getElementById('score-reveal') as HTMLElement;
    expect(root).not.toBeNull();
    for (const label of ['bullseye', 'close', 'almost', 'way off']) {
      expect(within(root).getAllByText(new RegExp(label, 'i')).length).toBeGreaterThan(0);
    }
    const reveals = root.querySelectorAll('[data-testid="score-reveal"]');
    expect(reveals.length).toBe(4);
    const bands = Array.from(reveals).map((el) => el.getAttribute('data-band'));
    expect(new Set(bands)).toEqual(new Set(['bullseye', 'close', 'almost', 'way_off']));
  });

  it('covers Progress (round pips): full pending → partial → complete examples', () => {
    render(<DevComponentsPage />);
    const root = document.getElementById('progress') as HTMLElement;
    expect(root).not.toBeNull();
    const bars = root.querySelectorAll('[role="progressbar"]');
    expect(bars.length).toBeGreaterThanOrEqual(3);
    // At least one fully-pending and one partial example exist.
    const allowedStates = new Set(['done', 'now', 'pending']);
    const seenStates = new Set<string>();
    for (const bar of Array.from(bars)) {
      for (const pip of Array.from(bar.querySelectorAll('[data-state]'))) {
        const s = pip.getAttribute('data-state') ?? '';
        if (allowedStates.has(s)) seenStates.add(s);
      }
    }
    expect(seenStates).toEqual(new Set(['done', 'now', 'pending']));
  });
});
