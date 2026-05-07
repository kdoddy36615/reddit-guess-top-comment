import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Card } from './card';

describe('Card', () => {
  it('renders default surface-2 + hairline border', () => {
    render(
      <Card data-testid="c">
        <p>body</p>
      </Card>,
    );
    const el = screen.getByTestId('c');
    expect(el.className).toMatch(/bg-surface-2/);
    expect(el.className).toMatch(/border-border\b/);
    expect(el.className).toMatch(/rounded-lg/);
    expect(el.textContent).toBe('body');
  });

  it('elevated variant adds shadow-md', () => {
    render(<Card variant="elevated" data-testid="c" />);
    expect(screen.getByTestId('c').className).toMatch(/shadow-md/);
  });

  it('dashed variant uses a dashed border', () => {
    render(<Card variant="dashed" data-testid="c" />);
    expect(screen.getByTestId('c').className).toMatch(/border-dashed/);
  });

  it('forwards className', () => {
    render(<Card className="extra-x" data-testid="c" />);
    expect(screen.getByTestId('c').className).toMatch(/extra-x/);
  });
});
