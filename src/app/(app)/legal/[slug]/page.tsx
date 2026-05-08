import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { LegalContent } from './legal-content';
import { getLegalPage, LEGAL_SLUGS } from './legal-pages';

interface LegalPageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams(): Array<{ slug: string }> {
  return LEGAL_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: LegalPageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = getLegalPage(slug);
  if (!page) return { title: 'Not found', robots: { index: false, follow: false } };
  return {
    title: page.title,
    description: page.intro,
    alternates: { canonical: `/legal/${page.slug}` },
  };
}

export default async function LegalSlugPage({ params }: LegalPageProps) {
  const { slug } = await params;
  const page = getLegalPage(slug);
  if (!page) notFound();
  return <LegalContent page={page} />;
}
