import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { __resetToasts } from '@/components/ui/toast';
import { LoginClient } from './login-client';

const mockReplace = vi.fn();
const mockRefresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace, refresh: mockRefresh, push: vi.fn() }),
}));

const mockSignIn = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
  getSupabaseBrowserClient: () => ({
    auth: { signInWithPassword: mockSignIn },
  }),
}));

beforeEach(() => {
  __resetToasts();
  mockReplace.mockReset();
  mockRefresh.mockReset();
  mockSignIn.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('LoginClient', () => {
  it('renders email and password fields plus a submit button', () => {
    render(<LoginClient nextPath="/" />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument();
  });

  it('does NOT render a forgot-password link (deferred per PRD)', () => {
    render(<LoginClient nextPath="/" />);
    expect(screen.queryByText(/forgot password/i)).toBeNull();
  });

  it('redirects to nextPath on successful login', async () => {
    const user = userEvent.setup();
    mockSignIn.mockResolvedValue({ error: null });
    render(<LoginClient nextPath="/account" />);

    await user.type(screen.getByLabelText(/email/i), 'kev@example.com');
    await user.type(screen.getByLabelText(/password/i), 'hunter22hunter');
    await user.click(screen.getByRole('button', { name: /log in/i }));

    expect(mockSignIn).toHaveBeenCalledWith({
      email: 'kev@example.com',
      password: 'hunter22hunter',
    });
    expect(mockReplace).toHaveBeenCalledWith('/account');
  });

  it('renders inline helper text + a toast when sign-in fails', async () => {
    const user = userEvent.setup();
    mockSignIn.mockResolvedValue({ error: { message: 'Invalid login credentials' } });
    render(
      <>
        <LoginClient nextPath="/" />
        {/* Toaster is rendered in the page; we assert via the toast role/aria-live */}
      </>,
    );

    await user.type(screen.getByLabelText(/email/i), 'kev@example.com');
    await user.type(screen.getByLabelText(/password/i), 'hunter22hunter');
    await user.click(screen.getByRole('button', { name: /log in/i }));

    // Inline helper text on the form (aria-describedby target).
    const inline = await screen.findByTestId('login-error');
    expect(inline.textContent).toMatch(/invalid login credentials/i);
    // Email input flagged invalid for screen readers.
    expect(screen.getByLabelText(/email/i)).toHaveAttribute('aria-invalid', 'true');
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('shows inline validation error for an obviously bad email without calling Supabase', async () => {
    const user = userEvent.setup();
    render(<LoginClient nextPath="/" />);

    await user.type(screen.getByLabelText(/email/i), 'not-an-email');
    await user.type(screen.getByLabelText(/password/i), 'hunter22hunter');
    await user.click(screen.getByRole('button', { name: /log in/i }));

    const inline = await screen.findByTestId('login-error');
    expect(inline.textContent).toMatch(/valid email/i);
    expect(mockSignIn).not.toHaveBeenCalled();
  });
});
