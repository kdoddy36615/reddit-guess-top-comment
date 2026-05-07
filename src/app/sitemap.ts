import type { MetadataRoute } from 'next';
import { countAutoPublishedRounds, listAutoPublishedForSitemap } from '@/db/rounds';
import { getSiteUrl } from '@/lib/site-url';
import { createServiceRoleClient } from '@/lib/supabase/server';

// Per the Sitemaps protocol Google enforces a 50,000-URL ceiling per sitemap file.
const URLS_PER_SITEMAP = 50_000;

// DB lookup at request time, so don't cache the sitemap response.
export const dynamic = 'force-dynamic';

export async function generateSitemaps(): Promise<{ id: number }[]> {
  const db = createServiceRoleClient();
  const total = await countAutoPublishedRounds(db);
  const shardCount = Math.max(1, Math.ceil(total / URLS_PER_SITEMAP));
  return Array.from({ length: shardCount }, (_, i) => ({ id: i }));
}

export default async function sitemap(props: {
  id: Promise<string>;
}): Promise<MetadataRoute.Sitemap> {
  const id = Number(await props.id);
  const baseUrl = getSiteUrl();
  const db = createServiceRoleClient();

  const offset = id * URLS_PER_SITEMAP;
  const rounds = await listAutoPublishedForSitemap(db, {
    offset,
    limit: URLS_PER_SITEMAP,
  });

  const roundEntries: MetadataRoute.Sitemap = rounds.map((r) => ({
    url: `${baseUrl}/round/${r.id}`,
    lastModified: r.publishedAt,
    changeFrequency: 'monthly',
    priority: 0.8,
  }));

  // Hub pages live in shard 0 only — they're not duplicated across shards.
  if (id === 0) {
    return [
      {
        url: baseUrl,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 1,
      },
      {
        url: `${baseUrl}/daily`,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 0.9,
      },
      ...roundEntries,
    ];
  }

  return roundEntries;
}
