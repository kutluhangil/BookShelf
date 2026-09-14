import { describe, expect, it } from 'vitest';
import { longestReadingStreak, collectReadingDays } from '../utils/streak';
import { completionDates, countCompletions, countCompletedPages } from '../utils/completions';
import { growthSeries } from '../utils/libraryGrowth';
import type { Book } from '../types';

function book(id: string, overrides: Partial<Book> = {}): Book {
  return {
    id,
    title: id,
    author: 'Author',
    isbn: '',
    publisher: '',
    publishYear: 2000,
    pageCount: 300,
    description: '',
    coverUrl: '',
    spineCropUrl: '',
    spineColor: '#000000',
    shelfId: 'shelf-1',
    status: 'unread',
    confidence: 'matched',
    score: 1,
    category: 'Test',
    addedAt: '2024-01-01T09:00:00',
    ...overrides,
  };
}

describe('longestReadingStreak', () => {
  it('counts the longest run, wherever it sits in the record', () => {
    const streak = longestReadingStreak([
      book('a', {
        readingSessions: [
          { date: '2025-03-01T09:00:00', durationSeconds: 600 },
          { date: '2025-03-02T09:00:00', durationSeconds: 600 },
          { date: '2025-03-03T09:00:00', durationSeconds: 600 },
          { date: '2025-03-05T09:00:00', durationSeconds: 600 },
        ],
      }),
    ]);
    expect(streak).toBe(3);
  });

  it('counts a finished book as a reading day, like every other count does', () => {
    expect(longestReadingStreak([book('a', { readAt: '2025-03-01T09:00:00', status: 'read' })])).toBe(1);
  });

  it('joins runs that span a month boundary', () => {
    const streak = longestReadingStreak([
      book('a', {
        readHistory: ['2025-01-31T09:00:00', '2025-02-01T09:00:00', '2025-02-02T09:00:00'],
      }),
    ]);
    expect(streak).toBe(3);
  });

  it('is zero for a library nobody has read', () => {
    expect(longestReadingStreak([book('a')])).toBe(0);
    expect(collectReadingDays([book('a')]).size).toBe(0);
  });
});

describe('completionDates', () => {
  it('reports every finish a re-read book has', () => {
    const reread = book('a', {
      status: 'read',
      readAt: '2025-03-10T09:00:00',
      readHistory: ['2025-01-04T09:00:00', '2025-03-10T09:00:00'],
    });
    expect(completionDates(reread)).toHaveLength(2);
  });

  it('falls back to the single finish an older record carries', () => {
    expect(completionDates(book('a', { status: 'read', readAt: '2025-03-10T09:00:00' }))).toEqual([
      '2025-03-10T09:00:00',
    ]);
  });

  it('reports nothing for a book that was never finished', () => {
    expect(completionDates(book('a'))).toEqual([]);
  });
});

describe('counting finishes in a period', () => {
  const reread = book('a', {
    status: 'read',
    readAt: '2025-03-10T09:00:00',
    readHistory: ['2025-01-04T09:00:00', '2025-03-10T09:00:00'],
    pageCount: 200,
  });
  const inJanuary = (date: Date) => date.getFullYear() === 2025 && date.getMonth() === 0;
  const inYear = (date: Date) => date.getFullYear() === 2025;

  it('counts the January finish in January', () => {
    expect(countCompletions([reread], inJanuary)).toBe(1);
  });

  it('counts both finishes in the year', () => {
    expect(countCompletions([reread], inYear)).toBe(2);
  });

  it('counts the pages behind each finish', () => {
    expect(countCompletedPages([reread], inYear)).toBe(400);
  });

  it('estimates the pages of a book with no page count', () => {
    const unknown = book('b', { status: 'read', readAt: '2025-05-01T09:00:00', pageCount: 0 });
    expect(countCompletedPages([unknown], inYear)).toBe(250);
  });
});

describe('growthSeries', () => {
  it('keeps the same day of two different years apart', () => {
    const series = growthSeries([
      book('old', { addedAt: '2024-03-05T09:00:00' }),
      book('new', { addedAt: '2026-03-05T09:00:00' }),
    ]);
    expect(series.map((point) => point.key)).toEqual(['2024-03-05', '2026-03-05']);
    expect(series.map((point) => point.total)).toEqual([1, 2]);
  });

  it('runs the total up in the order the books arrived', () => {
    const series = growthSeries([
      book('c', { addedAt: '2026-01-03T09:00:00' }),
      book('a', { addedAt: '2026-01-01T09:00:00' }),
      book('b', { addedAt: '2026-01-01T20:00:00' }),
    ]);
    expect(series).toEqual([
      { key: '2026-01-01', added: 2, total: 2 },
      { key: '2026-01-03', added: 1, total: 3 },
    ]);
  });

  it('has no points for an empty library', () => {
    expect(growthSeries([])).toEqual([]);
  });
});
