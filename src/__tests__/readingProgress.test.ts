import { describe, expect, it } from 'vitest';
import { progressFromPage, progressFromPercent } from '../services/readingProgress';

describe('progressFromPage', () => {
  it('keeps the page the reader typed instead of rounding it through the percentage', () => {
    // 151/300 is 50.33%, which is stored as 50. Deriving the page back out of
    // that percentage moves the reader's bookmark to 150.
    expect(progressFromPage({ pageCount: 300, currentPage: undefined }, 151)).toEqual({
      progress: 50,
      currentPage: 151,
      status: 'reading',
    });
  });

  it('counts the first page of a long book as reading, not unread', () => {
    expect(progressFromPage({ pageCount: 800, currentPage: undefined }, 1)).toMatchObject({
      progress: 0,
      currentPage: 1,
      status: 'reading',
    });
  });

  it('clamps to the covers of the book', () => {
    expect(progressFromPage({ pageCount: 300, currentPage: 10 }, 900)).toEqual({
      progress: 100,
      currentPage: 300,
      status: 'read',
    });
    expect(progressFromPage({ pageCount: 300, currentPage: 10 }, -5)).toEqual({
      progress: 0,
      currentPage: 0,
      status: 'unread',
    });
  });

  it('refuses a book with no page count rather than inventing one', () => {
    expect(() => progressFromPage({ pageCount: 0, currentPage: undefined }, 10)).toThrow(/page count/);
  });
});

describe('progressFromPercent', () => {
  it('derives the page from the percentage', () => {
    expect(progressFromPercent({ pageCount: 300, currentPage: 1 }, 50)).toEqual({
      progress: 50,
      currentPage: 150,
      status: 'reading',
    });
  });

  it('leaves the page alone when the book has no page count', () => {
    expect(progressFromPercent({ pageCount: 0, currentPage: 42 }, 50)).toEqual({
      progress: 50,
      currentPage: 42,
      status: 'reading',
    });
  });

  it('maps the ends to unread and read', () => {
    expect(progressFromPercent({ pageCount: 300, currentPage: 0 }, 0).status).toBe('unread');
    expect(progressFromPercent({ pageCount: 300, currentPage: 0 }, 100).status).toBe('read');
  });
});
