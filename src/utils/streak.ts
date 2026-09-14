import { Book } from '../types';

/** Local calendar day key (YYYY-MM-DD) — never UTC, or the streak shifts at night. */
export function toLocalDateKey(value: string | number | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Every calendar day on which the reader logged a session or finished a book. */
export function collectReadingDays(books: Book[]): Set<string> {
  const days = new Set<string>();

  books.forEach((book) => {
    book.readingSessions?.forEach((session) => days.add(toLocalDateKey(session.date)));
    book.readHistory?.forEach((entry) => days.add(toLocalDateKey(entry)));
    if (book.readAt) days.add(toLocalDateKey(book.readAt));
  });

  return days;
}

/**
 * Consecutive days of reading activity, counting back from today. A streak stays
 * alive if the reader logged something today or yesterday.
 */
export const calculateReadingStreak = (books: Book[]): number => {
  const days = collectReadingDays(books);
  if (days.size === 0) return 0;

  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  if (!days.has(toLocalDateKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!days.has(toLocalDateKey(cursor))) return 0;
  }

  let streak = 0;
  while (days.has(toLocalDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
};

/** The day before the given local calendar day. */
function previousDayKey(key: string): string {
  const [year, month, day] = key.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() - 1);
  return toLocalDateKey(date);
}

/** The longest run of consecutive reading days on record, today or not. */
export const longestReadingStreak = (books: Book[]): number => {
  const sorted = [...collectReadingDays(books)].sort();

  let longest = 0;
  let run = 0;
  let previous: string | null = null;

  for (const day of sorted) {
    run = previous !== null && previousDayKey(day) === previous ? run + 1 : 1;
    previous = day;
    if (run > longest) longest = run;
  }

  return longest;
};
