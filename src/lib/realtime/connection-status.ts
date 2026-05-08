import { REALTIME_SUBSCRIBE_STATES, type RealtimeChannel } from '@supabase/supabase-js';

/**
 * Three banner-visible connection states. `live` hides the banner;
 * `reconnecting` shows the warning banner while the SDK retries; `disconnected`
 * shows the danger banner once the channel has closed.
 */
export type ConnectionStatus = 'live' | 'reconnecting' | 'disconnected';

export function mapSubscribeStatus(state: REALTIME_SUBSCRIBE_STATES): ConnectionStatus {
  switch (state) {
    case REALTIME_SUBSCRIBE_STATES.SUBSCRIBED:
      return 'live';
    case REALTIME_SUBSCRIBE_STATES.CHANNEL_ERROR:
    case REALTIME_SUBSCRIBE_STATES.TIMED_OUT:
      return 'reconnecting';
    case REALTIME_SUBSCRIBE_STATES.CLOSED:
      return 'disconnected';
  }
}

export type ConnectionStatusCallback = (status: ConnectionStatus, err?: Error) => void;

export function subscribeRoomChannel(
  channel: RealtimeChannel,
  onStatus: ConnectionStatusCallback,
  timeoutMs?: number,
): RealtimeChannel {
  return channel.subscribe((state, err) => {
    onStatus(mapSubscribeStatus(state), err);
  }, timeoutMs);
}
