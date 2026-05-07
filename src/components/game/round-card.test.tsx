import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RoundCard } from './round-card';

describe('RoundCard', () => {
  it('renders header row: r/{subreddit} (accent) · age · upvotes (mono xs)', () => {
    render(
      <RoundCard
        subreddit="tifu"
        age="8h"
        upvotes="24.1k"
        title="TIFU by texting my boss a photo"
        data-testid="rc"
      />,
    );

    const sub = screen.getByText('r/tifu');
    expect(sub.className).toMatch(/text-accent/);

    const header = sub.closest('header');
    expect(header, 'header element wraps the meta row').not.toBeNull();
    expect(header?.className).toMatch(/font-mono/);
    expect(header?.className).toMatch(/text-xs/);
    expect(header?.textContent).toMatch(/r\/tifu/);
    expect(header?.textContent).toMatch(/8h/);
    expect(header?.textContent).toMatch(/24\.1k/);
  });

  it('title uses Fraunces 600 with text-balance and breakpoint sizes (19px → 26px)', () => {
    render(
      <RoundCard
        subreddit="tifu"
        age="8h"
        upvotes="24.1k"
        title="TIFU by texting my boss a photo"
      />,
    );
    const title = screen.getByRole('heading', { name: /TIFU by texting/i });
    expect(title.className).toMatch(/font-display/);
    expect(title.className).toMatch(/font-semibold/);
    expect(title.className).toMatch(/leading-tight/);
    expect(title.className).toMatch(/text-balance/);
    // mobile-first 19px arbitrary, desktop 26px via the text-xl token (1.625rem = 26px).
    expect(title.className).toMatch(/text-\[19px\]/);
    expect(title.className).toMatch(/md:text-xl/);
  });

  it('omits body when prop is not provided; renders muted 14px body when present', () => {
    const { rerender } = render(
      <RoundCard subreddit="tifu" age="8h" upvotes="24.1k" title="title" />,
    );
    expect(screen.queryByTestId('round-card-body')).toBeNull();

    rerender(
      <RoundCard
        subreddit="tifu"
        age="8h"
        upvotes="24.1k"
        title="title"
        body="Title says it all. Was half asleep."
      />,
    );
    const body = screen.getByTestId('round-card-body');
    expect(body.className).toMatch(/text-text-muted/);
    expect(body.className).toMatch(/text-\[14px\]/);
    expect(body.textContent).toBe('Title says it all. Was half asleep.');
  });

  it('omits image placeholder unless imageUrl is provided; renders 16:9 surface-3 placeholder when set', () => {
    const { rerender } = render(
      <RoundCard subreddit="tifu" age="8h" upvotes="24.1k" title="title" />,
    );
    expect(screen.queryByTestId('round-card-image')).toBeNull();

    rerender(
      <RoundCard
        subreddit="tifu"
        age="8h"
        upvotes="24.1k"
        title="title"
        imageUrl="https://example.com/img.jpg"
      />,
    );
    const img = screen.getByTestId('round-card-image');
    expect(img.className).toMatch(/aspect-\[16\/9\]/);
    expect(img.className).toMatch(/bg-surface-3/);
    expect(img.getAttribute('style') ?? '').toMatch(/repeating-linear-gradient/);
  });

  it('forwards className and uses surface-2 card with hairline border', () => {
    render(
      <RoundCard
        subreddit="tifu"
        age="8h"
        upvotes="24.1k"
        title="title"
        className="extra-x"
        data-testid="rc"
      />,
    );
    const root = screen.getByTestId('rc');
    expect(root.className).toMatch(/bg-surface-2/);
    expect(root.className).toMatch(/border-border\b/);
    expect(root.className).toMatch(/rounded-lg/);
    expect(root.className).toMatch(/extra-x/);
  });
});
