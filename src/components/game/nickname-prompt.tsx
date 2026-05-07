'use client';

import { forwardRef, useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/cn';
import {
  generateNickname as defaultGenerateNickname,
  type GenerateNicknameOptions,
} from '@/lib/nickname/generate';
import { type NicknameRejectionReason, validateNickname } from '@/lib/nickname/validation';

export interface NicknamePromptProps
  extends Omit<React.HTMLAttributes<HTMLFormElement>, 'onSubmit'> {
  /** Pre-populated nickname (e.g. an auto-generated one passed in by the caller). */
  initialNickname: string;
  /** Called with the normalized nickname when the user submits a valid value. */
  onSubmit: (nickname: string) => void;
  /** External pending state — disables submit while a save is in flight. */
  pending?: boolean;
  /**
   * Inject a different generator (used for tests + future personalization).
   * Defaults to the in-repo random adjective+animal pool.
   */
  generateNickname?: (options?: GenerateNicknameOptions) => string;
}

const REASON_TO_MESSAGE: Record<NicknameRejectionReason, string> = {
  invalid_type: 'Pick a nickname.',
  too_short: 'Nickname needs at least 2 characters.',
  too_long: 'Nickname can be at most 24 characters.',
  invalid_chars: 'Nickname can’t contain hidden control characters.',
  profanity: 'Please pick a different word.',
};

export const NicknamePrompt = forwardRef<HTMLFormElement, NicknamePromptProps>(
  function NicknamePrompt(
    {
      initialNickname,
      onSubmit,
      pending = false,
      generateNickname = defaultGenerateNickname,
      className,
      ...props
    },
    ref,
  ) {
    const reactId = useId();
    const inputId = `nickname-prompt-${reactId}`;
    const errorId = `${inputId}-error`;
    const [value, setValue] = useState(initialNickname);
    const [error, setError] = useState<string | null>(null);

    function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
      event.preventDefault();
      const result = validateNickname(value);
      if (!result.ok) {
        setError(REASON_TO_MESSAGE[result.reason]);
        return;
      }
      setError(null);
      onSubmit(result.normalized);
    }

    function handleChange(next: string) {
      setValue(next);
      if (error) setError(null);
    }

    function handleRegenerate() {
      setValue(generateNickname());
      setError(null);
    }

    return (
      <form
        ref={ref}
        data-testid="nickname-prompt"
        onSubmit={handleSubmit}
        className={cn('space-y-3 rounded-lg border border-border bg-surface-2 p-5', className)}
        {...props}
      >
        <div className="space-y-1.5">
          <label
            htmlFor={inputId}
            className="font-mono text-xs uppercase tracking-wider text-text-muted"
          >
            nickname
          </label>
          <p className="text-sm text-text-muted">
            Shown on the leaderboard and in rooms. You can change it later.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
          <Input
            id={inputId}
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            error={Boolean(error)}
            aria-describedby={error ? errorId : undefined}
            placeholder="brave fox"
            autoComplete="off"
            spellCheck={false}
            maxLength={48}
            className="flex-1"
          />
          <Button
            type="button"
            variant="ghost"
            size="md"
            onClick={handleRegenerate}
            data-testid="nickname-prompt-regenerate"
          >
            shuffle
          </Button>
        </div>

        {error ? (
          <p
            id={errorId}
            data-testid="nickname-prompt-error"
            className="font-mono text-xs text-danger"
          >
            {error}
          </p>
        ) : null}

        <div className="flex justify-end">
          <Button type="submit" variant="primary" size="md" disabled={pending} loading={pending}>
            continue
          </Button>
        </div>
      </form>
    );
  },
);
