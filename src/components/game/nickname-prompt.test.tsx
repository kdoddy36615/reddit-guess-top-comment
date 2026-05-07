import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { NicknamePrompt } from './nickname-prompt';

describe('NicknamePrompt', () => {
  it('renders an input pre-filled with the supplied generated nickname', () => {
    render(<NicknamePrompt initialNickname="brave fox" onSubmit={() => {}} />);
    const input = screen.getByLabelText(/nickname/i) as HTMLInputElement;
    expect(input.value).toBe('brave fox');
  });

  it('renders a "use a different one" / regenerate control', () => {
    render(<NicknamePrompt initialNickname="brave fox" onSubmit={() => {}} />);
    const regen = screen.getByRole('button', { name: /shuffle|new|different|regenerate/i });
    expect(regen).toBeInTheDocument();
  });

  it('clicking regenerate replaces the input value with a freshly generated nickname', async () => {
    const user = userEvent.setup();
    const generator = vi.fn().mockReturnValueOnce('clever fox').mockReturnValueOnce('lucky bear');
    render(
      <NicknamePrompt
        initialNickname="brave fox"
        onSubmit={() => {}}
        generateNickname={generator}
      />,
    );
    const input = screen.getByLabelText(/nickname/i) as HTMLInputElement;
    const regen = screen.getByRole('button', { name: /shuffle|new|different|regenerate/i });
    await user.click(regen);
    expect(generator).toHaveBeenCalledTimes(1);
    expect(input.value).toBe('clever fox');
    await user.click(regen);
    expect(input.value).toBe('lucky bear');
  });

  it('calls onSubmit with the normalized nickname when valid', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<NicknamePrompt initialNickname="" onSubmit={onSubmit} />);
    const input = screen.getByLabelText(/nickname/i) as HTMLInputElement;
    await user.clear(input);
    await user.type(input, '  kevin  ');
    const submit = screen.getByRole('button', { name: /continue|use this|confirm|let's go/i });
    await user.click(submit);
    expect(onSubmit).toHaveBeenCalledWith('kevin');
  });

  it('shows an error message and does not call onSubmit when validation fails', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<NicknamePrompt initialNickname="" onSubmit={onSubmit} />);
    const input = screen.getByLabelText(/nickname/i);
    await user.clear(input);
    await user.type(input, 'a');
    const submit = screen.getByRole('button', { name: /continue|use this|confirm|let's go/i });
    await user.click(submit);
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByTestId('nickname-prompt-error')).toBeInTheDocument();
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });

  it('shows a profanity-specific error message for blocklisted input', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<NicknamePrompt initialNickname="" onSubmit={onSubmit} />);
    const input = screen.getByLabelText(/nickname/i);
    await user.clear(input);
    await user.type(input, 'shitposter');
    const submit = screen.getByRole('button', { name: /continue|use this|confirm|let's go/i });
    await user.click(submit);
    expect(onSubmit).not.toHaveBeenCalled();
    const err = screen.getByTestId('nickname-prompt-error');
    // Profanity message should explicitly distinguish itself from
    // a generic length error so users know what to fix.
    expect(err.textContent?.toLowerCase()).toMatch(/word|allowed|pick/);
  });

  it('clears a previous error after the user fixes the input', async () => {
    const user = userEvent.setup();
    render(<NicknamePrompt initialNickname="" onSubmit={() => {}} />);
    const input = screen.getByLabelText(/nickname/i);
    const submit = screen.getByRole('button', { name: /continue|use this|confirm|let's go/i });
    await user.clear(input);
    await user.type(input, 'a');
    await user.click(submit);
    expect(screen.queryByTestId('nickname-prompt-error')).toBeInTheDocument();

    await user.clear(input);
    await user.type(input, 'kevin');
    expect(screen.queryByTestId('nickname-prompt-error')).toBeNull();
  });

  it('disables the submit while pending', () => {
    render(<NicknamePrompt initialNickname="brave fox" onSubmit={() => {}} pending />);
    const submit = screen.getByRole('button', { name: /continue|use this|confirm|let's go/i });
    expect(submit).toBeDisabled();
  });

  it('falls back to its own nickname generator when none is supplied', async () => {
    const user = userEvent.setup();
    render(<NicknamePrompt initialNickname="brave fox" onSubmit={() => {}} />);
    const input = screen.getByLabelText(/nickname/i) as HTMLInputElement;
    const before = input.value;
    const regen = screen.getByRole('button', { name: /shuffle|new|different|regenerate/i });
    // Click many times to be confident it changed at least once. The default
    // generator picks two words at random, so within ~20 clicks the value
    // is overwhelmingly likely to differ from the initial value.
    for (let i = 0; i < 20; i += 1) {
      await user.click(regen);
      if (input.value !== before) return;
    }
    throw new Error(`regenerate never changed the input from "${before}"`);
  });
});
