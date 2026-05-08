import { REALTIME_SUBSCRIBE_STATES } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { mapSubscribeStatus, subscribeRoomChannel } from './connection-status';

describe('mapSubscribeStatus', () => {
  it('maps SUBSCRIBED to live', () => {
    expect(mapSubscribeStatus(REALTIME_SUBSCRIBE_STATES.SUBSCRIBED)).toBe('live');
  });

  it('maps CHANNEL_ERROR and TIMED_OUT to reconnecting', () => {
    expect(mapSubscribeStatus(REALTIME_SUBSCRIBE_STATES.CHANNEL_ERROR)).toBe('reconnecting');
    expect(mapSubscribeStatus(REALTIME_SUBSCRIBE_STATES.TIMED_OUT)).toBe('reconnecting');
  });

  it('maps CLOSED to disconnected', () => {
    expect(mapSubscribeStatus(REALTIME_SUBSCRIBE_STATES.CLOSED)).toBe('disconnected');
  });
});

describe('subscribeRoomChannel', () => {
  function makeFakeChannel() {
    const subscribe = vi.fn().mockImplementation(function (this: unknown) {
      return this;
    });
    return { subscribe } as unknown as Parameters<typeof subscribeRoomChannel>[0] & {
      subscribe: typeof subscribe;
    };
  }

  it('forwards mapped status to the consumer callback', () => {
    const ch = makeFakeChannel();
    const onStatus = vi.fn();
    subscribeRoomChannel(ch, onStatus);

    const innerCb = (ch.subscribe as ReturnType<typeof vi.fn>).mock.calls[0][0] as (
      s: REALTIME_SUBSCRIBE_STATES,
      err?: Error,
    ) => void;

    innerCb(REALTIME_SUBSCRIBE_STATES.SUBSCRIBED);
    expect(onStatus).toHaveBeenLastCalledWith('live', undefined);

    const err = new Error('boom');
    innerCb(REALTIME_SUBSCRIBE_STATES.CHANNEL_ERROR, err);
    expect(onStatus).toHaveBeenLastCalledWith('reconnecting', err);

    innerCb(REALTIME_SUBSCRIBE_STATES.CLOSED);
    expect(onStatus).toHaveBeenLastCalledWith('disconnected', undefined);
  });

  it('returns the channel for chaining', () => {
    const ch = makeFakeChannel();
    expect(subscribeRoomChannel(ch, () => {})).toBe(ch);
  });
});
