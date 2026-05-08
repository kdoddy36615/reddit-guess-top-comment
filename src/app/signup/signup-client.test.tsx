import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { __resetToasts } from '@/components/ui/toast';
import { SignupClient } from './signup-client';

const mockReplace = vi.fn();
const mockRefresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace, refresh: mockRefresh, push: vi.fn() }),
}));

const mockSignUp = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
  getSupabaseBrowserClient: () => ({
    auth: { signUp: mockSignUp },
  }),
}));

beforeEach(() => {
  __resetToasts();
  mockReplace.mockReset();
  mockRefresh.mockReset();
  mockSignUp.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('SignupClient', () => {
  it('renders email and password fields plus a submit button', () => {
    render(<SignupClient nextPath="/" />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign up|create account/i })).toBeInTheDocument();
  });

  it('does NOT render a forgot-password link (deferred per PRD)', () => {
    render(<SignupClient nextPath="/" />);
    expect(screen.queryByText(/forgot password/i)).toBeNull();
  });

  it('calls supabase signUp with the entered email + password and redirects on success', async () => {
    const user = userEvent.setup();
    mockSignUp.mockResolvedValue({
      data: { user: { id: 'u1', is_anonymous: false } },
      error: null,
    });
    render(<SignupClient nextPath="/" />);

    await user.type(screen.getByLabelText(/email/i), 'kev@example.com');
    await user.type(screen.getByLabelText(/password/i), 'hunter22hunter');
    await user.click(screen.getByRole('button', { name: /sign up|create account/i }));

    expect(mockSignUp).toHaveBeenCalledWith({
      email: 'kev@example.com',
      password: 'hunter22hunter',
    });
    expect(mockReplace).toHaveBeenCalledWith('/');
  });

  it('renders inline helper text when signup fails', async () => {
    const user = userEvent.setup();
    mockSignUp.mockResolvedValue({
      data: null,
      error: { message: 'User already registered' },
    });
    render(<SignupClient nextPath="/" />);

    await user.type(screen.getByLabelText(/email/i), 'kev@example.com');
    await user.type(screen.getByLabelText(/password/i), 'hunter22hunter');
    await user.click(screen.getByRole('button', { name: /sign up|create account/i }));

    const inline = await screen.findByTestId('signup-error');
    expect(inline.textContent).toMatch(/user already registered/i);
    expect(screen.getByLabelText(/email/i)).toHaveAttribute('aria-invalid', 'true');
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('rejects an obviously bad email inline without calling Supabase', async () => {
    const user = userEvent.setup();
    render(<SignupClient nextPath="/" />);

    await user.type(screen.getByLabelText(/email/i), 'not-an-email');
    await user.type(screen.getByLabelText(/password/i), 'hunter22hunter');
    await user.click(screen.getByRole('button', { name: /sign up|create account/i }));

    const inline = await screen.findByTestId('signup-error');
    expect(inline.textContent).toMatch(/valid email/i);
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('rejects a too-short password inline without calling Supabase', async () => {
    const user = userEvent.setup();
    render(<SignupClient nextPath="/" />);

    await user.type(screen.getByLabelText(/email/i), 'kev@example.com');
    await user.type(screen.getByLabelText(/password/i), 'short');
    await user.click(screen.getByRole('button', { name: /sign up|create account/i }));

    const inline = await screen.findByTestId('signup-error');
    expect(inline.textContent).toMatch(/at least 8/i);
    expect(mockSignUp).not.toHaveBeenCalled();
  });
});
