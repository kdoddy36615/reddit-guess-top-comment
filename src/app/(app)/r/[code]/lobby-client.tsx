'use client';

import type { RealtimeChannel } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { PlayerChip, type PlayerChipState } from '@/components/game/player-chip';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConnectionBanner } from '@/components/ui/connection-banner';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import type { Room, RoomPlayer } from '@/db/rooms';
import {
  type ConnectionStatus,
  ROOM_BROADCAST_EVENTS,
  roomChannel,
  subscribeRoomChannel,
} from '@/lib/realtime';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

const RANDOM_LOBBY_TIMEOUT_SECONDS = 90;

export interface LobbyClientProps {
  code: string;
  initialRoom: Room;
  initialPlayers: RoomPlayer[];
  viewerId: string;
  viewerNickname: string;
}

type PendingAction = 'start' | 'lock' | 'kick' | 'settings' | null;

interface LobbyBroadcastPayload {
  kind: 'lobby_update';
}

/**
 * Multiplayer lobby — wires Realtime presence + state broadcasts onto the SSR
 * snapshot from `LobbyPage`. Renders host vs guest controls and the random-
 * mode countdown / fill counter.
 *
 * Sync model:
 *   - Presence sync drives chip state (`typing` vs `disconnected`).
 *   - Mutations go through the API routes; the host's client follows up with
 *     a `state` broadcast carrying `{ kind: 'lobby_update' }` so other
 *     clients call `router.refresh()` and re-fetch the room snapshot.
 */
export function LobbyClient({
  code,
  initialRoom,
  initialPlayers,
  viewerId,
  viewerNickname,
}: LobbyClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const channelRef = useRef<RealtimeChannel | null>(null);

  const [connection, setConnection] = useState<ConnectionStatus>('reconnecting');
  const [presentIds, setPresentIds] = useState<Set<string>>(() => new Set([viewerId]));
  const [pending, setPending] = useState<PendingAction>(null);
  const [roundCount, setRoundCount] = useState(initialRoom.round_count);
  const [timerSeconds, setTimerSeconds] = useState(initialRoom.timer_seconds);

  const isHost = initialRoom.host_id === viewerId;
  const isHostMode = initialRoom.mode === 'host';
  const activePlayers = useMemo(() => initialPlayers.filter((p) => !p.is_kicked), [initialPlayers]);
  const totalSlots = initialRoom.max_players;

  // Re-sync local input state with whatever SSR last produced (after refresh).
  useEffect(() => {
    setRoundCount(initialRoom.round_count);
    setTimerSeconds(initialRoom.timer_seconds);
  }, [initialRoom.round_count, initialRoom.timer_seconds]);

  const broadcastLobbyUpdate = useCallback(() => {
    const channel = channelRef.current;
    if (!channel) return;
    const payload: LobbyBroadcastPayload = { kind: 'lobby_update' };
    channel.send({
      type: 'broadcast',
      event: ROOM_BROADCAST_EVENTS.state,
      payload,
    });
  }, []);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    const channel = roomChannel(supabase, { code, playerId: viewerId });
    channelRef.current = channel;

    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      setPresentIds(new Set(Object.keys(state)));
    });

    channel.on('broadcast', { event: ROOM_BROADCAST_EVENTS.state }, ({ payload }) => {
      const p = payload as Partial<LobbyBroadcastPayload>;
      if (p?.kind === 'lobby_update') {
        router.refresh();
      }
    });

    subscribeRoomChannel(channel, async (status) => {
      setConnection(status);
      if (status === 'live') {
        await channel.track({ id: viewerId, nickname: viewerNickname, joinedAt: Date.now() });
      }
    });

    return () => {
      channelRef.current = null;
      channel.unsubscribe();
    };
  }, [code, viewerId, viewerNickname, router]);

  async function postAction(action: PendingAction, url: string, body?: unknown): Promise<boolean> {
    setPending(action);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { error?: string } | null;
        toast({
          title: "Couldn't update the room",
          description: payload?.error ?? 'Try again in a moment.',
          variant: 'error',
        });
        return false;
      }
      router.refresh();
      broadcastLobbyUpdate();
      return true;
    } catch (err) {
      toast({
        title: "Couldn't update the room",
        description: err instanceof Error ? err.message : 'Network error',
        variant: 'error',
      });
      return false;
    } finally {
      setPending(null);
    }
  }

  async function onStart() {
    await postAction('start', `/api/rooms/${code}/start`);
  }
  async function onToggleLock() {
    await postAction('lock', `/api/rooms/${code}/lock`, { locked: !initialRoom.locked });
  }
  async function onKick(playerId: string) {
    await postAction('kick', `/api/rooms/${code}/kick`, { playerId });
  }
  async function onSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    await postAction('settings', `/api/rooms/${code}/settings`, {
      roundCount,
      timerSeconds,
    });
  }

  return (
    <section data-testid="lobby" className="space-y-6 py-6">
      <ConnectionBanner status={connection} />

      <header className="space-y-1">
        <p className="font-mono text-xs uppercase tracking-wider text-text-faint">
          {initialRoom.mode === 'random' ? 'random match' : 'private room'}
        </p>
        <h1 className="font-display text-2xl font-semibold leading-tight text-text">
          Room <span className="font-mono uppercase text-accent-2">{code}</span>
        </h1>
        <p className="text-sm text-text-muted">
          {isHostMode
            ? isHost
              ? 'You host this room. Tweak the settings and start when ready.'
              : 'Waiting for the host to start the match.'
            : "We'll start when the room fills or the countdown runs out (min 3)."}
        </p>
      </header>

      {initialRoom.mode === 'random' ? (
        <RandomLobbyMeta room={initialRoom} count={activePlayers.length} />
      ) : null}

      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="font-mono text-xs uppercase tracking-wider text-text-faint">
            players ({activePlayers.length}/{totalSlots})
          </p>
          {initialRoom.locked ? (
            <span data-testid="lobby-lock-indicator" className="font-mono text-xs text-warning">
              locked
            </span>
          ) : null}
        </div>
        <ul data-testid="lobby-players" className="flex flex-wrap gap-2">
          {initialPlayers.length === 0 ? (
            <li className="text-sm text-text-muted">No players yet…</li>
          ) : (
            initialPlayers.map((p) => {
              const state = chipStateFor(p, presentIds);
              const isYou = p.player_id === viewerId;
              return (
                <li key={p.player_id} className="inline-flex items-center gap-1">
                  <PlayerChip
                    name={p.nickname ?? 'player'}
                    state={state}
                    isYou={isYou}
                    data-testid={`lobby-player-${p.player_id}`}
                  />
                  {isHost && !isYou && !p.is_kicked ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      data-testid={`lobby-kick-${p.player_id}`}
                      disabled={pending !== null}
                      onClick={() => onKick(p.player_id)}
                    >
                      kick
                    </Button>
                  ) : null}
                </li>
              );
            })
          )}
        </ul>
      </Card>

      {isHostMode && isHost ? (
        <HostControls
          locked={initialRoom.locked}
          pending={pending}
          roundCount={roundCount}
          timerSeconds={timerSeconds}
          onChangeRoundCount={setRoundCount}
          onChangeTimerSeconds={setTimerSeconds}
          onStart={onStart}
          onToggleLock={onToggleLock}
          onSaveSettings={onSaveSettings}
        />
      ) : null}

      {isHostMode && !isHost ? (
        <Card data-testid="guest-waiting" className="text-sm text-text-muted">
          Waiting for the host to start the match…
        </Card>
      ) : null}
    </section>
  );
}

