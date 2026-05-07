import type { Metadata } from 'next';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';

export const metadata: Metadata = {
  title: 'Components matrix · dev',
  robots: { index: false, follow: false },
};

const SECTIONS = [
  { id: 'button', label: 'Button' },
  { id: 'input', label: 'Input' },
  { id: 'textarea', label: 'Textarea' },
  { id: 'card', label: 'Card' },
  { id: 'badge', label: 'Badge' },
  { id: 'avatar', label: 'Avatar' },
  { id: 'skeleton', label: 'Skeleton' },
  { id: 'progress', label: 'Progress' },
];

const BUTTON_VARIANTS = ['primary', 'secondary', 'ghost', 'danger'] as const;
const BUTTON_SIZES = ['sm', 'md', 'lg', 'icon'] as const;

type ButtonVariant = (typeof BUTTON_VARIANTS)[number];
type ButtonSize = (typeof BUTTON_SIZES)[number];

function ButtonCell({
  variant,
  size,
  state,
}: {
  variant: ButtonVariant;
  size: ButtonSize;
  state: 'default' | 'hover' | 'focus-visible' | 'active' | 'disabled' | 'loading';
}) {
  const label = size === 'icon' ? '★' : `${variant} ${size}`;
  const ariaLabel = size === 'icon' ? `${variant} ${size} icon button` : undefined;
  // Visual approximations of pseudo-states using data-attrs + companion classes
  // so reviewers can eyeball every state on the static page. The :hover/:focus-visible/:active
  // CSS still works on real interaction; these utilities just *also* render that look.
  const stateClass =
    state === 'hover'
      ? variant === 'primary'
        ? 'bg-accent-hi'
        : variant === 'secondary'
          ? 'bg-surface-2/80 border-text-faint'
          : variant === 'ghost'
            ? 'bg-surface'
            : 'opacity-90'
      : state === 'focus-visible'
        ? 'ring-2 ring-accent ring-offset-2 ring-offset-bg outline-none'
        : state === 'active'
          ? 'translate-y-px'
          : '';
  return (
    <Button
      variant={variant}
      size={size}
      disabled={state === 'disabled'}
      loading={state === 'loading'}
      className={stateClass}
      aria-label={ariaLabel}
    >
      {label}
    </Button>
  );
}

