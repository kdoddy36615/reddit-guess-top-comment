import type { Metadata } from 'next';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
      </div>
    </main>
  );
}
