import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { __resetToasts } from '@/components/ui/toast';
import { SoloPlayClient } from './play-client';

const mockRefresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh, push: vi.fn(), replace: vi.fn() }),
}));

const mockSignInAnonymously = vi.fn();
const mockGetUser = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
  getSupabaseBrowserClient: () => ({
    auth: {
      getUser: mockGetUser,
      signInAnonymously: mockSignInAnonymously,
    },
  }),
}));

const round = {
  subreddit: 'tifu',
  title: 'TIFU by texting my boss a photo of my cat',
  upvotes: '24.1k',
  age: '8h',
  body: null,
  imageUrl: null,
};

beforeEach(() => {
  __resetToasts();
  mockRefresh.mockReset();
  mockSignInAnonymously.mockReset();
  mockGetUser.mockReset();
  mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
  // Default fetch — overridden per-test as needed.
  globalThis.fetch = vi.fn();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('SoloPlayClient', () => {
  it('renders RoundCard + GuessInput + a separate submit button when player exists', () => {
    render(
      <SoloPlayClient
        roundId="r1"
        sessionId="s1"
        hasPlayer
        autoNickname="brave fox"
        round={round}
      />,
    );
    expect(screen.getByText(/TIFU by texting my boss/)).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /guess|submit/i })).toBeInTheDocument();
    // No nickname prompt when player already exists.
    expect(screen.queryByTestId('nickname-prompt')).toBeNull();
  });

  it('renders NicknamePrompt above the guess input when no player yet', () => {
    render(
      <SoloPlayClient
        roundId="r1"
        sessionId={null}
        hasPlayer={false}
        autoNickname="brave fox"
        round={round}
      />,
    );
    expect(screen.getByTestId('nickname-prompt')).toBeInTheDocument();
    // Guess textarea is disabled until nickname submitted.
    const textareas = screen.getAllByRole('textbox').filter((el) => el.tagName === 'TEXTAREA');
    expect(textareas).toHaveLength(1);
    expect(textareas[0]).toBeDisabled();
    // Submit button is also disabled.
    expect(screen.getByRole('button', { name: /guess|submit/i })).toBeDisabled();
  });

  it('submits the guess when the submit button is clicked', async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ sessionId: 's1', score: 50, reaction: {} }), { status: 200 }),
      );
    globalThis.fetch = fetchMock;

    render(
      <SoloPlayClient
        roundId="r1"
        sessionId="s1"
        hasPlayer
        autoNickname="brave fox"
        round={round}
      />,
    );
    const ta = screen.getByRole('textbox');
    await user.type(ta, 'something funny');
    await user.click(screen.getByRole('button', { name: /guess|submit/i }));

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/guess',
      expect.objectContaining({ method: 'POST' }),
    );
    const calledWith = fetchMock.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(calledWith.body as string)).toEqual({
      roundId: 'r1',
      guess: 'something funny',
      sessionId: 's1',
    });
  });

  it('submits the guess on Cmd/Ctrl+Enter', async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ sessionId: 's1', score: 50, reaction: {} }), { status: 200 }),
      );
    globalThis.fetch = fetchMock;

    render(
      <SoloPlayClient
        roundId="r1"
        sessionId="s1"
        hasPlayer
        autoNickname="brave fox"
        round={round}
      />,
    );
    const ta = screen.getByRole('textbox');
    await user.type(ta, 'something funny');
    ta.focus();
    await user.keyboard('{Control>}{Enter}{/Control}');

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/guess',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('shows the loading state on the submit button while the request is in flight', async () => {
    const user = userEvent.setup();
    let resolve: (value: Response) => void = () => {};
    globalThis.fetch = vi.fn(
      () =>
        new Promise<Response>((r) => {
          resolve = r;
        }),
    );

    render(
      <SoloPlayClient
        roundId="r1"
        sessionId="s1"
        hasPlayer
        autoNickname="brave fox"
        round={round}
      />,
    );
    await user.type(screen.getByRole('textbox'), 'g');
    await user.click(screen.getByRole('button', { name: /guess|submit/i }));

    const button = screen.getByRole('button', { name: /guess|submit|scoring/i });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');

    resolve(new Response('{}', { status: 200 }));
  });

  it('shows an error toast when the submission fails (non-2xx)', async () => {
    const user = userEvent.setup();
    globalThis.fetch = vi.fn().mockResolvedValue(new Response('boom', { status: 500 }));

    render(
      <SoloPlayClient
        roundId="r1"
        sessionId="s1"
        hasPlayer
        autoNickname="brave fox"
        round={round}
      />,
    );
    await user.type(screen.getByRole('textbox'), 'g');
    await user.click(screen.getByRole('button', { name: /guess|submit/i }));

    const alerts = await screen.findAllByRole('alert');
    expect(alerts.some((el) => /failed|error/i.test(el.textContent ?? ''))).toBe(true);
  });

  it('shows an error toast when fetch throws (network error)', async () => {
    const user = userEvent.setup();
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('offline'));

    render(
      <SoloPlayClient
        roundId="r1"
        sessionId="s1"
        hasPlayer
        autoNickname="brave fox"
        round={round}
      />,
    );
    await user.type(screen.getByRole('textbox'), 'g');
    await user.click(screen.getByRole('button', { name: /guess|submit/i }));

    const alerts = await screen.findAllByRole('alert');
    expect(alerts.some((el) => /offline|network|error/i.test(el.textContent ?? ''))).toBe(true);
  });

  it('on nickname submit: signs in anonymously if needed, calls /api/auth/onboard, then refreshes', async () => {
    const user = userEvent.setup();
    mockGetUser.mockResolvedValue({ data: { user: null } });
    mockSignInAnonymously.mockResolvedValue({ error: null });
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    globalThis.fetch = fetchMock;

    render(
      <SoloPlayClient
        roundId="r1"
        sessionId={null}
        hasPlayer={false}
        autoNickname="brave fox"
        round={round}
      />,
    );
    await user.click(screen.getByRole('button', { name: /continue|use this|confirm/i }));

    expect(mockSignInAnonymously).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/onboard',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string)).toEqual({
      nickname: 'brave fox',
    });
    expect(mockRefresh).toHaveBeenCalled();
  });

  it('on nickname submit: skips signInAnonymously when an anon user already exists', async () => {
    const user = userEvent.setup();
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    globalThis.fetch = fetchMock;

    render(
      <SoloPlayClient
        roundId="r1"
        sessionId={null}
        hasPlayer={false}
        autoNickname="brave fox"
        round={round}
      />,
    );
    await user.click(screen.getByRole('button', { name: /continue|use this|confirm/i }));

    expect(mockSignInAnonymously).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/onboard',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('renders the reveal layout immediately when revealInitial is provided', () => {
    render(
      <SoloPlayClient
        roundId="r1"
        sessionId="s1"
        hasPlayer
        autoNickname="brave fox"
        round={round}
        revealInitial={{
          guess: 'a clever guess',
          score: 87,
          band: 'bullseye',
          topComment: { text: 'sounds like a real bossy cat.', upvotes: '14.2k' },
        }}
      />,
    );
    // No guess input on the reveal layout.
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.getByTestId('solo-reveal')).toBeInTheDocument();
    expect(screen.getByTestId('score-reveal')).toBeInTheDocument();
    expect(screen.getByText(/sounds like a real bossy cat/)).toBeInTheDocument();
    expect(screen.getByTestId('solo-flag')).toBeInTheDocument();
    expect(screen.getByTestId('solo-next-round')).toBeInTheDocument();
  });

  it('transitions to reveal inline (no URL change) after a successful submit', async () => {
    const user = userEvent.setup();
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          sessionId: 's1',
          score: 72,
          reaction: { band: 'close' },
          topComment: { text: 'sounds like the boss.', upvotes: '14.2k' },
        }),
        { status: 200 },
      ),
    );

    render(
      <SoloPlayClient
        roundId="r1"
        sessionId="s1"
        hasPlayer
        autoNickname="brave fox"
        round={round}
      />,
    );
    await user.type(screen.getByRole('textbox'), 'a guess');
    await user.click(screen.getByRole('button', { name: /guess|submit/i }));

    // Reveal layout is now visible without router.refresh / URL change.
    expect(await screen.findByTestId('solo-reveal')).toBeInTheDocument();
    expect(screen.getByTestId('score-reveal')).toBeInTheDocument();
    expect(screen.getByText(/sounds like the boss/)).toBeInTheDocument();
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it('clicking [next round] calls /api/session/next with sessionId, then router.refresh', async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ sessionId: 's1', roundId: 'r2' }), { status: 200 }),
      );
    globalThis.fetch = fetchMock;

    render(
      <SoloPlayClient
        roundId="r1"
        sessionId="s1"
        hasPlayer
        autoNickname="brave fox"
        round={round}
        revealInitial={{
          guess: 'a guess',
          score: 87,
          band: 'bullseye',
          topComment: { text: 'top.', upvotes: '14.2k' },
        }}
      />,
    );
    await user.click(screen.getByTestId('solo-next-round'));

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/session/next',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string)).toEqual({
      sessionId: 's1',
    });
    expect(mockRefresh).toHaveBeenCalled();
  });

  it('clicking [flag] calls /api/report with the roundId', async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ alreadyReported: false, reportCount: 1 }), { status: 200 }),
      );
    globalThis.fetch = fetchMock;

    render(
      <SoloPlayClient
        roundId="r1"
        sessionId="s1"
        hasPlayer
        autoNickname="brave fox"
        round={round}
        revealInitial={{
          guess: 'a guess',
          score: 87,
          band: 'bullseye',
          topComment: { text: 'top.', upvotes: '14.2k' },
        }}
      />,
    );
    await user.click(screen.getByTestId('solo-flag'));

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/report',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string)).toEqual({
      roundId: 'r1',
    });
  });

  it('shows an error toast when the onboard request fails', async () => {
    const user = userEvent.setup();
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    globalThis.fetch = vi.fn().mockResolvedValue(new Response('boom', { status: 500 }));

    render(
      <SoloPlayClient
        roundId="r1"
        sessionId={null}
        hasPlayer={false}
        autoNickname="brave fox"
        round={round}
      />,
    );
    await user.click(screen.getByRole('button', { name: /continue|use this|confirm/i }));

    const alerts = await screen.findAllByRole('alert');
    expect(alerts.some((el) => /nickname|failed|error/i.test(el.textContent ?? ''))).toBe(true);
  });
});
