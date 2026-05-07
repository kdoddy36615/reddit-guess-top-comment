import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Textarea } from './textarea';

describe('Textarea', () => {
  it('renders a <textarea> with non-resizable surface-3 styles + min-h', () => {
    render(<Textarea placeholder="g" />);
    const el = screen.getByPlaceholderText('g');
    expect(el.tagName).toBe('TEXTAREA');
    const cls = el.className;
    expect(cls).toMatch(/bg-surface-3/);
    expect(cls).toMatch(/border-border-strong/);
    expect(cls).toMatch(/resize-none/);
    expect(cls).toMatch(/min-h-\[86px\]/);
    expect(cls).toMatch(/focus:border-accent/);
  });

  it('applies error styles and sets aria-invalid when error=true', () => {
    render(<Textarea error placeholder="g" />);
    const el = screen.getByPlaceholderText('g');
    expect(el).toHaveAttribute('aria-invalid', 'true');
    expect(el.className).toMatch(/border-danger/);
  });

  it('respects the disabled prop', () => {
    render(<Textarea disabled placeholder="g" />);
    const el = screen.getByPlaceholderText('g');
    expect(el).toBeDisabled();
    expect(el.className).toMatch(/disabled:opacity-50/);
  });
});