function ButtonSection() {
  const states = ['default', 'hover', 'focus-visible', 'active', 'disabled', 'loading'] as const;
  return (
    <section id="button" className="scroll-mt-20 space-y-6">
      <header>
        <h2 className="font-display text-2xl font-semibold text-text">Button</h2>
        <p className="font-mono text-xs text-text-faint">variant × size × state — DESIGN.md §2</p>
      </header>

      {BUTTON_VARIANTS.map((variant) => (
        <div key={variant} className="space-y-3">
          <h3 className="font-mono text-xs uppercase tracking-wider text-text-muted">{variant}</h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-separate border-spacing-3 text-left">
              <thead>
                <tr>
                  <th
                    className="font-mono text-xs uppercase tracking-wider text-text-faint"
                    data-row-label
                  >
                    {variant}
                  </th>
                  {BUTTON_SIZES.map((size) => (
                    <th
                      key={size}
                      className="font-mono text-xs uppercase tracking-wider text-text-muted"
                    >
                      {size}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {states.map((state) => (
                  <tr key={state}>
                    <td className="font-mono text-xs text-text-muted">{state}</td>
                    {BUTTON_SIZES.map((size) => (
                      <td key={size}>
                        <ButtonCell variant={variant} size={size} state={state} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </section>
  );
}

function InputSection() {
  return (
    <section id="input" className="scroll-mt-20 space-y-4">
      <header>
        <h2 className="font-display text-2xl font-semibold text-text">Input</h2>
        <p className="font-mono text-xs text-text-faint">default · focus · error · disabled</p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <p className="font-mono text-xs uppercase tracking-wider text-text-muted">default</p>
          <Input placeholder="kevin36615@example.com" />
        </div>
        <div className="space-y-1.5">
          <p className="font-mono text-xs uppercase tracking-wider text-text-muted">focus</p>
          <Input
            placeholder="focus state (border + glow)"
            className="border-accent shadow-[var(--shadow-glow)]"
          />
        </div>
        <div className="space-y-1.5">
          <p className="font-mono text-xs uppercase tracking-wider text-danger">error</p>
          <Input error placeholder="invalid" defaultValue="not-an-email" />
          <p className="font-mono text-xs text-danger">enter a valid email</p>
        </div>
        <div className="space-y-1.5">
          <p className="font-mono text-xs uppercase tracking-wider text-text-faint">disabled</p>
          <Input disabled placeholder="disabled" />
        </div>
      </div>
    </section>
  );
}

function TextareaSection() {
  return (
    <section id="textarea" className="scroll-mt-20 space-y-4">
      <header>
        <h2 className="font-display text-2xl font-semibold text-text">Textarea</h2>
        <p className="font-mono text-xs text-text-faint">default · focus · error · disabled</p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <p className="font-mono text-xs uppercase tracking-wider text-text-muted">default</p>
          <Textarea placeholder="what do you think the top comment said?" />
        </div>
        <div className="space-y-1.5">
          <p className="font-mono text-xs uppercase tracking-wider text-text-muted">focus</p>
          <Textarea
            placeholder="focus state"
            className="border-accent shadow-[var(--shadow-glow)]"
          />
        </div>
        <div className="space-y-1.5">
          <p className="font-mono text-xs uppercase tracking-wider text-danger">error</p>
          <Textarea error defaultValue="" placeholder="must not be empty" />
          <p className="font-mono text-xs text-danger">guess can&apos;t be empty</p>
        </div>
        <div className="space-y-1.5">
          <p className="font-mono text-xs uppercase tracking-wider text-text-faint">disabled</p>
          <Textarea disabled placeholder="disabled" />
        </div>
      </div>
    </section>
  );
}

function CardSection() {
  return (
    <section id="card" className="scroll-mt-20 space-y-4">
      <header>
        <h2 className="font-display text-2xl font-semibold text-text">Card</h2>
        <p className="font-mono text-xs text-text-faint">default · elevated · dashed</p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <h3 className="font-display text-lg font-semibold text-text">default</h3>
          <p className="text-sm text-text-muted">surface-2 with a hairline border.</p>
        </Card>
        <Card variant="elevated">
          <h3 className="font-display text-lg font-semibold text-text">elevated</h3>
          <p className="text-sm text-text-muted">adds shadow-md for emphasis.</p>
        </Card>
        <Card variant="dashed">
          <h3 className="font-display text-lg font-semibold text-text">dashed</h3>
          <p className="text-sm text-text-muted">placeholder / empty-state surface.</p>
        </Card>
      </div>
    </section>
  );
}

function BadgeSection() {
  return (
    <section id="badge" className="scroll-mt-20 space-y-4">
      <header>
        <h2 className="font-display text-2xl font-semibold text-text">Badge</h2>
        <p className="font-mono text-xs text-text-faint">
          default · accent · gold · success · danger
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <Badge>default</Badge>
        <Badge variant="accent">accent</Badge>
        <Badge variant="gold">gold</Badge>
        <Badge variant="success">success</Badge>
        <Badge variant="danger">danger</Badge>
      </div>
    </section>
  );
}

function AvatarSection() {
  const slots = [0, 1, 2, 3, 4, 5, 6, 7];
  return (
    <section id="avatar" className="scroll-mt-20 space-y-6">
      <header>
        <h2 className="font-display text-2xl font-semibold text-text">Avatar</h2>
        <p className="font-mono text-xs text-text-faint">
          size · initial fallback · image · &apos;you&apos; variant · slot palette — DESIGN.md §2
        </p>
      </header>

      <div className="space-y-3">
        <h3 className="font-mono text-xs uppercase tracking-wider text-text-muted">size</h3>
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-center gap-1">
            <Avatar name="Sam" size="sm" slot={0} />
            <span className="font-mono text-xs text-text-faint">sm</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Avatar name="Sam" size="md" slot={0} />
            <span className="font-mono text-xs text-text-faint">md</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Avatar name="Sam" size="lg" slot={0} />
            <span className="font-mono text-xs text-text-faint">lg</span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="font-mono text-xs uppercase tracking-wider text-text-muted">
          initial fallback (per-slot palette)
        </h3>
        <div className="flex flex-wrap items-center gap-3">
          {slots.map((s) => (
            <div key={s} className="flex flex-col items-center gap-1">
              <Avatar name={`P${s + 1}`} slot={s} />
              <span className="font-mono text-xs text-text-faint">slot {s}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="font-mono text-xs uppercase tracking-wider text-text-muted">
          you variant (accent-2 background)
        </h3>
        <div className="flex items-center gap-3">
          <Avatar name="me" variant="you" size="sm" />
          <Avatar name="me" variant="you" size="md" />
          <Avatar name="me" variant="you" size="lg" />
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="font-mono text-xs uppercase tracking-wider text-text-muted">image source</h3>
        <div className="flex items-center gap-3">
          <Avatar
            name="Reddit"
            src="data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20viewBox%3D%220%200%2040%2040%22%3E%3Crect%20width%3D%2240%22%20height%3D%2240%22%20fill%3D%22%23e8814a%22/%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2255%25%22%20text-anchor%3D%22middle%22%20font-family%3D%22monospace%22%20font-size%3D%2218%22%20fill%3D%22%231a0e07%22%3ER%3C/text%3E%3C/svg%3E"
            alt="example image avatar"
          />
          <span className="font-mono text-xs text-text-faint">image</span>
        </div>
      </div>
    </section>
  );
}

function SkeletonSection() {
  return (
    <section id="skeleton" className="scroll-mt-20 space-y-4">
      <header>
        <h2 className="font-display text-2xl font-semibold text-text">Skeleton</h2>
        <p className="font-mono text-xs text-text-faint">
          bg-surface-2 · rounded-md · animate-pulse
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <p className="font-mono text-xs uppercase tracking-wider text-text-muted">comment row</p>
          <div className="flex items-start gap-3">
            <Skeleton className="h-9 w-9 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <p className="font-mono text-xs uppercase tracking-wider text-text-muted">
            leaderboard row
          </p>
          <div className="space-y-2">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-2/3" />
          </div>
        </div>
      </div>
    </section>
  );
}

function ProgressSection() {
  return (
    <section id="progress" className="scroll-mt-20 space-y-4">
      <header>
        <h2 className="font-display text-2xl font-semibold text-text">Progress (round pips)</h2>
        <p className="font-mono text-xs text-text-faint">
          5 pips · done · now · pending — DESIGN.md §2
        </p>
      </header>

      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((current) => (
          <div key={current} className="flex items-center gap-3">
            <Progress current={current} aria-label={`round ${current} of 5`} />
            <span className="font-mono text-xs text-text-muted">round {current} / 5</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function DevComponentsPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10 md:px-6">
      <header className="mb-10 space-y-2">
        <p className="font-mono text-xs uppercase tracking-wider text-text-faint">
          internal · visual review
        </p>
        <h1 className="font-display text-3xl font-bold leading-tight text-text">
          Components matrix
        </h1>
        <p className="text-text-muted">
          Variant × state matrix for primitives. Sourced from{' '}
          <code className="font-mono text-text">handoff/DESIGN.md §2</code>. Not indexed; not linked
          from the product surface.
        </p>
      </header>

      <nav aria-label="sections" className="mb-10">
        <ul className="flex flex-wrap gap-2">
          {SECTIONS.map((s) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                className="inline-flex items-center rounded-pill border border-border-strong bg-surface px-3 py-1 font-mono text-xs text-text-muted transition-colors duration-[var(--duration-fast,120ms)] hover:bg-surface-2 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
              >
                {s.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="space-y-16">
        <ButtonSection />
        <InputSection />
        <TextareaSection />
        <CardSection />
        <BadgeSection />
        <AvatarSection />
        <SkeletonSection />
        <ProgressSection />
      </div>
    </main>
  );
}
