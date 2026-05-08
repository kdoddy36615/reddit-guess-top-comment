import { describe, expect, it, vi } from 'vitest';
import {
  broadcastState,
  broadcastSubmission,
  ROOM_BROADCAST_EVENTS,
  roomChannel,
  roomTopic,
} from './room-channel';

function makeFakeClient() {
  const channel = {
    send: vi.fn().mockResolvedValue('ok'),
  };
  const channelFn = vi.fn().mockReturnValue(channel);
  return {
    channel: channelFn,
    fakeChannel: channel,
  };
}

describe('roomTopic', () => {
  it('returns a prefixed, lowercased channel topic', () => {
    expect(roomTopic('ABCDEF')).toBe('room:abcdef');
  });
});

describe('roomChannel', () => {
  it('creates a Realtime channel with presence keyed by playerId', () => {
    const client = makeFakeClient();
    roomChannel(client as never, { code: 'XJ4PMQ', playerId: 'player-123' });
    expect(client.channel).toHaveBeenCalledTimes(1);
    const [topic, opts] = client.channel.mock.calls[0];
    expect(topic).toBe('room:xj4pmq');
    expect(opts).toEqual({
      config: {
        presence: { key: 'player-123' },
        broadcast: { ack: false, self: false },
      },
    });
  });

  it('returns the channel unmodified (caller subscribes)', () => {
    const client = makeFakeClient();
    const ch = roomChannel(client as never, { code: 'abcdef', playerId: 'p1' });
    expect(ch).toBe(client.fakeChannel);
  });
});

describe('broadcastSubmission', () => {
  it('sends a broadcast with event=submission and the payload', async () => {
    const client = makeFakeClient();
    const ch = roomChannel(client as never, { code: 'abcdef', playerId: 'p1' });
    await broadcastSubmission(ch, {
      sessionId: 's1',
      roundId: 'r1',
      playerId: 'p1',
    });
    expect(client.fakeChannel.send).toHaveBeenCalledWith({
      type: 'broadcast',
      event: ROOM_BROADCAST_EVENTS.submission,
      payload: { sessionId: 's1', roundId: 'r1', playerId: 'p1' },
    });
  });
});

describe('broadcastState', () => {
  it('sends a broadcast with event=state and the payload', async () => {
    const client = makeFakeClient();
    const ch = roomChannel(client as never, { code: 'abcdef', playerId: 'p1' });
    await broadcastState(ch, {
      sessionId: 's1',
      roundIndex: 2,
      state: 'revealed',
    });
    expect(client.fakeChannel.send).toHaveBeenCalledWith({
      type: 'broadcast',
      event: ROOM_BROADCAST_EVENTS.state,
      payload: { sessionId: 's1', roundIndex: 2, state: 'revealed' },
    });
  });
});
