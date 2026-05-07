// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { ARCHIVE_PAGE_SIZE, parseArchivePage } from './archive-pagination';

describe('parseArchivePage', () => {
  it('returns page 1 with offset 0 for missing input', () => {
    expect(parseArchivePage(undefined, { totalCount: 200 })).toEqual({
      page: 1,
      totalPages: 4,
      offset: 0,
      pageSize: ARCHIVE_PAGE_SIZE,
    });
  });

  it('clamps non-integer / non-positive input back to page 1', () => {
    expect(parseArchivePage('0', { totalCount: 200 }).page).toBe(1);
    expect(parseArchivePage('-3', { totalCount: 200 }).page).toBe(1);
    expect(parseArchivePage('abc', { totalCount: 200 }).page).toBe(1);
    expect(parseArchivePage('1.5', { totalCount: 200 }).page).toBe(1);
  });

  it('computes offset for the requested page', () => {
    expect(parseArchivePage('3', { totalCount: 200 }).offset).toBe(2 * ARCHIVE_PAGE_SIZE);
  });

  it('clamps requested pages beyond the last page', () => {
    const r = parseArchivePage('99', { totalCount: 51 });
    expect(r.page).toBe(2);
    expect(r.totalPages).toBe(2);
  });

  it('returns 1 total page when there are zero rounds', () => {
    expect(parseArchivePage(undefined, { totalCount: 0 }).totalPages).toBe(1);
  });

  it('rejects array search-param values by treating them as missing', () => {
    expect(parseArchivePage(['2', '3'], { totalCount: 200 }).page).toBe(1);
  });
});
