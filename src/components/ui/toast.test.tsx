import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { __resetToasts, Toaster, useToast } from './toast';

function Harness({
  message = 'saved',
  variant,
  duration,
}: {
  message?: string;
  variant?: 'default' | 'error';
  duration?: number;
}) {
  const { toast } = useToast();
  return (
    <button type="button" onClick={() => toast({ title: message, variant, durationMs: duration })}>
      fire
    </button>
  );
}

describe('useToast + Toaster', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    __resetToasts();
  });
  afterEach(() => {
    vi.useRealTimers();
    __resetToasts();
  });

  it('renders the toast after toast() is called', async () => {
    render(
      <>
        <Toaster />
        <Harness message="saved" />
      </>,
    );
    expect(screen.queryByText('saved')).toBeNull();
    act(() => {
      fireEvent.click(screen.getByText('fire'));
    });
    expect(screen.getByText('saved')).toBeInTheDocument();
  });

  it('auto-dismisses default toasts after 4000ms', async () => {
    render(
      <>
        <Toaster />
        <Harness message="hello" />
      </>,
    );
    act(() => {
      fireEvent.click(screen.getByText('fire'));
    });
    expect(screen.getByText('hello')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(3999);
    });
    expect(screen.getByText('hello')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(2);
    });
    expect(screen.queryByText('hello')).toBeNull();
  });

  it('auto-dismisses error toasts after 6000ms', async () => {
    render(
      <>
        <Toaster />
        <Harness message="boom" variant="error" />
      </>,
    );
    act(() => {
      fireEvent.click(screen.getByText('fire'));
    });
    act(() => {
      vi.advanceTimersByTime(4001);
    });
    expect(screen.getByText('boom')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.queryByText('boom')).toBeNull();
  });

  it('honors a custom durationMs', async () => {
    render(
      <>
        <Toaster />
        <Harness message="quick" duration={1000} />
      </>,
    );
    act(() => {
      fireEvent.click(screen.getByText('fire'));
    });
    act(() => {
      vi.advanceTimersByTime(1001);
    });
    expect(screen.queryByText('quick')).toBeNull();
  });

  it('renders the region with role=region and aria-live polite', () => {
    render(<Toaster />);
    const region = screen.getByRole('region', { name: /notifications/i });
    expect(region).toHaveAttribute('aria-live', 'polite');
  });

  it('positions the region top-right on desktop, bottom-center on mobile', () => {
    render(<Toaster />);
    const region = screen.getByRole('region', { name: /notifications/i });
    // Mobile-first: bottom-center
    expect(region.className).toMatch(/bottom-/);
    expect(region.className).toMatch(/left-1\/2/);
    // Desktop overrides: top-right
    expect(region.className).toMatch(/sm:top-/);
    expect(region.className).toMatch(/sm:right-/);
  });

  it('toast items use surface-2 + border-strong + rounded-lg', async () => {
    render(
      <>
        <Toaster />
        <Harness />
      </>,
    );
    act(() => {
      fireEvent.click(screen.getByText('fire'));
    });
    const item = screen.getByText('saved').closest('[data-toast-item]');
    expect(item).not.toBeNull();
    expect(item?.className).toMatch(/bg-surface-2\b/);
    expect(item?.className).toMatch(/border-border-strong\b/);
    expect(item?.className).toMatch(/rounded-lg\b/);
  });
});
