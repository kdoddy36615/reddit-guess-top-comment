export const ARCHIVE_PAGE_SIZE = 50;

export type ArchivePage = {
  page: number;
  totalPages: number;
  offset: number;
  pageSize: number;
};

export function parseArchivePage(
  raw: string | string[] | undefined,
  opts: { totalCount: number },
): ArchivePage {
  const totalPages = Math.max(1, Math.ceil(opts.totalCount / ARCHIVE_PAGE_SIZE));

  let page = 1;
  if (typeof raw === 'string' && /^\d+$/.test(raw)) {
    const parsed = Number(raw);
    if (Number.isInteger(parsed) && parsed >= 1) page = parsed;
  }
  if (page > totalPages) page = totalPages;

  return {
    page,
    totalPages,
    offset: (page - 1) * ARCHIVE_PAGE_SIZE,
    pageSize: ARCHIVE_PAGE_SIZE,
  };
}
