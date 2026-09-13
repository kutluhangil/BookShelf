import type { Book, ReadingStatus } from '../types';

/** The three fields that describe how far into a book the reader is. */
export interface ReadingProgress {
  /** Whole percentage, 0-100. */
  progress: number;
  /** The page the reader is on, or undefined when the book has no page count. */
  currentPage: number | undefined;
  status: ReadingStatus;
}

/**
 * Derives all three from a percentage the reader set.
 *
 * The status comes from the exact percentage rather than the rounded one, so
 * the first page of a long book does not count as unread.
 */
export function progressFromPercent(book: Pick<Book, 'pageCount' | 'currentPage'>, percent: number): ReadingProgress {
  const exact = Math.max(0, Math.min(100, percent));
  const rounded = Math.round(exact);
  return {
    progress: rounded,
    currentPage: book.pageCount ? Math.round((book.pageCount * rounded) / 100) : book.currentPage,
    status: exact >= 100 ? 'read' : exact > 0 ? 'reading' : 'unread',
  };
}

/**
 * Derives all three from a page the reader typed.
 *
 * The page is kept exactly as given. Storing only the percentage moved it:
 * `progress` is a whole number, so page 151 of 300 became 50%, which reads back
 * as page 150 — the reader's own bookmark, silently off by a page.
 */
export function progressFromPage(book: Pick<Book, 'pageCount' | 'currentPage'>, page: number): ReadingProgress {
  if (!book.pageCount) throw new Error('progressFromPage requires a page count');
  const clampedPage = Math.max(0, Math.min(book.pageCount, Math.round(page)));
  return {
    ...progressFromPercent(book, (clampedPage / book.pageCount) * 100),
    currentPage: clampedPage,
  };
}
