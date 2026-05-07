'use client';

import { NicknamePrompt } from '@/components/game/nickname-prompt';

export function NicknamePromptSection() {
  // Two states reviewers care about: empty (user must pick or shuffle) and
  // pre-filled (auto-generated — the room-join + first-round happy path).
  return (
    <section id="nickname-prompt" className="scroll-mt-20 space-y-6">
      <header>
        <h2 className="font-display text-2xl font-semibold text-text">NicknamePrompt</h2>
        <p className="font-mono text-xs text-text-faint">
          inline picker · round 1 of solo/daily + anonymous room-join — DESIGN.md §2 game components
        </p>
      </header>

      <div className="grid gap-8 md:grid-cols-2">
        <div className="space-y-3">
          <p className="font-mono text-xs uppercase tracking-wider text-text-muted">
            pre-filled (auto-generated)
          </p>
          <NicknamePrompt initialNickname="brave fox" onSubmit={() => {}} />
        </div>
        <div className="space-y-3">
          <p className="font-mono text-xs uppercase tracking-wider text-text-muted">empty</p>
          <NicknamePrompt initialNickname="" onSubmit={() => {}} />
        </div>
      </div>
    </section>
  );
}
