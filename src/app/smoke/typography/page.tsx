import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Typography smoke',
  robots: { index: false, follow: false },
};

export default function TypographySmokePage() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-8 p-8">
      <section>
        <p className="text-xs uppercase tracking-wider text-text-muted font-mono">display</p>
        <h1 className="font-display text-3xl font-bold leading-tight text-text">
          Guess the top comment
        </h1>
      </section>

      <section>
        <p className="text-xs uppercase tracking-wider text-text-muted font-mono">sans (body)</p>
        <p className="font-sans text-md text-text">
          Read a Reddit post title. Guess what the top comment said. See how close you got.
        </p>
      </section>

      <section>
        <p className="text-xs uppercase tracking-wider text-text-muted font-mono">mono</p>
        <p className="font-mono text-sm text-text-muted">r/AskReddit · 4h · 12,847 upvotes</p>
      </section>

      <section>
        <p className="text-xs uppercase tracking-wider text-text-muted font-mono">hand (guess)</p>
        <p className="font-hand text-lg text-text">that's just a wednesday for my cat tbh</p>
      </section>
    </main>
  );
}
