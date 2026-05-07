'use client';

import { useState } from 'react';
import { GuessInput } from '@/components/game/guess-input';

export function GuessInputSection() {
  const [defaultValue, setDefaultValue] = useState('');
  const [typingValue, setTypingValue] = useState(
    'i bet they said something about the cat being the real boss',
  );
  const [submittingValue, setSubmittingValue] = useState('locked in — sending…');
  const [errorValue, setErrorValue] = useState('');

  return (
    <section id="guess-input" className="scroll-mt-20 space-y-6">
      <header>
        <h2 className="font-display text-2xl font-semibold text-text">GuessInput</h2>
        <p className="font-mono text-xs text-text-faint">
          default · typing · submitting · error — DESIGN.md §2 game components
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-1.5">
          <p className="font-mono text-xs uppercase tracking-wider text-text-muted">default</p>
          <GuessInput
            value={defaultValue}
            onChange={setDefaultValue}
            onSubmit={() => {}}
          />
        </div>
        <div className="space-y-1.5">
          <p className="font-mono text-xs uppercase tracking-wider text-text-muted">typing</p>
          <GuessInput
            value={typingValue}
            onChange={setTypingValue}
            onSubmit={() => {}}
          />
        </div>
        <div className="space-y-1.5">
          <p className="font-mono text-xs uppercase tracking-wider text-text-muted">submitting</p>
          <GuessInput
            value={submittingValue}
            onChange={setSubmittingValue}
            onSubmit={() => {}}
            submitting
          />
        </div>
        <div className="space-y-1.5">
          <p className="font-mono text-xs uppercase tracking-wider text-danger">error</p>
          <GuessInput
            value={errorValue}
            onChange={setErrorValue}
            onSubmit={() => {}}
            error="guess can't be empty"
          />
        </div>
      </div>
    </section>
  );
}
