import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { __resetToasts } from '@/components/ui/toast';
import type { RoomPlayer } from '@/db/rooms';
import { RoomPlayClient, type RoomPlayClientProps } from './play-client';

const mockRefresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh, push: vi.fn(), replace: vi.fn() }),
}));

type Handler = (payload: unknown) => void;
const channelHandlers: { event: string; handler: Handler }[] = [];
let presenceState: Record<string, unknown> = {};
const channelSend = vi.fn();
const channelTrack = vi.fn();
const channelUnsubscribe = vi.fn();

const fakeChannel = {
  on: vi.fn((kind: string, opts: { event: string }, handler: Handler) => {
    channelHandlers.push({ event: `${kind}:${opts.event}`, handler });
    return fakeChannel;
  }),
  subscribe: vi.fn(() => fakeChannel),
  send: channelSend,
  track: channelTrack,
  unsubscribe: channelUnsubscribe,
  presenceState: () => presenceState,
};

vi.mock('@/lib/supabase/client', () => ({
  getSupabaseBrowserClient: () => ({
    channel: () => fakeChannel,
  }),
}));

const players: RoomPlayer[] = [
  { player_id: 'me', is_kicked: false, joined_at: '2026-05-08T12:00:00Z', nickname: 'me' },
  {
    player_id: 'p2',
    is_kicked: false,
    joined_at: '2026-05-08T12:00:01Z',
    nickname: 'second',
  },
  {
    player_id: 'p3',
    is_kicked: false,
    joined_at: '2026-05-08T12:00:02Z',
    nickname: 'third',
  },
];

const baseProps: RoomPlayClientProps = {
  code: 'ABCDEF',
  sessionId: 'sess-1',
  viewerId: 'me',
  viewerNickname: 'me',
  timerSeconds: 30,
  totalRounds: 8,
  roundIndex: 0,
  roundId: 'round-1',
  round: {
    subreddit: 'tifu',
    title: 'TIFU by texting my boss a photo of my cat',
    upvotes: '24.1k',
    age: '8h',
    body: null,
  },
  roundState: 'guessing',
  roundStartedAt: new Date(Date.now() - 5_000).toISOString(),
  revealedAt: null,
  initialPlayers: players,
  initialSubmittedIds: [],
  viewerPriorGuess: null,
  revealInitial: null,
};

