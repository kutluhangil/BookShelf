import { describe, expect, it } from 'vitest';
import { mergeLibraries } from '../services/cloudSync';
import { Book, Shelf } from '../types';

function book(id: string, overrides: Partial<Book> = {}): Book {
  return {
    id,
    title: id,
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
    addedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

const shelf: Shelf = {
  id: 'shelf-1',
  name: 'Fiction',
  volumeCount: 0,
  dominantColors: [],
  sortOrder: 1,
};

describe('mergeLibraries', () => {
  it('keeps books that exist only locally or only in the cloud', () => {
    const merged = mergeLibraries(
      { books: [book('local')], shelves: [shelf] },
      { books: [book('cloud')], shelves: [] },
      { bookIds: [], shelfIds: [] }
    );
    expect(merged.books.map((b) => b.id).sort()).toEqual(['cloud', 'local']);
  });

  it('never resurrects a locally deleted book', () => {
    const merged = mergeLibraries(
      { books: [], shelves: [] },
      { books: [book('gone')], shelves: [] },
      { bookIds: ['gone'], shelfIds: [] }
    );
    expect(merged.books).toHaveLength(0);
  });

  it('prefers the newer copy on conflict', () => {
    const merged = mergeLibraries(
      { books: [book('same', { title: 'local', updatedAt: '2025-01-02T00:00:00.000Z' })], shelves: [] },
      { books: [book('same', { title: 'cloud', updatedAt: '2024-06-01T00:00:00.000Z' })], shelves: [] },
      { bookIds: [], shelfIds: [] }
    );
    expect(merged.books[0].title).toBe('local');
  });

  it('drops deleted shelves and sorts the rest', () => {
    const merged = mergeLibraries(
      { books: [], shelves: [{ ...shelf, id: 'b', sortOrder: 2 }] },
      { books: [], shelves: [{ ...shelf, id: 'a', sortOrder: 1 }, { ...shelf, id: 'x', sortOrder: 3 }] },
      { bookIds: [], shelfIds: ['x'] }
    );
    expect(merged.shelves.map((s) => s.id)).toEqual(['a', 'b']);
  });
});
