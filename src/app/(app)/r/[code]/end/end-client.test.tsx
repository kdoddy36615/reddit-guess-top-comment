import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { __resetToasts } from '@/components/ui/toast';
import type { MatchSummary } from '@/lib/rooms/end-screen';
import { EndClient, type EndClientProps } from './end-client';

const mockRefresh = vi.fn();
const mockReplace = vi.fn();
const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh, replace: mockReplace, push: mockPush }),
}));

type Handler = (payload: unknown) => void;
const channelHandlers: { event: string; handler: Handler }[] = [];
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
  presenceState: () => ({}),
};

vi.mock('@/lib/supabase/client', () => ({
  getSupabaseBrowserClient: () => ({
    channel: () => fakeChannel,
  }),
}));

const summary: MatchSummary = {
  winner: {
    rank: 1,
    playerId: 'p1',
    playerName: 'kev',
    totalScore: 412,
    submittedCount: 8,
  },
  standings: [
    { rank: 1, playerId: 'p1', playerName: 'kev', totalScore: 412, submittedCount: 8 },
    { rank: 2, playerId: 'p2', playerName: 'snorlax', totalScore: 380, submittedCount: 8 },
    {
      rank: 3,
      playerId: 'p3',
      playerName: 'comment_king',
      totalScore: 0,
      submittedCount: 0,
    },
  ],
  highlights: {
    topScore: { playerId: 'p2', playerName: 'snorlax', roundIndex: 4, score: 92 },
    biggestMiss: { playerId: 'p1', playerName: 'kev', roundIndex: 2, score: 8 },
    fastestSubmit: { playerId: 'p1', playerName: 'kev', firstSubmitRounds: 5 },
  },
};

const baseProps: EndClientProps = {
  code: 'ABCDEF',
  viewerId: 'p1',
  viewerNickname: 'kev',
  summary,
  isHost: true,
  mode: 'host',
};

beforeEach(() => {
  __resetToasts();
  mockRefresh.mockReset();
  mockReplace.mockReset();
  mockPush.mockReset();
  channelSend.mockReset();
  channelTrack.mockReset();
  channelUnsubscribe.mockReset();
  channelHandlers.length = 0;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('EndClient — winner banner + standings', () => {
  it('names the #1 player by score in Fraunces', () => {
    render(<EndClient {...baseProps} />);
    expect(screen.getByTestId('winner-name').textContent).toBe('kev');
    expect(screen.getByTestId('winner-name').className).toMatch(/font-display/);
    expect(screen.getByTestId('winner-score').textContent).toContain('412');
  });

  it('renders all standings using LeaderboardRow with the gold "you" variant', () => {
    render(<EndClient {...baseProps} viewerId="p1" />);
    const me = screen.getByTestId('standing-p1');
    expect(me.dataset.variant).toBe('you');
    const them = screen.getByTestId('standing-p2');
    expect(them.dataset.variant).toBe('default');
    expect(within(me).getByTestId('leaderboard-name').textContent).toBe('kev');
    expect(within(them).getByTestId('leaderboard-score').textContent).toBe('380');
  });
});

describe('EndClient — per-round highlights', () => {
  it('shows top score, biggest miss, and fastest submit cards', () => {
    render(<EndClient {...baseProps} />);
    const top = screen.getByTestId('highlight-top-score');
    expect(top.textContent).toContain('92');
    expect(top.textContent).toContain('round 5');
    expect(top.textContent).toContain('snorlax');

    const miss = screen.getByTestId('highlight-biggest-miss');
    expect(miss.textContent).toContain('8');
    expect(miss.textContent).toContain('round 3');
    expect(miss.textContent).toContain('kev');

    const fast = screen.getByTestId('highlight-fastest-submit');
    expect(fast.textContent).toContain('5');
    expect(fast.textContent).toContain('kev');
  });
});

describe('EndClient — host-mode replay CTA', () => {
  it('host sees [Play again] and posts to the replay endpoint, then navigates back to /r/[code]', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'lobby' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<EndClient {...baseProps} isHost mode="host" />);
    const btn = screen.getByTestId('end-play-again');
    await userEvent.click(btn);

    expect(fetchMock).toHaveBeenCalledWith('/api/rooms/ABCDEF/replay', { method: 'POST' });
    expect(mockReplace).toHaveBeenCalledWith('/r/ABCDEF');
    expect(channelSend).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'broadcast',
        event: 'state',
        payload: { kind: 'replay' },
      }),
    );
  });

  it('non-host in a host room sees the waiting message, no [Play again] button', () => {
    render(<EndClient {...baseProps} isHost={false} mode="host" />);
    expect(screen.queryByTestId('end-play-again')).toBeNull();
    expect(screen.getByTestId('end-waiting-host')).toBeInTheDocument();
  });

  it('peers refresh when host broadcasts a replay event', () => {
    render(<EndClient {...baseProps} isHost={false} mode="host" />);
    const stateHandler = channelHandlers.find((h) => h.event === 'broadcast:state')?.handler;
    expect(stateHandler).toBeDefined();
    stateHandler?.({ payload: { kind: 'replay' } });
    expect(mockRefresh).toHaveBeenCalled();
  });
});

describe('EndClient — random-mode CTAs', () => {
  it('random rooms show [Find another match] linking to /rooms, and no replay button', () => {
    render(<EndClient {...baseProps} isHost={false} mode="random" />);
    expect(screen.queryByTestId('end-play-again')).toBeNull();
    expect(screen.queryByTestId('end-waiting-host')).toBeNull();
    const cta = screen.getByTestId('end-find-another');
    expect(cta.getAttribute('href')).toBe('/rooms');
  });
});