beforeEach(() => {
  __resetToasts();
  mockRefresh.mockReset();
  channelHandlers.length = 0;
  presenceState = { me: [{ id: 'me' }], p2: [{ id: 'p2' }], p3: [{ id: 'p3' }] };
  channelSend.mockReset();
  channelTrack.mockReset();
  channelUnsubscribe.mockReset();
  globalThis.fetch = vi.fn();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function fireBroadcast(event: string, payload: unknown) {
  const entry = channelHandlers.find((h) => h.event === `broadcast:${event}`);
  entry?.handler({ payload });
}

function firePresenceSync() {
  const entry = channelHandlers.find((h) => h.event === 'presence:sync');
  entry?.handler({});
}

describe('RoomPlayClient', () => {
  it('renders the round, player chips, and a guess input in `guessing` state', () => {
    render(<RoomPlayClient {...baseProps} />);
    expect(screen.getByText(/TIFU by texting my boss/)).toBeInTheDocument();
    expect(screen.getByText(/round 1 \/ 8/i)).toBeInTheDocument();
    expect(screen.getByTestId('play-chip-me')).toBeInTheDocument();
    expect(screen.getByTestId('play-chip-p2')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('flips a peer chip to submitted within 1s of receiving a submission broadcast', () => {
    render(<RoomPlayClient {...baseProps} />);
    act(() => firePresenceSync());
    const chipP2 = screen.getByTestId('play-chip-p2');
    expect(chipP2).toHaveAttribute('data-state', 'typing');

    act(() => {
      fireBroadcast('submission', { sessionId: 'sess-1', roundId: 'round-1', playerId: 'p2' });
    });

    expect(screen.getByTestId('play-chip-p2')).toHaveAttribute('data-state', 'submitted');
  });

  it('ignores submission broadcasts for a different round', () => {
    render(<RoomPlayClient {...baseProps} />);
    act(() => firePresenceSync());
    act(() => {
      fireBroadcast('submission', { sessionId: 'sess-1', roundId: 'round-OTHER', playerId: 'p2' });
    });
    expect(screen.getByTestId('play-chip-p2')).toHaveAttribute('data-state', 'typing');
  });

  it('on submit posts to /api/guess, marks the viewer chip submitted, and broadcasts', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ sessionId: 'sess-1', score: 72 }),
    });
    // Two more calls happen — the post-submit transition nudge.
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ result: { kind: 'noop' } }) });
    globalThis.fetch = fetchMock;

    render(<RoomPlayClient {...baseProps} />);
    const user = userEvent.setup();
    const input = screen.getByRole('textbox');
    await user.type(input, 'this is my guess');
    await user.click(screen.getByTestId('play-submit'));

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/guess',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(screen.getByTestId('play-chip-me')).toHaveAttribute('data-state', 'submitted');
    expect(channelSend).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'broadcast',
        event: 'submission',
        payload: expect.objectContaining({ playerId: 'me', roundId: 'round-1' }),
      }),
    );
  });

  it('renders the reveal layout, a `[flag]` button, and a "didn\'t submit" indicator', () => {
    const props: RoomPlayClientProps = {
      ...baseProps,
      roundState: 'revealed',
      revealedAt: new Date().toISOString(),
      initialSubmittedIds: ['me', 'p2'],
      viewerPriorGuess: { text: 'his cat is a snake', score: 72 },
      revealInitial: {
        topComment: { text: 'i would have done the same', upvotes: '4.2k' },
        revealedAt: new Date().toISOString(),
        submitted: [
          { playerId: 'me', score: 72 },
          { playerId: 'p2', score: 50 },
        ],
      },
    };
    render(<RoomPlayClient {...props} />);
    expect(screen.getByTestId('room-reveal')).toBeInTheDocument();
    expect(screen.getByTestId('room-flag')).toBeInTheDocument();
    expect(screen.getByText(/i would have done the same/)).toBeInTheDocument();
    // p3 didn't submit — the row shows the missing-score indicator.
    expect(screen.getByTestId('reveal-row-p3')).toHaveTextContent(/didn't submit/);
  });

  it('clicking [flag] posts to /api/report with the current roundId', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ alreadyReported: false }) });
    globalThis.fetch = fetchMock;

    const props: RoomPlayClientProps = {
      ...baseProps,
      roundState: 'revealed',
      revealedAt: new Date().toISOString(),
      initialSubmittedIds: ['me'],
      viewerPriorGuess: { text: 'foo', score: 50 },
      revealInitial: {
        topComment: { text: 'comment', upvotes: '1k' },
        revealedAt: new Date().toISOString(),
        submitted: [{ playerId: 'me', score: 50 }],
      },
    };
    render(<RoomPlayClient {...props} />);
    const user = userEvent.setup();
    await user.click(screen.getByTestId('room-flag'));
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/report',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ roundId: 'round-1' }),
      }),
    );
  });

  it('reconnection: an already-revealed session renders the reveal directly', () => {
    const props: RoomPlayClientProps = {
      ...baseProps,
      roundState: 'revealed',
      revealedAt: new Date().toISOString(),
      initialSubmittedIds: ['me', 'p2'],
      viewerPriorGuess: { text: 'reconnected guess', score: 50 },
      revealInitial: {
        topComment: { text: 'you are home', upvotes: '12' },
        revealedAt: new Date().toISOString(),
        submitted: [
          { playerId: 'me', score: 50 },
          { playerId: 'p2', score: 60 },
        ],
      },
    };
    render(<RoomPlayClient {...props} />);
    expect(screen.getByTestId('room-reveal')).toBeInTheDocument();
    // No guess input on reveal.
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });
});
