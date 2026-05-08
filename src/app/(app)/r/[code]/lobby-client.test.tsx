import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { __resetToasts } from '@/components/ui/toast';
import type { Room, RoomPlayer } from '@/db/rooms';
import { LobbyClient } from './lobby-client';

const mockRefresh = vi.fn();
const mockReplace = vi.fn();
const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh, replace: mockReplace, push: mockPush }),
}));

// ---------------------------------------------------------------------------
// Fake Realtime channel — captures registered handlers so tests can fire
// presence-sync + broadcast events into the component.
// ---------------------------------------------------------------------------
type Handler = (payload: unknown) => void;
const channelHandlers: { event: string; handler: Handler }[] = [];
let presenceState: Record<string, unknown> = {};
let subscribeCb: ((status: string, err?: Error) => void) | null = null;
const channelSend = vi.fn();
const channelTrack = vi.fn();
const channelUnsubscribe = vi.fn();

const fakeChannel = {
  on: vi.fn((kind: string, opts: { event: string }, handler: Handler) => {
    channelHandlers.push({ event: `${kind}:${opts.event}`, handler });
    return fakeChannel;
  }),
  subscribe: vi.fn((cb: (status: string, err?: Error) => void) => {
    subscribeCb = cb;
    return fakeChannel;
  }),
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

// Drive subscribeRoomChannel via the real wrapper but with our fake channel.
// The wrapper just calls channel.subscribe(cb), which the fake captures.

const baseRoom: Room = {
  code: 'ABCDEF',
  host_id: 'host-1',
  mode: 'host',
  max_players: 32,
  round_count: 8,
  timer_seconds: 30,
  status: 'lobby',
  locked: false,
  created_at: '2026-05-08T12:00:00Z',
  started_at: null,
  ended_at: null,
};

const basePlayers: RoomPlayer[] = [
  { player_id: 'host-1', is_kicked: false, joined_at: '2026-05-08T12:00:00Z', nickname: 'host' },
  {
    player_id: 'guest-2',
    is_kicked: false,
    joined_at: '2026-05-08T12:00:01Z',
    nickname: 'guest-two',
  },
  {
    player_id: 'guest-3',
    is_kicked: true,
    joined_at: '2026-05-08T12:00:02Z',
    nickname: 'kicked-three',
  },
];

beforeEach(() => {
  __resetToasts();
  mockRefresh.mockReset();
  mockReplace.mockReset();
  mockPush.mockReset();
  channelSend.mockReset();
  channelTrack.mockReset();
  channelUnsubscribe.mockReset();
  channelHandlers.length = 0;
  presenceState = {};
  subscribeCb = null;
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function fireBroadcast(event: string, payload: unknown) {
  for (const { event: e, handler } of channelHandlers) {
    if (e === `broadcast:${event}`) handler({ payload });
  }
}
function firePresenceSync() {
  for (const { event, handler } of channelHandlers) {
    if (event === 'presence:sync') handler({});
  }
}

describe('LobbyClient — host view', () => {
  it('renders the room code, player chips, and host controls', () => {
    render(
      <LobbyClient
        code="ABCDEF"
        initialRoom={baseRoom}
        initialPlayers={basePlayers}
        viewerId="host-1"
        viewerNickname="host"
      />,
    );
    expect(screen.getByTestId('lobby')).toBeInTheDocument();
    expect(screen.getByText('ABCDEF')).toBeInTheDocument();
    expect(screen.getByTestId('host-controls')).toBeInTheDocument();
    expect(screen.getByTestId('host-start-button')).toBeInTheDocument();
    expect(screen.getByTestId('host-lock-toggle')).toHaveTextContent(/lock room/i);
    expect(screen.getByTestId('lobby-player-host-1')).toBeInTheDocument();
    expect(screen.getByTestId('lobby-player-guest-2')).toBeInTheDocument();
    expect(screen.getByTestId('lobby-player-guest-3')).toBeInTheDocument();
  });

  it('shows kick buttons for non-host non-kicked players only', () => {
    render(
      <LobbyClient
        code="ABCDEF"
        initialRoom={baseRoom}
        initialPlayers={basePlayers}
        viewerId="host-1"
        viewerNickname="host"
      />,
    );
    expect(screen.queryByTestId('lobby-kick-host-1')).not.toBeInTheDocument();
    expect(screen.getByTestId('lobby-kick-guest-2')).toBeInTheDocument();
    expect(screen.queryByTestId('lobby-kick-guest-3')).not.toBeInTheDocument();
  });

  it('clicking start posts to /api/rooms/[code]/start and broadcasts a lobby_update', async () => {
    const user = userEvent.setup();
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'live' }),
    });
    render(
      <LobbyClient
        code="ABCDEF"
        initialRoom={baseRoom}
        initialPlayers={basePlayers}
        viewerId="host-1"
        viewerNickname="host"
      />,
    );
    await user.click(screen.getByTestId('host-start-button'));
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/rooms/ABCDEF/start',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(mockRefresh).toHaveBeenCalled();
    expect(channelSend).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'broadcast',
        event: 'state',
        payload: { kind: 'lobby_update' },
      }),
    );
  });

  it('clicking kick posts the playerId to the kick route', async () => {
    const user = userEvent.setup();
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });
    render(
      <LobbyClient
        code="ABCDEF"
        initialRoom={baseRoom}
        initialPlayers={basePlayers}
        viewerId="host-1"
        viewerNickname="host"
      />,
    );
    await user.click(screen.getByTestId('lobby-kick-guest-2'));
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/rooms/ABCDEF/kick',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ playerId: 'guest-2' }),
      }),
    );
  });

  it('toggling lock posts the inverse of the current state', async () => {
    const user = userEvent.setup();
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ locked: true }),
    });
    render(
      <LobbyClient
        code="ABCDEF"
        initialRoom={baseRoom}
        initialPlayers={basePlayers}
        viewerId="host-1"
        viewerNickname="host"
      />,
    );
    await user.click(screen.getByTestId('host-lock-toggle'));
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/rooms/ABCDEF/lock',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ locked: true }),
      }),
    );
  });

  it('saving settings posts roundCount + timerSeconds', async () => {
    const user = userEvent.setup();
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });
    render(
      <LobbyClient
        code="ABCDEF"
        initialRoom={baseRoom}
        initialPlayers={basePlayers}
        viewerId="host-1"
        viewerNickname="host"
      />,
    );
    const rounds = screen.getByTestId('host-rounds-input');
    await user.clear(rounds);
    await user.type(rounds, '12');
    const timer = screen.getByTestId('host-timer-input');
    await user.clear(timer);
    await user.type(timer, '45');
    await user.click(screen.getByTestId('host-save-settings'));
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/rooms/ABCDEF/settings',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ roundCount: 12, timerSeconds: 45 }),
      }),
    );
  });

  it('host-control failure surfaces a toast and does not refresh', async () => {
    const user = userEvent.setup();
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Only the host can start the match.' }),
    });
    render(
      <LobbyClient
        code="ABCDEF"
        initialRoom={baseRoom}
        initialPlayers={basePlayers}
        viewerId="host-1"
        viewerNickname="host"
      />,
    );
    await user.click(screen.getByTestId('host-start-button'));
    expect(mockRefresh).not.toHaveBeenCalled();
    expect(channelSend).not.toHaveBeenCalled();
  });
});

