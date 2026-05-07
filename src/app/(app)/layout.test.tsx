import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import AppLayout from './layout';

describe('(app) route group layout', () => {
  it('renders AppBar + main + footer landmarks around its children', () => {
    render(
      <AppLayout>
        <p data-testid="page">page body</p>
      </AppLayout>,
    );
    expect(screen.getByRole('banner')).toBeInTheDocument();
    const main = screen.getByRole('main');
    expect(within(main).getByTestId('page')).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });

  it('main flex-grows so footer sits at the page bottom', () => {
    render(
      <AppLayout>
        <p>page</p>
      </AppLayout>,
    );
    expect(screen.getByRole('main').className).toMatch(/flex-1/);
  });

  it('main container matches DESIGN.md §3 stepped widths (600 / 880 / 1100px)', () => {
    render(
      <AppLayout>
        <p>page</p>
      </AppLayout>,
    );
    const main = screen.getByRole('main');
    // mx-auto + responsive max-w stops + horizontal padding (4 mobile, 6 ≥md).
    expect(main.className).toMatch(/\bmx-auto\b/);
    expect(main.className).toMatch(/\bpx-4\b/);
    expect(main.className).toMatch(/\bmd:px-6\b/);
    expect(main.className).toMatch(/sm:max-w-\[600px\]/);
    expect(main.className).toMatch(/lg:max-w-\[880px\]/);
    expect(main.className).toMatch(/xl:max-w-content/);
  });

  it('avatar slot is empty until slice 6 ships AvatarMenu', () => {
    render(
      <AppLayout>
        <p>page</p>
      </AppLayout>,
    );
    expect(screen.getByTestId('app-bar-avatar-slot').textContent).toBe('');
  });
});