function chipStateFor(p: RoomPlayer, presence: Set<string>): PlayerChipState {
  if (p.is_kicked) return 'kicked';
  if (!presence.has(p.player_id)) return 'disconnected';
  return 'typing';
}

function RandomLobbyMeta({ room, count }: { room: Room; count: number }) {
  const startedAt = useMemo(() => Date.parse(room.created_at), [room.created_at]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const elapsed = Math.max(0, Math.floor((now - startedAt) / 1000));
  const remaining = Math.max(0, RANDOM_LOBBY_TIMEOUT_SECONDS - elapsed);

  return (
    <Card data-testid="random-meta" className="flex flex-wrap items-center gap-4">
      <div className="flex flex-col">
        <span className="font-mono text-xs uppercase tracking-wider text-text-faint">filled</span>
        <span data-testid="random-fill" className="font-display text-md font-semibold text-text">
          {count}/{room.max_players}
        </span>
      </div>
      <div className="flex flex-col">
        <span className="font-mono text-xs uppercase tracking-wider text-text-faint">
          starts in
        </span>
        <span
          data-testid="random-countdown"
          className="font-mono text-md tabular-nums text-text"
          aria-live="polite"
        >
          {remaining}s
        </span>
      </div>
    </Card>
  );
}

interface HostControlsProps {
  locked: boolean;
  pending: PendingAction;
  roundCount: number;
  timerSeconds: number;
  onChangeRoundCount: (n: number) => void;
  onChangeTimerSeconds: (n: number) => void;
  onStart: () => void;
  onToggleLock: () => void;
  onSaveSettings: (e: React.FormEvent) => void;
}

function HostControls({
  locked,
  pending,
  roundCount,
  timerSeconds,
  onChangeRoundCount,
  onChangeTimerSeconds,
  onStart,
  onToggleLock,
  onSaveSettings,
}: HostControlsProps) {
  const roundsId = useId();
  const timerId = useId();
  return (
    <Card data-testid="host-controls" className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="font-mono text-xs uppercase tracking-wider text-text-faint">host controls</p>
      </div>
      <form onSubmit={onSaveSettings} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor={roundsId} className="block font-medium text-sm text-text-muted">
            Rounds (3–20)
          </label>
          <Input
            id={roundsId}
            data-testid="host-rounds-input"
            type="number"
            min={3}
            max={20}
            value={roundCount}
            onChange={(e) => onChangeRoundCount(Number(e.target.value))}
            disabled={pending !== null}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor={timerId} className="block font-medium text-sm text-text-muted">
            Round timer (10–120s)
          </label>
          <Input
            id={timerId}
            data-testid="host-timer-input"
            type="number"
            min={10}
            max={120}
            value={timerSeconds}
            onChange={(e) => onChangeTimerSeconds(Number(e.target.value))}
            disabled={pending !== null}
          />
        </div>
        <div className="sm:col-span-2">
          <Button
            type="submit"
            variant="secondary"
            size="md"
            loading={pending === 'settings'}
            disabled={pending !== null}
            data-testid="host-save-settings"
          >
            Save settings
          </Button>
        </div>
      </form>

      <div className="flex flex-wrap gap-3 border-t border-border pt-4">
        <Button
          type="button"
          variant="primary"
          size="lg"
          loading={pending === 'start'}
          disabled={pending !== null}
          onClick={onStart}
          data-testid="host-start-button"
        >
          Start match
        </Button>
        <Button
          type="button"
          variant={locked ? 'danger' : 'secondary'}
          size="lg"
          loading={pending === 'lock'}
          disabled={pending !== null}
          onClick={onToggleLock}
          data-testid="host-lock-toggle"
        >
          {locked ? 'Unlock room' : 'Lock room'}
        </Button>
      </div>
    </Card>
  );
}