describe('LobbyClient — guest view', () => {
  it('shows the waiting-for-host card and no controls', () => {
    render(
      <LobbyClient
        code="ABCDEF"
        initialRoom={baseRoom}
        initialPlayers={basePlayers}
        viewerId="guest-2"
        viewerNickname="guest-two"
      />,
    );
    expect(screen.getByTestId('guest-waiting')).toHaveTextContent(/waiting for the host/i);
    expect(screen.queryByTestId('host-controls')).not.toBeInTheDocument();
    expect(screen.queryByTestId('host-start-button')).not.toBeInTheDocument();
    // Guests don't see kick buttons.
    expect(screen.queryByTestId('lobby-kick-host-1')).not.toBeInTheDocument();
    expect(screen.queryByTestId('lobby-kick-guest-3')).not.toBeInTheDocument();
  });
});

describe('LobbyClient — random mode', () => {
  it('shows the fill counter and 90s countdown, no host controls', () => {
    const room: Room = { ...baseRoom, mode: 'random', host_id: null, max_players: 8 };
    render(
      <LobbyClient
        code="ABCDEF"
        initialRoom={room}
        initialPlayers={basePlayers.slice(0, 2)}
        viewerId="guest-2"
        viewerNickname="guest-two"
      />,
    );
    expect(screen.getByTestId('random-meta')).toBeInTheDocument();
    expect(screen.getByTestId('random-fill')).toHaveTextContent('2/8');
    // Countdown shows a number followed by 's' — exact value depends on `now`.
    expect(screen.getByTestId('random-countdown').textContent).toMatch(/\d+s/);
    expect(screen.queryByTestId('host-controls')).not.toBeInTheDocument();
    expect(screen.queryByTestId('guest-waiting')).not.toBeInTheDocument();
  });
});

describe('LobbyClient — realtime', () => {
  it('presence sync drives chip state to disconnected when player not present', () => {
    presenceState = { 'host-1': [{}] }; // only host is online; guest-2 is disconnected
    render(
      <LobbyClient
        code="ABCDEF"
        initialRoom={baseRoom}
        initialPlayers={basePlayers}
        viewerId="host-1"
        viewerNickname="host"
      />,
    );
    act(() => {
      firePresenceSync();
    });
    const guestChip = within(screen.getByTestId('lobby-player-guest-2')).getByTestId(
      'player-chip-state',
    );
    expect(guestChip.textContent).toMatch(/disconnected/i);
    const kickedChip = within(screen.getByTestId('lobby-player-guest-3')).getByTestId(
      'player-chip-state',
    );
    expect(kickedChip.textContent).toMatch(/kicked/i);
  });

  it('inbound lobby_update broadcast triggers router.refresh()', () => {
    render(
      <LobbyClient
        code="ABCDEF"
        initialRoom={baseRoom}
        initialPlayers={basePlayers}
        viewerId="host-1"
        viewerNickname="host"
      />,
    );
    act(() => {
      fireBroadcast('state', { kind: 'lobby_update' });
    });
    expect(mockRefresh).toHaveBeenCalled();
  });

  it('subscribe callback drives the connection banner', () => {
    render(
      <LobbyClient
        code="ABCDEF"
        initialRoom={baseRoom}
        initialPlayers={basePlayers}
        viewerId="host-1"
        viewerNickname="host"
      />,
    );
    // While reconnecting, banner is visible.
    expect(document.querySelector('[data-connection-banner]')).toBeTruthy();
    act(() => {
      // SUBSCRIBED → live → banner hidden.
      subscribeCb?.('SUBSCRIBED');
    });
    expect(document.querySelector('[data-connection-banner]')).toBeFalsy();
  });
});
