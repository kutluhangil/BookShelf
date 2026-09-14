import { Book } from '../types';

/**
 * Every moment the reader finished this book.
 *
 * `readAt` holds only the latest finish, so counting it alone loses a re-read:
 * a book finished in January and again in March counted once, in March, and
 * the January month never got it at all. `readHistory` is the full record and
 * already carries the moment `readAt` points at, so it wins when present.
 */
export function completionDates(book: Book): string[] {
  if (book.readHistory?.length) return book.readHistory;
  return book.readAt ? [book.readAt] : [];
}

/** Finishes across the library that fall inside the given calendar period. */
export function countCompletions(books: Book[], falls: (finishedAt: Date) => boolean): number {
  return books.reduce(
    (total, book) => total + completionDates(book).filter((date) => falls(new Date(date))).length,
    0
  );
}

/** Pages behind the finishes that fall inside the period; an unknown count is estimated. */
export function countCompletedPages(books: Book[], falls: (finishedAt: Date) => boolean, fallback = 250): number {
  return books.reduce((total, book) => {
    const finishes = completionDates(book).filter((date) => falls(new Date(date))).length;
    return total + finishes * (book.pageCount || fallback);
  }, 0);
}
