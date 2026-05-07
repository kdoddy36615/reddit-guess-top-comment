import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Tooltip } from './tooltip';

describe('Tooltip', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not render the tooltip content initially', () => {
    render(
      <Tooltip content="hello">
        <button type="button">trigger</button>
      </Tooltip>,
    );
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('renders the tooltip after the 400ms delay on hover', () => {
    render(
      <Tooltip content="hello">
        <button type="button">trigger</button>
      </Tooltip>,
    );
    const trigger = screen.getByText('trigger');
    act(() => {
      fireEvent.mouseEnter(trigger);
    });
    expect(screen.queryByRole('tooltip')).toBeNull();
    act(() => {
      vi.advanceTimersByTime(399);
    });
    expect(screen.queryByRole('tooltip')).toBeNull();
    act(() => {
      vi.advanceTimersByTime(2);
    });
    expect(screen.getByRole('tooltip')).toHaveTextContent('hello');
  });

  it('hides the tooltip on mouse leave', () => {
    render(
      <Tooltip content="hello">
        <button type="button">trigger</button>
      </Tooltip>,
    );
    const trigger = screen.getByText('trigger');
    act(() => {
      fireEvent.mouseEnter(trigger);
      vi.advanceTimersByTime(500);
    });
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    act(() => {
      fireEvent.mouseLeave(trigger);
    });
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('opens immediately on focus when keyboard delay is 0 (default focus path)', () => {
    render(
      <Tooltip content="hello">
        <button type="button">trigger</button>
      </Tooltip>,
    );
    const trigger = screen.getByText('trigger');
    act(() => {
      fireEvent.focus(trigger);
      vi.advanceTimersByTime(500);
    });
    expect(screen.getByRole('tooltip')).toHaveTextContent('hello');
  });

  it('honors a custom delay', () => {
    render(
      <Tooltip content="hi" delayMs={100}>
        <button type="button">trigger</button>
      </Tooltip>,
    );
    const trigger = screen.getByText('trigger');
    act(() => {
      fireEvent.mouseEnter(trigger);
      vi.advanceTimersByTime(101);
    });
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
  });

  it('applies surface-2 + border-strong + text-muted + xs token classes', () => {
    render(
      <Tooltip content="hello">
        <button type="button">trigger</button>
      </Tooltip>,
    );
    act(() => {
      fireEvent.mouseEnter(screen.getByText('trigger'));
      vi.advanceTimersByTime(500);
    });
    const tip = screen.getByRole('tooltip');
    expect(tip.className).toMatch(/bg-surface-2\b/);
    expect(tip.className).toMatch(/border-border-strong\b/);
    expect(tip.className).toMatch(/text-text-muted\b/);
    expect(tip.className).toMatch(/text-xs\b/);
    expect(tip.className).toMatch(/rounded-md\b/);
  });

  it('wires aria-describedby on the trigger when open', () => {
    render(
      <Tooltip content="hello">
        <button type="button">trigger</button>
      </Tooltip>,
    );
    const trigger = screen.getByText('trigger') as HTMLButtonElement;
    act(() => {
      fireEvent.mouseEnter(trigger);
      vi.advanceTimersByTime(500);
    });
    const id = trigger.getAttribute('aria-describedby');
    expect(id).toBeTruthy();
    expect(document.getElementById(id as string)?.textContent).toBe('hello');
  });

  it('hides on Escape', () => {
    render(
      <Tooltip content="hello">
        <button type="button">trigger</button>
      </Tooltip>,
    );
    const trigger = screen.getByText('trigger');
    act(() => {
      fireEvent.mouseEnter(trigger);
      vi.advanceTimersByTime(500);
    });
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    act(() => {
      fireEvent.keyDown(window, { key: 'Escape' });
    });
    expect(screen.queryByRole('tooltip')).toBeNull();
  });
});
