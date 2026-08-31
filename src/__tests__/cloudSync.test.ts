import { describe, expect, it, vi } from 'vitest';
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

  it('reports conflicts and which side was kept', () => {
    const merged = mergeLibraries(
      { books: [book('same', { title: 'local', updatedAt: '2025-01-02T00:00:00.000Z' })], shelves: [] },
      { books: [book('same', { title: 'cloud', updatedAt: '2024-06-01T00:00:00.000Z' })], shelves: [] },
      { bookIds: [], shelfIds: [] }
    );
    expect(merged.conflicts).toEqual([{ id: 'same', title: 'local', keptSide: 'local' }]);
  });

  it('does not report a conflict when both sides carry the same timestamp', () => {
    const merged = mergeLibraries(
      { books: [book('same', { updatedAt: '2025-01-02T00:00:00.000Z' })], shelves: [] },
      { books: [book('same', { updatedAt: '2025-01-02T00:00:00.000Z' })], shelves: [] },
      { bookIds: [], shelfIds: [] }
    );
    expect(merged.conflicts).toHaveLength(0);
  });

  it('counts only the books that were genuinely new from the cloud', () => {
    const merged = mergeLibraries(
      { books: [book('local'), book('shared')], shelves: [] },
      { books: [book('shared'), book('remote-only')], shelves: [] },
      { bookIds: [], shelfIds: [] }
    );
    expect(merged.addedFromCloud).toBe(1);
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

describe('firestore layout', () => {
  it('writes and reads a library under users/{uid}, never a top-level collection', async () => {
    const setPaths: string[][] = [];
    const deletePaths: string[][] = [];
    const readPaths: string[][] = [];
    const commits: Array<() => void> = [];

    // The module graph already holds the real firebase module from the static
    // import above; reset it so the dynamic import below picks up the mock.
    vi.resetModules();
    vi.doMock('../lib/firebase', () => ({
      getFirestoreApi: async () => ({
        db: {},
        doc: (_db: unknown, ...segments: string[]) => segments,
        collection: (_db: unknown, ...segments: string[]) => {
          readPaths.push(segments);
          return segments;
        },
        getDocs: async () => ({ forEach: () => undefined }),
        getDoc: async () => ({ exists: () => false }),
        writeBatch: () => ({
          set: (path: string[]) => setPaths.push(path),
          delete: (path: string[]) => deletePaths.push(path),
          commit: async () => commits.push(() => undefined),
        }),
      }),
    }));

    const { syncToCloud: sync, fetchFromCloud: fetch } = await import('../services/cloudSync');

    await sync('uid-1', {
      books: [book('b1')],
      shelves: [shelf],
      deletedBookIds: ['gone-book'],
      deletedShelfIds: ['gone-shelf'],
    });

    expect(setPaths).toContainEqual(['users', 'uid-1', 'shelves', 'shelf-1']);
    expect(setPaths).toContainEqual(['users', 'uid-1', 'books', 'b1']);
    expect(setPaths).toContainEqual(['users', 'uid-1']);
    expect(deletePaths).toEqual([
      ['users', 'uid-1', 'books', 'gone-book'],
      ['users', 'uid-1', 'shelves', 'gone-shelf'],
    ]);

    await fetch('uid-1');
    expect(readPaths).toEqual([
      ['users', 'uid-1', 'shelves'],
      ['users', 'uid-1', 'books'],
    ]);

    vi.doUnmock('../lib/firebase');
  });
});
