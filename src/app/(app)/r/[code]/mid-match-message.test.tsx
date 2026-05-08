import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MidMatchMessage } from './mid-match-message';

describe('MidMatchMessage', () => {
  it('renders match-in-progress copy for live status', () => {
    render(<MidMatchMessage status="live" code="ABCDEF" />);
    const card = screen.getByTestId('mid-match-message');
    expect(card.dataset.status).toBe('live');
    expect(screen.getByRole('heading', { name: /match in progress/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to rooms/i })).toHaveAttribute('href', '/rooms');
  });

  it('renders match-over copy for ended status', () => {
    render(<MidMatchMessage status="ended" code="ABCDEF" />);
    expect(screen.getByTestId('mid-match-message').dataset.status).toBe('ended');
    expect(screen.getByRole('heading', { name: /match over/i })).toBeInTheDocument();
  });
});
