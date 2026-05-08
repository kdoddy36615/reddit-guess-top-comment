import type { MetadataRoute } from 'next';
import { LEGAL_SLUGS } from '@/app/(app)/legal/[slug]/legal-pages';
import { getSiteUrl } from '@/lib/site-url';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getSiteUrl();
  const lastModified = new Date();

  const staticEntries: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified, changeFrequency: 'daily', priority: 1 },
    {
      url: `${baseUrl}/play/solo`,
      lastModified,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/play/daily`,
      lastModified,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/rooms`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/leaderboard`,
      lastModified,
      changeFrequency: 'daily',
      priority: 0.7,
    },
  ];

  const legalEntries: MetadataRoute.Sitemap = LEGAL_SLUGS.map((slug) => ({
    url: `${baseUrl}/legal/${slug}`,
    lastModified,
    changeFrequency: 'yearly',
    priority: 0.3,
  }));

  return [...staticEntries, ...legalEntries];
}
