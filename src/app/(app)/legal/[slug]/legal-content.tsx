import type { LegalPage } from './legal-pages';

export interface LegalContentProps {
  page: LegalPage;
}

export function LegalContent({ page }: LegalContentProps) {
  return (
    <article className="mx-auto w-full max-w-[65ch] px-1 py-10 md:py-14 font-sans text-base text-text-muted leading-relaxed">
      <header>
        <h1 className="font-display text-2xl font-semibold text-text leading-tight md:text-3xl">
          {page.title}
        </h1>
        <p className="mt-2 text-sm text-text-faint">Last updated {page.lastUpdated}</p>
      </header>

      {page.placeholder ? (
        <aside
          role="note"
          className="mt-6 rounded-md border border-border bg-surface-2/60 px-4 py-3 text-sm text-text-muted"
        >
          <strong className="font-semibold text-text">Placeholder.</strong> This is draft
          boilerplate, not legal advice. It will be replaced with reviewed copy before any paid
          features ship.
        </aside>
      ) : null}

      <p className="mt-6 text-text">{page.intro}</p>

      {page.sections.map((section) => (
        <section key={section.heading} className="mt-8">
          <h2 className="font-display text-lg font-semibold text-text leading-snug md:text-xl">
            {section.heading}
          </h2>
          {section.body.map((para, idx) => (
            <p
              // biome-ignore lint/suspicious/noArrayIndexKey: paragraphs are static placeholder copy.
              key={idx}
              className="mt-3"
            >
              {para}
            </p>
          ))}
        </section>
      ))}
    </article>
  );
}
