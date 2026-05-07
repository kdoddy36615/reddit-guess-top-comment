import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CommentCard, CommentReply } from './comment-card';

describe('CommentCard', () => {
  it('rank #1 uses 3px left border with accent color and 14px left padding', () => {
    render(
      <CommentCard
        rank={1}
        user="redditor_42"
        upvotes="14.2k"
        text="sounds like she's the boss now."
        data-testid="cc"
      />,
    );
    const root = screen.getByTestId('cc');
    expect(root.className).toMatch(/border-l-\[3px\]/);
    expect(root.className).toMatch(/border-accent\b/);
    expect(root.className).toMatch(/pl-\[14px\]/);
    // No rounded corners on the outer item — the rail/border is the only chrome.
    expect(root.className).not.toMatch(/rounded-/);
  });

  it('rank #2 and #3 use 3px left border with text-disabled color', () => {
    const { rerender } = render(
      <CommentCard
        rank={2}
        user="workfromhomer"
        upvotes="6.8k"
        text="RIP your career."
        data-testid="cc"
      />,
    );
    const root = screen.getByTestId('cc');
    expect(root.className).toMatch(/border-l-\[3px\]/);
    expect(root.className).toMatch(/border-text-disabled\b/);

    rerender(
      <CommentCard rank={3} user="caffeineghost" upvotes="3.1k" text="oof." data-testid="cc" />,
    );
    expect(screen.getByTestId('cc').className).toMatch(/border-text-disabled\b/);
  });

  it('renders meta row (rank chip · user · upvotes) in mono xs', () => {
    render(
      <CommentCard
        rank={1}
        user="redditor_42"
        upvotes="14.2k"
        text="sounds like she's the boss now."
        data-testid="cc"
      />,
    );
    const root = screen.getByTestId('cc');
    const meta = within(root).getByTestId('comment-meta');
    expect(meta.className).toMatch(/font-mono/);
    expect(meta.className).toMatch(/text-xs/);
    // Rank chip shows "#1".
    expect(within(meta).getByText('#1')).toBeInTheDocument();
    // User and upvotes appear in the meta row.
    expect(meta.textContent).toMatch(/u\/redditor_42/);
    expect(meta.textContent).toMatch(/14\.2k/);
  });

  it('comment text renders at 16px in ink', () => {
    render(
      <CommentCard
        rank={1}
        user="redditor_42"
        upvotes="14.2k"
        text="sounds like she's the boss now."
        data-testid="cc"
      />,
    );
    const body = screen.getByTestId('comment-text');
    expect(body.className).toMatch(/text-\[16px\]/);
    expect(body.className).toMatch(/text-text\b/);
    expect(body.textContent).toBe("sounds like she's the boss now.");
  });

  it('renders nested replies as children of the top comment', () => {
    render(
      <CommentCard
        rank={1}
        user="redditor_42"
        upvotes="14.2k"
        text="sounds like she's the boss now."
        data-testid="cc"
      >
        <CommentReply
          user="midnight_mike"
          upvotes="4.1k"
          text="promotion through cat photo…"
          data-testid="cr"
        />
      </CommentCard>,
    );
    const root = screen.getByTestId('cc');
    const reply = within(root).getByTestId('cr');
    expect(reply.textContent).toMatch(/u\/midnight_mike/);
    expect(reply.textContent).toMatch(/promotion through cat photo/);
  });

  it('forwards className and arbitrary attrs', () => {
    render(
      <CommentCard rank={1} user="u" upvotes="1" text="hi" className="extra-x" data-testid="cc" />,
    );
    expect(screen.getByTestId('cc').className).toMatch(/extra-x/);
  });
});

describe('CommentReply', () => {
  it('uses a 2px left rail (border-border-strong, hover:border-text-faint), 14px left padding, NO background, NO rounded corners', () => {
    render(
      <CommentReply
        user="midnight_mike"
        upvotes="4.1k"
        text="promotion through cat photo…"
        data-testid="cr"
      />,
    );
    const root = screen.getByTestId('cr');
    expect(root.className).toMatch(/border-l-2\b/);
    expect(root.className).toMatch(/border-border-strong\b/);
    expect(root.className).toMatch(/hover:border-text-faint\b/);
    expect(root.className).toMatch(/pl-\[14px\]/);
    // No background, no rounded — the canonical Reddit nested-comment look.
    expect(root.className).not.toMatch(/\bbg-/);
    expect(root.className).not.toMatch(/rounded-/);
  });

  it('renders meta row (user · upvotes) in mono xs and text body', () => {
    render(
      <CommentReply
        user="midnight_mike"
        upvotes="4.1k"
        text="promotion through cat photo…"
        data-testid="cr"
      />,
    );
    const root = screen.getByTestId('cr');
    const meta = within(root).getByTestId('comment-meta');
    expect(meta.className).toMatch(/font-mono/);
    expect(meta.className).toMatch(/text-xs/);
    expect(meta.textContent).toMatch(/u\/midnight_mike/);
    expect(meta.textContent).toMatch(/4\.1k/);
    expect(within(root).getByTestId('comment-text').textContent).toBe(
      'promotion through cat photo…',
    );
  });

  it('hover state darkens the rail (border-text-faint applies on hover)', () => {
    render(<CommentReply user="midnight_mike" upvotes="4.1k" text="hover me" data-testid="cr" />);
    const root = screen.getByTestId('cr');
    fireEvent.mouseEnter(root);
    // We can't assert computed CSS for :hover in jsdom, but the class must be
    // present so the hover style applies in a real browser.
    expect(root.className).toMatch(/hover:border-text-faint/);
  });

  it('supports nested replies as children (deeper rail nesting)', () => {
    render(
      <CommentReply user="alice" upvotes="1.0k" text="parent reply" data-testid="parent">
        <CommentReply user="bob" upvotes="200" text="nested reply" data-testid="child" />
      </CommentReply>,
    );
    const parent = screen.getByTestId('parent');
    expect(within(parent).getByTestId('child')).toBeInTheDocument();
  });
});
