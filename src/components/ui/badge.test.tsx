import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Badge } from './badge';

describe('Badge', () => {
  it('default variant uses surface bg and muted text', () => {
    render(<Badge data-testid="b">12</Badge>);
    const el = screen.getByTestId('b');
    expect(el.tagName).toBe('SPAN');
    const cls = el.className;
    expect(cls).toMatch(/rounded-pill/);
    expect(cls).toMatch(/font-mono/);
    expect(cls).toMatch(/bg-surface\b/);
    expect(cls).toMatch(/text-text-muted/);
  });

  it('accent variant tints with the orange palette', () => {
    render(<Badge variant="accent" data-testid="b" />);
    expect(screen.getByTestId('b').className).toMatch(/text-accent/);
  });

  it('gold variant uses accent-2', () => {
    render(<Badge variant="gold" data-testid="b" />);
    expect(screen.getByTestId('b').className).toMatch(/text-accent-2/);
  });

  it('success variant uses success token', () => {
    render(<Badge variant="success" data-testid="b" />);
    expect(screen.getByTestId('b').className).toMatch(/text-success/);
  });

  it('danger variant uses danger token', () => {
    render(<Badge variant="danger" data-testid="b" />);
    expect(screen.getByTestId('b').className).toMatch(/text-danger/);
  });
});
