import type { Metadata } from 'next';
import Link from 'next/link';
import { countAutoPublishedRounds, listAutoPublishedForArchive } from '@/db/rounds';
import { parseArchivePage } from '@/lib/archive-pagination';
import { createServiceRoleClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type SearchParams = Promise<{ page?: string | string[] }>;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const { page: rawPage } = await searchParams;
  const db = createServiceRoleClient();
  const totalCount = await countAutoPublishedRounds(db);
  const { page, totalPages } = parseArchivePage(rawPage, { totalCount });

  const title = page === 1 ? 'Round archive' : `Round archive — page ${page} of ${totalPages}`;
  const canonical = page === 1 ? '/archive' : `/archive?page=${page}`;

  return {
    title,
    description:
      'Browse every Reddit-comment guessing round, newest first. Pick a post and guess the top comment.',
    alternates: { canonical },
    openGraph: { title, type: 'website', url: canonical },
  };
}

export default async function ArchivePage({ searchParams }: { searchParams: SearchParams }) {
  const { page: rawPage } = await searchParams;
  const db = createServiceRoleClient();
  const totalCount = await countAutoPublishedRounds(db);
  const { page, totalPages, offset, pageSize } = parseArchivePage(rawPage, { totalCount });

  const rounds = await listAutoPublishedForArchive(db, { offset, limit: pageSize });

  return (
    <main className="mx-auto max-w-3xl p-6">
      <header className="mb-6">
        <h1 className="text-3xl font-semibold">Round archive</h1>
        <p className="mt-2 text-zinc-600">
          Every published round, newest first. {totalCount.toLocaleString()} total.
        </p>
      </header>

      {rounds.length === 0 ? (
        <p className="text-zinc-500">No rounds yet.</p>
      ) : (
        <ul className="divide-y divide-zinc-200">
          {rounds.map((r) => (
            <li key={r.id} className="py-3">
              <Link href={`/round/${r.id}`} className="block hover:underline">
                <p className="text-xs uppercase tracking-wide text-zinc-500">r/{r.subreddit}</p>
                <p className="mt-1 text-base font-medium text-zinc-900">{r.title}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <ArchivePagination page={page} totalPages={totalPages} />
    </main>
  );
}

function pageHref(n: number): string {
  return n === 1 ? '/archive' : `/archive?page=${n}`;
}

function ArchivePagination({ page, totalPages }: { page: number; totalPages: number }) {
  if (totalPages <= 1) return null;
  const prev = page > 1 ? pageHref(page - 1) : null;
  const next = page < totalPages ? pageHref(page + 1) : null;

  // Render every page number so any round is at most one hop from /archive
  // (home → /archive → ?page=K → /round/[id]).
  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <nav aria-label="Archive pagination" className="mt-8 space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {pageNumbers.map((n) =>
          n === page ? (
            <span
              key={n}
              aria-current="page"
              className="rounded bg-zinc-900 px-2 py-1 font-medium text-white"
            >
              {n}
            </span>
          ) : (
            <Link
              key={n}
              href={pageHref(n)}
              className="rounded px-2 py-1 text-blue-700 hover:bg-zinc-100"
            >
              {n}
            </Link>
          ),
        )}
      </div>
      <div className="flex items-center justify-between text-sm text-zinc-500">
        {prev ? (
          <Link href={prev} rel="prev" className="text-blue-700 hover:underline">
            ← Newer
          </Link>
        ) : (
          <span />
        )}
        <span>
          Page {page} of {totalPages}
        </span>
        {next ? (
          <Link href={next} rel="next" className="text-blue-700 hover:underline">
            Older →
          </Link>
        ) : (
          <span />
        )}
      </div>
    </nav>
  );
}
