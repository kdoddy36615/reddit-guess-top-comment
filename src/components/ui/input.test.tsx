import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Input } from './input';

describe('Input', () => {
  it('renders an <input> with surface-3 default styles and a focus ring', () => {
    render(<Input placeholder="guess" />);
    const el = screen.getByPlaceholderText('guess');
    expect(el.tagName).toBe('INPUT');
    const cls = el.className;
    expect(cls).toMatch(/bg-surface-3/);
    expect(cls).toMatch(/border-border-strong/);
    expect(cls).toMatch(/rounded-md/);
    expect(cls).toMatch(/focus:border-accent/);
  });

  it('applies error styles and sets aria-invalid when error=true', () => {
    render(<Input error placeholder="g" />);
    const el = screen.getByPlaceholderText('g');
    expect(el).toHaveAttribute('aria-invalid', 'true');
    expect(el.className).toMatch(/border-danger/);
  });

  it('respects the disabled prop and dims the field', () => {
    render(<Input disabled placeholder="g" />);
    const el = screen.getByPlaceholderText('g');
    expect(el).toBeDisabled();
    expect(el.className).toMatch(/disabled:opacity-50/);
    expect(el.className).toMatch(/disabled:cursor-not-allowed/);
  });

  it('forwards className and arbitrary props', () => {
    render(<Input className="x-extra" data-testid="i" name="email" />);
    const el = screen.getByTestId('i');
    expect(el.className).toMatch(/x-extra/);
    expect(el).toHaveAttribute('name', 'email');
  });
});
