import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';

function Harness({ defaultValue = 'today' }: { defaultValue?: string }) {
  return (
    <Tabs defaultValue={defaultValue}>
      <TabsList aria-label="leaderboard scope">
        <TabsTrigger value="today">today</TabsTrigger>
        <TabsTrigger value="week">week</TabsTrigger>
        <TabsTrigger value="all-time">all-time</TabsTrigger>
      </TabsList>
      <TabsContent value="today">today panel</TabsContent>
      <TabsContent value="week">week panel</TabsContent>
      <TabsContent value="all-time">all-time panel</TabsContent>
    </Tabs>
  );
}

describe('Tabs', () => {
  it('renders the active panel for the default value', () => {
    render(<Harness />);
    expect(screen.getByText('today panel')).toBeInTheDocument();
    expect(screen.queryByText('week panel')).toBeNull();
  });

  it('switches active panel on trigger click', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('tab', { name: 'week' }));
    expect(screen.getByText('week panel')).toBeInTheDocument();
    expect(screen.queryByText('today panel')).toBeNull();
  });

  it('uses pill style on the active trigger (accent-soft + accent text)', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const activeNow = screen.getByRole('tab', { name: 'today' });
    expect(activeNow.className).toMatch(/bg-accent-soft\b/);
    expect(activeNow.className).toMatch(/text-accent\b/);
    expect(activeNow.className).toMatch(/rounded-pill\b/);

    await user.click(screen.getByRole('tab', { name: 'week' }));
    const newActive = screen.getByRole('tab', { name: 'week' });
    expect(newActive.className).toMatch(/bg-accent-soft\b/);
    expect(newActive.className).toMatch(/text-accent\b/);
  });

  it('uses muted style on inactive triggers', () => {
    render(<Harness />);
    const inactive = screen.getByRole('tab', { name: 'week' });
    expect(inactive.className).toMatch(/bg-surface\b/);
    expect(inactive.className).toMatch(/text-text-muted\b/);
    expect(inactive.className).not.toMatch(/border-b-2/);
  });

  it('exposes ARIA roles, aria-selected, and aria-controls wiring', () => {
    render(<Harness />);
    const list = screen.getByRole('tablist');
    expect(list).toBeInTheDocument();
    const today = screen.getByRole('tab', { name: 'today' });
    expect(today).toHaveAttribute('aria-selected', 'true');
    const week = screen.getByRole('tab', { name: 'week' });
    expect(week).toHaveAttribute('aria-selected', 'false');
    const controls = today.getAttribute('aria-controls');
    expect(controls).toBeTruthy();
    expect(document.getElementById(controls as string)?.textContent).toBe('today panel');
  });

  it('navigates triggers with arrow keys (right/left)', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const today = screen.getByRole('tab', { name: 'today' });
    today.focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByText('week panel')).toBeInTheDocument();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByText('all-time panel')).toBeInTheDocument();
    await user.keyboard('{ArrowLeft}');
    expect(screen.getByText('week panel')).toBeInTheDocument();
  });

  it('wraps arrow nav at the ends', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const today = screen.getByRole('tab', { name: 'today' });
    today.focus();
    await user.keyboard('{ArrowLeft}');
    expect(screen.getByText('all-time panel')).toBeInTheDocument();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByText('today panel')).toBeInTheDocument();
  });
});
