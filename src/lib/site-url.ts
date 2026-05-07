/**
 * Canonical site origin for SEO surfaces (sitemap, robots, metadataBase).
 * Read from env at request time so Vercel preview deployments don't bake in
 * the production URL.
 */
export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/+$/, '');
  const vercel = process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;
  return 'http://localhost:3000';
}
