import { describe, expect, it } from 'vitest';
import { parseNLPSearchQuery } from '../utils/searchParser';
import { Book } from '../types';

const orwell: Book = {
  id: '1',
  title: '1984',
  author: 'George Orwell',
  isbn: '9780451524935',
  publisher: 'Signet',
  publishYear: 1949,
  pageCount: 328,
  description: '',
  coverUrl: '',
  spineCropUrl: '',
  spineColor: '#000000',
  shelfId: 'shelf-1',
  status: 'unread',
  confidence: 'matched',
  score: 1,
  category: 'Dystopia',
  addedAt: '2024-01-01T00:00:00.000Z',
};

describe('parseNLPSearchQuery', () => {
  it('matches everything for an empty query', () => {
    expect(parseNLPSearchQuery('', orwell)).toBe(true);
  });

  it('filters by status intent', () => {
    expect(parseNLPSearchQuery('unread books by Orwell', orwell)).toBe(true);
    expect(parseNLPSearchQuery('currently reading', orwell)).toBe(false);
  });

  it('matches on author and title text', () => {
    expect(parseNLPSearchQuery('orwell', orwell)).toBe(true);
    expect(parseNLPSearchQuery('1984', orwell)).toBe(true);
    expect(parseNLPSearchQuery('tolkien', orwell)).toBe(false);
  });
});
