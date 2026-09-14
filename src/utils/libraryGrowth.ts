import { Book } from '../types';
import { toLocalDateKey } from './streak';

export interface GrowthPoint {
  /** Local calendar day (YYYY-MM-DD), so two years never share a point. */
  key: string;
  added: number;
  total: number;
}

/**
 * The library's size over time, one point per day on which books were added.
 *
 * Points used to be keyed by a formatted "Mar 5" label, which carries no year:
 * books added on the same day of two different years shared one point, and the
 * running total then counted the later books at the earlier point.
 */
export function growthSeries(books: Book[]): GrowthPoint[] {
  const perDay = new Map<string, number>();

  [...books]
    .filter((book) => book.addedAt)
    .sort((a, b) => new Date(a.addedAt).getTime() - new Date(b.addedAt).getTime())
    .forEach((book) => {
      const key = toLocalDateKey(book.addedAt);
      perDay.set(key, (perDay.get(key) ?? 0) + 1);
    });

  let total = 0;
  return [...perDay.entries()].map(([key, added]) => {
    total += added;
    return { key, added, total };
  });
}
