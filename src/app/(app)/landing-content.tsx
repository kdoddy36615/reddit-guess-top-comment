import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/cn';
import { LandingAuxRow } from './landing-aux-row';

export type LandingAuthState = 'anonymous' | 'permanent';

export interface LandingContentProps {
  authState: LandingAuthState;
  /** ISO timestamp passed through to the aux row's countdown initial state. */
  nowIso: string;
  /** Distinct players who have completed today's daily. */
  playersToday: number;
}

const EXAMPLE_TOP_COMMENTS: { sub: string; quote: string; rank: string }[] = [
  { sub: 'r/tifu', quote: 'sounds like she’s the boss now.', rank: '#1 · 14.2k ↑' },
  { sub: 'r/AskReddit', quote: 'the cat is the only adult in the house.', rank: '#1 · 9.8k ↑' },
  {
    sub: 'r/MaliciousCompliance',
    quote: 'malicious? no. compliant? extremely.',
    rank: '#1 · 6.4k ↑',
  },
];

export function LandingContent({ authState, nowIso, playersToday }: LandingContentProps) {
  return (
    <section className="mx-auto flex w-full max-w-[720px] flex-col items-center gap-8 py-10 text-center md:py-16">
      <Hero />
      {authState === 'permanent' ? <SignedInCtas /> : <AnonymousCtas />}
      <LandingAuxRow nowIso={nowIso} playersToday={playersToday} />
      <ExampleComments />
    </section>
  );
}

function Hero() {
  return (
    <header className="flex w-full flex-col items-center gap-5">
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-text-faint">
        a reddit guessing game
      </p>
      <h1 className="font-display text-2xl font-semibold leading-[1.1] text-text text-balance md:text-3xl">
        guess what reddit said <em className="font-display italic text-accent">next</em>.
      </h1>
      <p data-testid="landing-body" className="max-w-[44ch] text-md leading-[1.4] text-text-muted">
        we show you a Reddit post, you guess the top comment. closer guesses score higher.
      </p>
      <HeroExampleCard />
    </header>
  );
}

function HeroExampleCard() {
  return (
    <Card
      aria-hidden="true"
      data-testid="hero-example-card"
      className="mx-auto w-full max-w-[520px] text-left"
    >
      <div className="flex items-center justify-between gap-3 font-mono text-xs uppercase tracking-wider">
        <span>
          <span className="text-accent">r/tifu</span>
          <span className="text-text-faint"> · 24.1k ↑</span>
        </span>
        <span className="text-text-faint">round 1 / 5</span>
      </div>
      <h2 className="mt-3 font-display text-md font-semibold leading-tight text-text">
        TIFU by texting my boss a photo meant for my partner…
      </h2>
      <div className="mt-4 rounded-md border border-dashed border-border-strong bg-surface-3 px-4 py-3 font-hand text-lg leading-snug text-text-faint">
        your guess goes here
      </div>
    </Card>
  );
}

function AnonymousCtas() {
  const wide = 'w-full sm:w-auto';
  return (
    <div className="flex w-full flex-col items-center gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
      <Link
        href="/play/solo"
        data-testid="cta-solo"
        className={cn(buttonVariants({ variant: 'primary', size: 'lg' }), wide)}
      >
        play solo →
      </Link>
      <Link
        href="/play/daily"
        data-testid="cta-daily"
        className={cn(buttonVariants({ variant: 'secondary', size: 'lg' }), wide)}
      >
        today's daily
      </Link>
      <Link
        href="/rooms"
        data-testid="cta-rooms"
        className={cn(buttonVariants({ variant: 'ghost', size: 'lg' }), wide)}
      >
        play with others
      </Link>
    </div>
  );
}

function SignedInCtas() {
  const wide = 'w-full sm:w-auto';
  return (
    <div className="flex w-full flex-col items-center gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
      <Link
        href="/play/daily"
        data-testid="cta-continue-daily"
        className={cn(buttonVariants({ variant: 'primary', size: 'lg' }), wide)}
      >
        continue your daily
      </Link>
      <Link
        href="/account"
        data-testid="cta-your-stats"
        className={cn(buttonVariants({ variant: 'secondary', size: 'lg' }), wide)}
      >
        your stats
      </Link>
    </div>
  );
}

function ExampleComments() {
  return (
    <div
      data-testid="landing-examples"
      aria-hidden="true"
      className="hidden w-full md:grid md:grid-cols-3 md:gap-4 md:pt-4"
    >
      {EXAMPLE_TOP_COMMENTS.map((c) => (
        <div
          key={c.sub}
          data-testid="example-comment"
          className="border-l-[3px] border-accent bg-surface-2/40 px-4 py-3 text-left"
        >
          <p className="font-mono text-xs uppercase tracking-wider text-text-faint">
            {c.sub} · {c.rank}
          </p>
          <p className="mt-1.5 font-hand text-lg leading-snug text-text">“{c.quote}”</p>
        </div>
      ))}
    </div>
  );
}
