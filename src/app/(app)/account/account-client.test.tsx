import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { __resetToasts } from '@/components/ui/toast';
import { AccountClient, type AccountStats } from './account-client';

const mockReplace = vi.fn();
const mockRefresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace, refresh: mockRefresh, push: vi.fn() }),
}));

const mockUpdateUser = vi.fn();
const mockSignOut = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
  getSupabaseBrowserClient: () => ({
    auth: { updateUser: mockUpdateUser, signOut: mockSignOut },
  }),
}));

const mockFetch = vi.fn();

beforeEach(() => {
  __resetToasts();
  mockReplace.mockReset();
  mockRefresh.mockReset();
  mockUpdateUser.mockReset();
  mockSignOut.mockReset();
  mockFetch.mockReset();
  vi.stubGlobal('fetch', mockFetch);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const sampleStats: AccountStats = {
  bestDailyRun: { totalScore: 412, dailyRoomId: 'daily-2026-05-07' },
  streak: { count: 4, active: true },
  weekly: { completed: 3, window: 7 },
  lifetimeGuesses: 142,
  topSubs: [
    { subreddit: 'tifu', averageScore: 88, plays: 12 },
    { subreddit: 'AskReddit', averageScore: 72, plays: 30 },
    { subreddit: 'jokes', averageScore: 55, plays: 4 },
  ],
};

describe('AccountClient — anonymous', () => {
  it('renders the upgrade card instead of the stats grid', () => {
    render(<AccountClient isAnonymous email={null} nickname="anon42" stats={null} />);
    expect(screen.getByTestId('upgrade-card')).toBeInTheDocument();
    expect(screen.queryByTestId('stats-grid')).toBeNull();
  });

  it('renders the upgrade form (no change-password / sign-out / delete)', () => {
    render(<AccountClient isAnonymous email={null} nickname="anon42" stats={null} />);
    expect(screen.getByTestId('upgrade-form')).toBeInTheDocument();
    expect(screen.queryByTestId('change-password-form')).toBeNull();
    expect(screen.queryByTestId('sign-out-card')).toBeNull();
    expect(screen.queryByTestId('delete-account-card')).toBeNull();
  });

  it('calls supabase.auth.updateUser with email + password on upgrade submit', async () => {
    const user = userEvent.setup();
    mockUpdateUser.mockResolvedValue({ error: null });
    render(<AccountClient isAnonymous email={null} nickname="anon42" stats={null} />);

    await user.type(screen.getByLabelText(/email/i), 'kev@example.com');
    await user.type(screen.getByLabelText(/password/i), 'hunter22hunter');
    await user.click(screen.getByTestId('upgrade-submit'));

    expect(mockUpdateUser).toHaveBeenCalledWith({
      email: 'kev@example.com',
      password: 'hunter22hunter',
    });
    expect(mockRefresh).toHaveBeenCalled();
  });
});

describe('AccountClient — permanent', () => {
  it('renders the full stats grid including best run, streak, weekly, lifetime, top subs', () => {
    render(
      <AccountClient
        isAnonymous={false}
        email="kev@example.com"
        nickname="kev"
        stats={sampleStats}
      />,
    );
    expect(screen.getByTestId('stats-grid')).toBeInTheDocument();
    expect(screen.getByTestId('stat-best-run').textContent).toContain('412');
    expect(screen.getByTestId('stat-best-run').textContent).toContain('2026-05-07');
    expect(screen.getByTestId('stat-streak').textContent).toContain('4 days');
    expect(screen.getByTestId('stat-weekly').textContent).toMatch(/3.*7/);
    expect(screen.getByTestId('stat-lifetime-guesses').textContent).toContain('142');
    expect(screen.getAllByTestId('top-sub-row')).toHaveLength(3);
    expect(screen.queryByTestId('upgrade-card')).toBeNull();
  });

  it('shows change-password, sign-out, and delete-account controls', () => {
    render(
      <AccountClient
        isAnonymous={false}
        email="kev@example.com"
        nickname="kev"
        stats={sampleStats}
      />,
    );
    expect(screen.getByTestId('change-password-form')).toBeInTheDocument();
    expect(screen.getByTestId('sign-out-card')).toBeInTheDocument();
    expect(screen.getByTestId('delete-account-card')).toBeInTheDocument();
    expect(screen.queryByTestId('upgrade-form')).toBeNull();
  });

  it('signs out via supabase and redirects home', async () => {
    const user = userEvent.setup();
    mockSignOut.mockResolvedValue({ error: null });
    render(
      <AccountClient
        isAnonymous={false}
        email="kev@example.com"
        nickname="kev"
        stats={sampleStats}
      />,
    );
    await user.click(screen.getByTestId('sign-out-button'));
    expect(mockSignOut).toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith('/');
  });

  it('updates password via supabase.auth.updateUser when the change-password form is submitted', async () => {
    const user = userEvent.setup();
    mockUpdateUser.mockResolvedValue({ error: null });
    render(
      <AccountClient
        isAnonymous={false}
        email="kev@example.com"
        nickname="kev"
        stats={sampleStats}
      />,
    );
    const form = screen.getByTestId('change-password-form');
    const input = form.querySelector('input[type="password"]') as HTMLInputElement;
    await user.type(input, 'newpassword99');
    await user.click(screen.getByTestId('change-password-submit'));
    expect(mockUpdateUser).toHaveBeenCalledWith({ password: 'newpassword99' });
  });

  it('requires a confirmation step before calling /api/account/delete', async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    render(
      <AccountClient
        isAnonymous={false}
        email="kev@example.com"
        nickname="kev"
        stats={sampleStats}
      />,
    );

    await user.click(screen.getByTestId('delete-account-button'));
    expect(mockFetch).not.toHaveBeenCalled();

    await user.click(screen.getByTestId('delete-account-confirm'));
    expect(mockFetch).toHaveBeenCalledWith('/api/account/delete', { method: 'POST' });
    expect(mockReplace).toHaveBeenCalledWith('/');
  });
});

describe('AccountClient — permanent with empty stats', () => {
  it('shows fallback copy in each card when the player has no history', () => {
    const empty: AccountStats = {
      bestDailyRun: null,
      streak: { count: 0, active: false },
      weekly: { completed: 0, window: 7 },
      lifetimeGuesses: 0,
      topSubs: [],
    };
    render(
      <AccountClient isAnonymous={false} email="kev@example.com" nickname="kev" stats={empty} />,
    );
    expect(screen.getByTestId('stat-best-run').textContent).toMatch(/no daily runs/i);
    expect(screen.getByTestId('stat-top-subs').textContent).toMatch(/play some rounds/i);
  });
});
