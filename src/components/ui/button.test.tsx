import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Button } from './button';

describe('Button', () => {
  it('renders as a <button> by default with secondary/md variants', () => {
    render(<Button>click me</Button>);
    const btn = screen.getByRole('button', { name: 'click me' });
    expect(btn.tagName).toBe('BUTTON');
    // secondary uses surface-2 background
    expect(btn.className).toMatch(/bg-surface-2/);
    // md is the default size
    expect(btn.className).toMatch(/h-10/);
  });

  it('applies all four visual variants', () => {
    const { rerender } = render(<Button variant="primary">p</Button>);
    expect(screen.getByRole('button').className).toMatch(/bg-accent\b/);

    rerender(<Button variant="secondary">s</Button>);
    expect(screen.getByRole('button').className).toMatch(/bg-surface-2/);

    rerender(<Button variant="ghost">g</Button>);
    expect(screen.getByRole('button').className).toMatch(/bg-transparent/);

    rerender(<Button variant="danger">d</Button>);
    expect(screen.getByRole('button').className).toMatch(/bg-danger/);
  });

  it('applies all four sizes', () => {
    const { rerender } = render(<Button size="sm">s</Button>);
    expect(screen.getByRole('button').className).toMatch(/h-8/);

    rerender(<Button size="md">m</Button>);
    expect(screen.getByRole('button').className).toMatch(/h-10/);

    rerender(<Button size="lg">l</Button>);
    expect(screen.getByRole('button').className).toMatch(/h-12/);

    rerender(
      <Button size="icon" aria-label="x">
        x
      </Button>,
    );
    expect(screen.getByRole('button').className).toMatch(/h-9/);
    expect(screen.getByRole('button').className).toMatch(/w-9/);
  });

  it('exposes a focus-visible accent ring with bg offset (a11y baseline)', () => {
    render(<Button>focus</Button>);
    const cls = screen.getByRole('button').className;
    expect(cls).toMatch(/focus-visible:ring-2/);
    expect(cls).toMatch(/focus-visible:ring-accent/);
    expect(cls).toMatch(/focus-visible:ring-offset-2/);
    expect(cls).toMatch(/focus-visible:ring-offset-bg/);
  });

  it('honors disabled and loading states', () => {
    const { rerender } = render(<Button disabled>x</Button>);
    expect(screen.getByRole('button')).toBeDisabled();

    rerender(<Button loading>save</Button>);
    const btn = screen.getByRole('button');
    expect(btn).toHaveAttribute('aria-busy', 'true');
    expect(btn).toBeDisabled();
    // spinner element is rendered with role + aria-hidden
    expect(btn.querySelector('[data-slot="spinner"]')).not.toBeNull();
  });

  it('forwards className and arbitrary props', () => {
    render(
      <Button className="custom-x" data-testid="b" type="submit">
        s
      </Button>,
    );
    const btn = screen.getByTestId('b');
    expect(btn.className).toMatch(/custom-x/);
    expect(btn).toHaveAttribute('type', 'submit');
  });
});
