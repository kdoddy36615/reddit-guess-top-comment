import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Skeleton } from './skeleton';

describe('Skeleton', () => {
  it('renders DESIGN.md §2 base classes (surface-2 + rounded-md + animate-pulse)', () => {
    render(<Skeleton data-testid="s" />);
    const el = screen.getByTestId('s');
    expect(el.className).toMatch(/bg-surface-2/);
    expect(el.className).toMatch(/rounded-md/);
    expect(el.className).toMatch(/animate-pulse/);
  });

  it('marks itself as a busy region for assistive tech', () => {
    render(<Skeleton data-testid="s" />);
    const el = screen.getByTestId('s');
    expect(el).toHaveAttribute('aria-hidden', 'true');
  });

  it('forwards className for sizing overrides', () => {
    render(<Skeleton className="h-8 w-32" data-testid="s" />);
    const el = screen.getByTestId('s');
    expect(el.className).toMatch(/h-8/);
    expect(el.className).toMatch(/w-32/);
  });
});
