import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';

/**
 * Multiplayer room channel topics use a `room:<code>` prefix. Codes are
 * canonicalized to lower-case so a player joining with `ABCDEF` and another
 * with `abcdef` land on the same channel.
 */
export const ROOM_TOPIC_PREFIX = 'room:';

export const ROOM_BROADCAST_EVENTS = {
  submission: 'submission',
  state: 'state',
} as const;

export type RoomBroadcastEvent = (typeof ROOM_BROADCAST_EVENTS)[keyof typeof ROOM_BROADCAST_EVENTS];

export interface SubmissionPayload {
  sessionId: string;
  roundId: string;
  playerId: string;
}

export type RoundLifecycleState = 'guessing' | 'revealed' | 'session_complete';

export interface RoundStatePayload {
  sessionId: string;
  roundIndex: number;
  state: RoundLifecycleState;
}

export function roomTopic(code: string): string {
  return `${ROOM_TOPIC_PREFIX}${code.toLowerCase()}`;
}

export interface RoomChannelOptions {
  code: string;
  playerId: string;
}

export function roomChannel(
  client: SupabaseClient,
  { code, playerId }: RoomChannelOptions,
): RealtimeChannel {
  return client.channel(roomTopic(code), {
    config: {
      presence: { key: playerId },
      broadcast: { ack: false, self: false },
    },
  });
}

export function broadcastSubmission(channel: RealtimeChannel, payload: SubmissionPayload) {
  return channel.send({
    type: 'broadcast',
    event: ROOM_BROADCAST_EVENTS.submission,
    payload,
  });
}

export function broadcastState(channel: RealtimeChannel, payload: RoundStatePayload) {
  return channel.send({
    type: 'broadcast',
    event: ROOM_BROADCAST_EVENTS.state,
    payload,
  });
}
