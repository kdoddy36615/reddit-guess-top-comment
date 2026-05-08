import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { GuessInput } from './guess-input';

describe('GuessInput', () => {
  it('renders a textarea with Caveat 22px (font-hand text-lg), leading-snug, min-h-[86px]', () => {
    render(<GuessInput value="" onChange={() => {}} onSubmit={() => {}} />);
    const ta = screen.getByRole('textbox');
    expect(ta.tagName).toBe('TEXTAREA');
    const cls = ta.className;
    expect(cls).toMatch(/font-hand/);
    expect(cls).toMatch(/text-lg/);
    expect(cls).toMatch(/leading-snug/);
    expect(cls).toMatch(/min-h-\[86px\]/);
    // Inherits orange-on-focus glow from Textarea base.
    expect(cls).toMatch(/focus:border-accent/);
  });

  it('reflects the controlled value and fires onChange with the next value', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { rerender } = render(<GuessInput value="" onChange={onChange} onSubmit={() => {}} />);
    const ta = screen.getByRole('textbox') as HTMLTextAreaElement;
    await user.type(ta, 'hi');
    expect(onChange).toHaveBeenCalled();

    rerender(<GuessInput value="hello" onChange={onChange} onSubmit={() => {}} />);
    expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('hello');
  });

  it('submits on Cmd+Enter (mac) with the current value', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<GuessInput value="my guess" onChange={() => {}} onSubmit={onSubmit} />);
    const ta = screen.getByRole('textbox');
    ta.focus();
    await user.keyboard('{Meta>}{Enter}{/Meta}');
    expect(onSubmit).toHaveBeenCalledWith('my guess');
  });

  it('submits on Ctrl+Enter (windows/linux) with the current value', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<GuessInput value="another guess" onChange={() => {}} onSubmit={onSubmit} />);
    const ta = screen.getByRole('textbox');
    ta.focus();
    await user.keyboard('{Control>}{Enter}{/Control}');
    expect(onSubmit).toHaveBeenCalledWith('another guess');
  });

  it('does not submit on a bare Enter (newline behavior preserved)', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<GuessInput value="x" onChange={() => {}} onSubmit={onSubmit} />);
    const ta = screen.getByRole('textbox');
    ta.focus();
    await user.keyboard('{Enter}');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('renders a hint row with kbd chips reading "⌘+↵ to submit"', () => {
    render(<GuessInput value="" onChange={() => {}} onSubmit={() => {}} />);
    const hint = screen.getByTestId('guess-input-hint');
    // kbd chips for the modifier and the return symbol.
    const kbds = hint.querySelectorAll('kbd');
    expect(kbds.length).toBeGreaterThanOrEqual(2);
    expect(hint.textContent).toMatch(/to submit/i);
    // Symbols rendered for cross-platform clarity.
    expect(hint.textContent).toMatch(/⌘/);
    expect(hint.textContent).toMatch(/↵/);
  });

  it('submitting state: shows a spinner, disables the textarea, marks aria-busy', () => {
    render(<GuessInput value="g" onChange={() => {}} onSubmit={() => {}} submitting />);
    const ta = screen.getByRole('textbox') as HTMLTextAreaElement;
    expect(ta).toBeDisabled();
    const spinner = screen.getByTestId('guess-input-spinner');
    expect(spinner).toBeInTheDocument();
    // No bare submit-icon rendered while submitting.
    expect(screen.queryByTestId('guess-input-submit-icon')).toBeNull();
    // Root signals busy for assistive tech.
    const root = screen.getByTestId('guess-input');
    expect(root).toHaveAttribute('aria-busy', 'true');
  });

  it('submitting state: Cmd+Enter does not re-fire onSubmit', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<GuessInput value="g" onChange={() => {}} onSubmit={onSubmit} submitting />);
    const ta = screen.getByRole('textbox');
    ta.focus();
    await user.keyboard('{Control>}{Enter}{/Control}');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('error state: danger border, helper text below, aria-invalid set', () => {
    render(
      <GuessInput value="g" onChange={() => {}} onSubmit={() => {}} error="guess can't be empty" />,
    );
    const ta = screen.getByRole('textbox');
    expect(ta).toHaveAttribute('aria-invalid', 'true');
    expect(ta.className).toMatch(/border-danger/);
    const helper = screen.getByTestId('guess-input-error');
    expect(helper.textContent).toBe("guess can't be empty");
    expect(helper.className).toMatch(/text-danger/);
    // textarea is described by the helper text.
    expect(ta.getAttribute('aria-describedby')).toBe(helper.id);
  });

  it('renders a submit-icon by default (idle, non-submitting state)', () => {
    render(<GuessInput value="" onChange={() => {}} onSubmit={() => {}} />);
    expect(screen.getByTestId('guess-input-submit-icon')).toBeInTheDocument();
    expect(screen.queryByTestId('guess-input-spinner')).toBeNull();
  });
});
