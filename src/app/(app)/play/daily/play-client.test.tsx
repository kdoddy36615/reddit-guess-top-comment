import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { __resetToasts } from '@/components/ui/toast';
import { DailyPlayClient } from './play-client';

const mockRefresh = vi.fn();
const mockReplace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh, push: vi.fn(), replace: mockReplace }),
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
  mockReplace.mockReset();
  mockSignInAnonymously.mockReset();
  mockGetUser.mockReset();
  mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
  globalThis.fetch = vi.fn();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('DailyPlayClient', () => {
  it('renders 5 progress pips with the current round highlighted', () => {
    render(
      <DailyPlayClient
        sessionId="s1"
        roundId="r1"
        hasPlayer
        autoNickname="brave fox"
        roundNumber={3}
        totalRounds={5}
        round={round}
      />,
    );
    const pips = screen.getAllByTestId('pip');
    expect(pips).toHaveLength(5);
    expect(pips[0]).toHaveAttribute('data-state', 'done');
    expect(pips[1]).toHaveAttribute('data-state', 'done');
    expect(pips[2]).toHaveAttribute('data-state', 'now');
    expect(pips[3]).toHaveAttribute('data-state', 'pending');
    expect(pips[4]).toHaveAttribute('data-state', 'pending');
    expect(screen.getByText(/round 3 \/ 5/i)).toBeInTheDocument();
  });

  it('renders RoundCard + GuessInput on guessing state', () => {
    render(
      <DailyPlayClient
        sessionId="s1"
        roundId="r1"
        hasPlayer
        autoNickname="brave fox"
        roundNumber={1}
        totalRounds={5}
        round={round}
      />,
    );
    expect(screen.getByText(/TIFU by texting my boss/)).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByTestId('daily-submit-guess')).toBeInTheDocument();
  });

  it('renders the reveal layout immediately when revealInitial is provided', () => {
    render(
      <DailyPlayClient
        sessionId="s1"
        roundId="r1"
        hasPlayer
        autoNickname="brave fox"
        roundNumber={2}
        totalRounds={5}
        round={round}
        revealInitial={{
          guess: 'a clever guess',
          score: 87,
          band: 'bullseye',
          topComment: { text: 'sounds like a real bossy cat.', upvotes: '14.2k' },
        }}
      />,
    );
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.getByTestId('daily-reveal')).toBeInTheDocument();
    expect(screen.getByTestId('score-reveal')).toBeInTheDocument();
    expect(screen.getByTestId('daily-flag')).toBeInTheDocument();
    expect(screen.getByTestId('daily-next-round')).toHaveTextContent(/next round/i);
  });

  it('shows [finish →] instead of [next round →] on the final round reveal', () => {
    render(
      <DailyPlayClient
        sessionId="s1"
        roundId="r5"
        hasPlayer
        autoNickname="brave fox"
        roundNumber={5}
        totalRounds={5}
        round={round}
        revealInitial={{
          guess: 'final guess',
          score: 60,
          band: 'close',
          topComment: { text: 'final top.', upvotes: '8k' },
        }}
      />,
    );
    expect(screen.getByTestId('daily-next-round')).toHaveTextContent(/finish/i);
  });

  it('submits the guess to /api/guess with sessionId + roundId', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          sessionId: 's1',
          score: 72,
          topComment: { text: 'wow.', upvotes: '14.2k' },
        }),
        { status: 200 },
      ),
    );
    globalThis.fetch = fetchMock;

    render(
      <DailyPlayClient
        sessionId="s1"
        roundId="r1"
        hasPlayer
        autoNickname="brave fox"
        roundNumber={1}
        totalRounds={5}
        round={round}
      />,
    );
    await user.type(screen.getByRole('textbox'), 'a guess');
    await user.click(screen.getByTestId('daily-submit-guess'));

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/guess',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string)).toEqual({
      roundId: 'r1',
      guess: 'a guess',
      sessionId: 's1',
    });

    // Reveal layout shows up inline (no router.refresh / URL change).
    expect(await screen.findByTestId('daily-reveal')).toBeInTheDocument();
    expect(screen.getByText(/wow\./)).toBeInTheDocument();
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it('clicking [next round] (rounds 1–4) calls router.refresh, no fetch needed', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock;

    render(
      <DailyPlayClient
        sessionId="s1"
        roundId="r2"
        hasPlayer
        autoNickname="brave fox"
        roundNumber={2}
        totalRounds={5}
        round={round}
        revealInitial={{
          guess: 'g',
          score: 40,
          band: 'way_off',
          topComment: { text: 't.', upvotes: '1k' },
        }}
      />,
    );
    await user.click(screen.getByTestId('daily-next-round'));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(mockRefresh).toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('clicking [finish →] (round 5) calls /api/play/daily/complete then router.replace(/play/daily/end)', async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ done: true, totalScore: 312 }), { status: 200 }),
      );
    globalThis.fetch = fetchMock;

    render(
      <DailyPlayClient
        sessionId="s1"
        roundId="r5"
        hasPlayer
        autoNickname="brave fox"
        roundNumber={5}
        totalRounds={5}
        round={round}
        revealInitial={{
          guess: 'final',
          score: 90,
          band: 'bullseye',
          topComment: { text: 'top.', upvotes: '14.2k' },
        }}
      />,
    );
    await user.click(screen.getByTestId('daily-next-round'));

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/play/daily/complete',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string)).toEqual({
      sessionId: 's1',
    });
    expect(mockReplace).toHaveBeenCalledWith('/play/daily/end');
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
      <DailyPlayClient
        sessionId="s1"
        roundId="r1"
        hasPlayer
        autoNickname="brave fox"
        roundNumber={1}
        totalRounds={5}
        round={round}
        revealInitial={{
          guess: 'g',
          score: 50,
          band: 'close',
          topComment: { text: 't.', upvotes: '1k' },
        }}
      />,
    );
    await user.click(screen.getByTestId('daily-flag'));

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/report',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string)).toEqual({
      roundId: 'r1',
    });
  });

  it('renders NicknamePrompt above the guess input when no player yet', () => {
    render(
      <DailyPlayClient
        sessionId="s1"
        roundId="r1"
        hasPlayer={false}
        autoNickname="brave fox"
        roundNumber={1}
        totalRounds={5}
        round={round}
      />,
    );
    expect(screen.getByTestId('nickname-prompt')).toBeInTheDocument();
    const textareas = screen.getAllByRole('textbox').filter((el) => el.tagName === 'TEXTAREA');
    expect(textareas).toHaveLength(1);
    expect(textareas[0]).toBeDisabled();
    expect(screen.getByTestId('daily-submit-guess')).toBeDisabled();
  });

  it('shows error toast when finalize fails', async () => {
    const user = userEvent.setup();
    globalThis.fetch = vi.fn().mockResolvedValue(new Response('boom', { status: 500 }));

    render(
      <DailyPlayClient
        sessionId="s1"
        roundId="r5"
        hasPlayer
        autoNickname="brave fox"
        roundNumber={5}
        totalRounds={5}
        round={round}
        revealInitial={{
          guess: 'final',
          score: 90,
          band: 'bullseye',
          topComment: { text: 'top.', upvotes: '1k' },
        }}
      />,
    );
    await user.click(screen.getByTestId('daily-next-round'));

    const alerts = await screen.findAllByRole('alert');
    expect(alerts.some((el) => /finalize|failed|error/i.test(el.textContent ?? ''))).toBe(true);
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
