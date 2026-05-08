'use client';

import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { isValidRoomCode, ROOM_CODE_LENGTH } from '@/lib/rooms/code';

type Action = 'random' | 'create' | 'join' | null;

export function RoomsClient() {
  const router = useRouter();
  const { toast } = useToast();
  const codeInputId = useId();
  const codeErrorId = useId();
  const [pending, setPending] = useState<Action>(null);
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);

  async function postAction(action: Action, url: string): Promise<{ code: string } | null> {
    setPending(action);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
      });
      const payload = (await res.json().catch(() => null)) as {
        code?: string;
        error?: string;
      } | null;
      if (!res.ok || !payload?.code) {
        const message = payload?.error ?? 'Something went wrong. Try again.';
        toast({ title: 'Could not enter the room', description: message, variant: 'error' });
        return null;
      }
      return { code: payload.code };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Network error';
      toast({ title: 'Could not enter the room', description: message, variant: 'error' });
      return null;
    } finally {
      setPending(null);
    }
  }

  async function onJoinRandom() {
    const result = await postAction('random', '/api/rooms/random');
    if (result?.code) router.replace(`/r/${result.code}`);
  }

  async function onCreateRoom() {
    const result = await postAction('create', '/api/rooms/create');
    if (result?.code) router.replace(`/r/${result.code}`);
  }

  async function onJoinByCode(e: React.FormEvent) {
    e.preventDefault();
    const normalized = code.trim().toUpperCase();
    if (!isValidRoomCode(normalized)) {
      setCodeError(`Codes are ${ROOM_CODE_LENGTH} characters — letters and numbers only.`);
      return;
    }
    setCodeError(null);
    setPending('join');
    try {
      const res = await fetch('/api/rooms/join', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code: normalized }),
      });
      const payload = (await res.json().catch(() => null)) as {
        code?: string;
        error?: string;
      } | null;
      if (!res.ok || !payload?.code) {
        const message = payload?.error ?? "Couldn't find that room.";
        setCodeError(message);
        toast({ title: 'Could not join', description: message, variant: 'error' });
        return;
      }
      router.replace(`/r/${payload.code}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Network error';
      setCodeError(message);
      toast({ title: 'Could not join', description: message, variant: 'error' });
    } finally {
      setPending(null);
    }
  }

  return (
    <section data-testid="rooms-hub" className="space-y-8 py-8">
      <header className="space-y-1">
        <p className="font-mono text-xs uppercase tracking-wider text-text-faint">multiplayer</p>
        <h1 className="font-display text-2xl font-semibold leading-tight text-text">
          Play with others
        </h1>
        <p className="text-sm text-text-muted">
          Three ways in: drop into a random match, host a room, or take an invite.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card data-testid="join-random-card" className="flex flex-col gap-3">
          <p className="font-mono text-xs uppercase tracking-wider text-text-faint">join random</p>
          <p className="font-display text-md font-semibold text-text">Drop into a match</p>
          <p className="text-sm text-text-muted">
            We'll queue you with up to 7 other players. Match starts when the room fills or after 90
            seconds (min 3 players).
          </p>
          <div className="mt-auto pt-2">
            <Button
              type="button"
              variant="primary"
              size="lg"
              className="w-full"
              loading={pending === 'random'}
              disabled={pending !== null}
              onClick={onJoinRandom}
              data-testid="join-random-button"
            >
              {pending === 'random' ? 'Queueing…' : 'Join random'}
            </Button>
          </div>
        </Card>

        <Card data-testid="create-room-card" className="flex flex-col gap-3">
          <p className="font-mono text-xs uppercase tracking-wider text-text-faint">create room</p>
          <p className="font-display text-md font-semibold text-text">Host a private match</p>
          <p className="text-sm text-text-muted">
            Get a 6-character code to share. Up to 32 players, host picks rounds and timer.
          </p>
          <div className="mt-auto pt-2">
            <Button
              type="button"
              variant="secondary"
              size="lg"
              className="w-full"
              loading={pending === 'create'}
              disabled={pending !== null}
              onClick={onCreateRoom}
              data-testid="create-room-button"
            >
              {pending === 'create' ? 'Creating…' : 'Create room'}
            </Button>
          </div>
        </Card>

        <Card data-testid="join-by-code-card" className="flex flex-col gap-3">
          <p className="font-mono text-xs uppercase tracking-wider text-text-faint">join by code</p>
          <p className="font-display text-md font-semibold text-text">Have an invite?</p>
          <form onSubmit={onJoinByCode} className="mt-auto flex flex-col gap-3" noValidate>
            <div className="space-y-1.5">
              <label htmlFor={codeInputId} className="block font-medium text-sm text-text-muted">
                Room code
              </label>
              <Input
                id={codeInputId}
                data-testid="join-code-input"
                name="code"
                inputMode="text"
                autoCapitalize="characters"
                autoComplete="off"
                spellCheck={false}
                maxLength={ROOM_CODE_LENGTH}
                placeholder="ABCDEF"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  if (codeError) setCodeError(null);
                }}
                disabled={pending !== null}
                error={codeError !== null}
                aria-describedby={codeError ? codeErrorId : undefined}
                className="font-mono uppercase tracking-widest"
              />
              {codeError ? (
                <p
                  id={codeErrorId}
                  data-testid="join-code-error"
                  role="alert"
                  className="text-danger text-sm"
                >
                  {codeError}
                </p>
              ) : null}
            </div>
            <Button
              type="submit"
              variant="secondary"
              size="lg"
              className="w-full"
              loading={pending === 'join'}
              disabled={pending !== null}
              data-testid="join-code-button"
            >
              {pending === 'join' ? 'Joining…' : 'Join room'}
            </Button>
          </form>
        </Card>
      </div>
    </section>
  );
}
