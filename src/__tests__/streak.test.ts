import { describe, expect, it } from 'vitest';
import { calculateReadingStreak, collectReadingDays, toLocalDateKey } from '../utils/streak';
import { Book } from '../types';

function makeBook(overrides: Partial<Book>): Book {
  return {
    id: 'b1',
    title: 'Test',
    author: 'Author',
    isbn: '',
    publisher: '',
    publishYear: 2000,
    pageCount: 100,
    description: '',
    coverUrl: '',
    spineCropUrl: '',
    spineColor: '#000000',
    shelfId: 'shelf-1',
    status: 'unread',
    confidence: 'matched',
    score: 1,
    category: 'Test',
    addedAt: new Date().toISOString(),
    ...overrides,
  };
}

function daysAgo(count: number, hour = 12): string {
  const date = new Date();
  date.setDate(date.getDate() - count);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
}

describe('toLocalDateKey', () => {
  it('uses the local calendar day, not UTC', () => {
    const lateEvening = new Date();
    lateEvening.setHours(23, 30, 0, 0);
    expect(toLocalDateKey(lateEvening)).toBe(
      `${lateEvening.getFullYear()}-${`${lateEvening.getMonth() + 1}`.padStart(2, '0')}-${`${lateEvening.getDate()}`.padStart(2, '0')}`
    );
  });
});

describe('collectReadingDays', () => {
  it('counts sessions, completions and readAt timestamps', () => {
    const days = collectReadingDays([
      makeBook({ readingSessions: [{ date: daysAgo(0), durationSeconds: 600 }] }),
      makeBook({ id: 'b2', readHistory: [daysAgo(1)] }),
      makeBook({ id: 'b3', readAt: daysAgo(2) }),
    ]);
    expect(days.size).toBe(3);
  });
});

describe('calculateReadingStreak', () => {
  it('returns 0 with no activity', () => {
    expect(calculateReadingStreak([makeBook({})])).toBe(0);
  });

  it('counts consecutive days ending today', () => {
    const book = makeBook({
      readingSessions: [0, 1, 2].map((offset) => ({ date: daysAgo(offset), durationSeconds: 300 })),
    });
    expect(calculateReadingStreak([book])).toBe(3);
  });

  it('keeps the streak alive when the last activity was yesterday', () => {
    const book = makeBook({
      readingSessions: [1, 2].map((offset) => ({ date: daysAgo(offset), durationSeconds: 300 })),
    });
    expect(calculateReadingStreak([book])).toBe(2);
  });

  it('breaks the streak when a day is missing', () => {
    const book = makeBook({
      readingSessions: [0, 2, 3].map((offset) => ({ date: daysAgo(offset), durationSeconds: 300 })),
    });
    expect(calculateReadingStreak([book])).toBe(1);
  });

  it('counts finished books, not just timed sessions', () => {
    const book = makeBook({ readHistory: [daysAgo(0), daysAgo(1)] });
    expect(calculateReadingStreak([book])).toBe(2);
  });
});
