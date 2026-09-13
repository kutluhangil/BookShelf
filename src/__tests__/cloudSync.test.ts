import { describe, expect, it, vi } from 'vitest';
import { mergeLibraries } from '../services/cloudSync';
import { fingerprint } from '../services/syncPlan';
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
      ['users', 'uid-1', 'deletions'],
    ]);

    vi.doUnmock('../lib/firebase');
  });
});

describe('legacy crop cleanup', () => {
  it('deletes the duplicated crop field from the cloud copies that still carry it', async () => {
    const updates: Array<{ path: string[]; payload: Record<string, unknown> }> = [];
    let commits = 0;

    vi.resetModules();
    vi.doMock('../lib/firebase', () => ({
      getFirestoreApi: async () => ({
        db: {},
        doc: (_db: unknown, ...segments: string[]) => segments,
        collection: (_db: unknown, ...segments: string[]) => segments,
        getDocs: async (segments: string[]) => ({
          forEach: (visit: (snap: { ref: string[]; data: () => Record<string, unknown> }) => void) => {
            if (segments[segments.length - 1] !== 'books') return;
            visit({
              ref: [...segments, 'legacy'],
              data: () => ({ ...book('legacy'), proofOfCaptureUrl: 'data:image/jpeg;base64,OLD' }),
            });
            visit({ ref: [...segments, 'clean'], data: () => ({ ...book('clean') }) });
          },
        }),
        getDoc: async () => ({ exists: () => false }),
        deleteField: () => 'DELETE_FIELD',
        writeBatch: () => ({
          update: (path: string[], payload: Record<string, unknown>) => updates.push({ path, payload }),
          commit: async () => {
            commits++;
          },
        }),
      }),
    }));

    const { fetchFromCloud: fetch } = await import('../services/cloudSync');
    const snapshot = await fetch('uid-1');

    expect(updates).toEqual([
      { path: ['users', 'uid-1', 'books', 'legacy'], payload: { proofOfCaptureUrl: 'DELETE_FIELD' } },
    ]);
    expect(commits).toBe(1);
    // The fetched copy carries the crop once, under its current name.
    expect(snapshot.books.map((b) => b.id).sort()).toEqual(['clean', 'legacy']);
    expect(snapshot.books.every((b) => !('proofOfCaptureUrl' in b))).toBe(true);

    vi.doUnmock('../lib/firebase');
  });

  it('commits nothing when no document carries the field', async () => {
    let batches = 0;

    vi.resetModules();
    vi.doMock('../lib/firebase', () => ({
      getFirestoreApi: async () => ({
        db: {},
        doc: (_db: unknown, ...segments: string[]) => segments,
        collection: (_db: unknown, ...segments: string[]) => segments,
        getDocs: async () => ({
          forEach: (visit: (snap: { ref: string[]; data: () => Record<string, unknown> }) => void) =>
            visit({ ref: ['users', 'uid-1', 'books', 'clean'], data: () => ({ ...book('clean') }) }),
        }),
        getDoc: async () => ({ exists: () => false }),
        deleteField: () => 'DELETE_FIELD',
        writeBatch: () => {
          batches++;
          return { update: () => undefined, commit: async () => undefined };
        },
      }),
    }));

    const { fetchFromCloud: fetch } = await import('../services/cloudSync');
    await fetch('uid-1');

    expect(batches).toBe(0);

    vi.doUnmock('../lib/firebase');
  });
});

describe('mergeLibraries: shelves', () => {
  const local: Shelf = { id: 'shelf-1', name: 'Renamed here', volumeCount: 0, dominantColors: [], sortOrder: 1 };
  const remote: Shelf = { id: 'shelf-1', name: 'Renamed there', volumeCount: 0, dominantColors: [], sortOrder: 1 };
  const pushed: Shelf = { id: 'shelf-1', name: 'Fiction', volumeCount: 0, dominantColors: [], sortOrder: 1 };

  it('keeps the local edit and says so', () => {
    // Local differs from what this device last pushed, so it is the newer edit.
    const merged = mergeLibraries(
      { books: [], shelves: [local] },
      { books: [], shelves: [remote] },
      { bookIds: [], shelfIds: [] },
      { books: {}, shelves: { 'shelf-1': fingerprint(pushed) }, meta: '' }
    );

    expect(merged.shelves[0].name).toBe('Renamed here');
    expect(merged.conflicts).toContainEqual({ id: 'shelf-1', title: 'Renamed here', keptSide: 'local' });
  });

  it('accepts a remote rename this device never touched', () => {
    // The local copy still matches the last push, so the difference is theirs.
    const merged = mergeLibraries(
      { books: [], shelves: [pushed] },
      { books: [], shelves: [remote] },
      { bookIds: [], shelfIds: [] },
      { books: {}, shelves: { 'shelf-1': fingerprint(pushed) }, meta: '' }
    );

    expect(merged.shelves[0].name).toBe('Renamed there');
    expect(merged.conflicts).toContainEqual({ id: 'shelf-1', title: 'Fiction', keptSide: 'cloud' });
  });

  it('reports nothing when both sides agree', () => {
    const merged = mergeLibraries(
      { books: [], shelves: [pushed] },
      { books: [], shelves: [{ ...pushed }] },
      { bookIds: [], shelfIds: [] },
      { books: {}, shelves: { 'shelf-1': fingerprint(pushed) }, meta: '' }
    );
    expect(merged.conflicts).toHaveLength(0);
  });

  it('falls back to keeping the local copy with no fingerprint to compare', () => {
    const merged = mergeLibraries(
      { books: [], shelves: [local] },
      { books: [], shelves: [remote] },
      { bookIds: [], shelfIds: [] }
    );
    expect(merged.shelves[0].name).toBe('Renamed here');
  });

  it('never resurrects a locally deleted shelf', () => {
    const merged = mergeLibraries(
      { books: [], shelves: [] },
      { books: [], shelves: [remote] },
      { bookIds: [], shelfIds: ['shelf-1'] }
    );
    expect(merged.shelves).toHaveLength(0);
  });
});

describe('remote deletions', () => {
  const tombstone = (id: string, kind: 'book' | 'shelf', deletedAt: string) => ({ id, kind, deletedAt });

  it('drops a local book another device deleted', () => {
    const merged = mergeLibraries(
      { books: [book('gone', { updatedAt: '2025-01-01T00:00:00.000Z' })], shelves: [] },
      { books: [], shelves: [], deletions: [tombstone('gone', 'book', '2025-01-02T00:00:00.000Z')] },
      { bookIds: [], shelfIds: [] }
    );
    expect(merged.books).toHaveLength(0);
    expect(merged.removedByRemote).toEqual([{ id: 'gone', title: 'gone' }]);
  });

  it('keeps a book edited here after the remote deletion', () => {
    const merged = mergeLibraries(
      { books: [book('kept', { updatedAt: '2025-01-03T00:00:00.000Z' })], shelves: [] },
      { books: [], shelves: [], deletions: [tombstone('kept', 'book', '2025-01-02T00:00:00.000Z')] },
      { bookIds: [], shelfIds: [] }
    );
    expect(merged.books.map((b) => b.id)).toEqual(['kept']);
    expect(merged.removedByRemote).toHaveLength(0);
  });

  it('drops a shelf another device deleted', () => {
    const merged = mergeLibraries(
      { books: [], shelves: [shelf] },
      { books: [], shelves: [], deletions: [tombstone('shelf-1', 'shelf', '2025-01-02T00:00:00.000Z')] },
      { bookIds: [], shelfIds: [] }
    );
    expect(merged.shelves).toHaveLength(0);
    expect(merged.removedByRemote).toEqual([{ id: 'shelf-1', title: 'Fiction' }]);
  });

  it('lets a document that exists again outrank its tombstone', () => {
    const merged = mergeLibraries(
      { books: [], shelves: [] },
      {
        books: [book('reborn')],
        shelves: [],
        deletions: [tombstone('reborn', 'book', '2025-01-02T00:00:00.000Z')],
      },
      { bookIds: [], shelfIds: [] }
    );
    expect(merged.books.map((b) => b.id)).toEqual(['reborn']);
  });

  it('ignores a snapshot with no deletions field at all', () => {
    const merged = mergeLibraries(
      { books: [book('local')], shelves: [shelf] },
      { books: [], shelves: [] },
      { bookIds: [], shelfIds: [] }
    );
    expect(merged.books).toHaveLength(1);
    expect(merged.removedByRemote).toHaveLength(0);
  });
});

describe('tombstone documents', () => {
  it('records a tombstone beside every deletion it pushes', async () => {
    const setPaths: Array<{ path: string[]; payload: Record<string, unknown> }> = [];
    const deletePaths: string[][] = [];

    vi.resetModules();
    vi.doMock('../lib/firebase', () => ({
      getFirestoreApi: async () => ({
        db: {},
        doc: (_db: unknown, ...segments: string[]) => segments,
        collection: (_db: unknown, ...segments: string[]) => segments,
        getDocs: async () => ({ forEach: () => undefined }),
        getDoc: async () => ({ exists: () => false }),
        writeBatch: () => ({
          set: (path: string[], payload: Record<string, unknown>) => setPaths.push({ path, payload }),
          delete: (path: string[]) => deletePaths.push(path),
          commit: async () => undefined,
        }),
      }),
    }));

    const { syncToCloud: sync } = await import('../services/cloudSync');
    await sync('uid-1', {
      books: [],
      shelves: [],
      writeMeta: false,
      deletedBookIds: ['gone-book'],
      deletedShelfIds: ['gone-shelf'],
    });

    expect(deletePaths).toEqual([
      ['users', 'uid-1', 'books', 'gone-book'],
      ['users', 'uid-1', 'shelves', 'gone-shelf'],
    ]);
    expect(setPaths.map((entry) => entry.path)).toEqual([
      ['users', 'uid-1', 'deletions', 'book:gone-book'],
      ['users', 'uid-1', 'deletions', 'shelf:gone-shelf'],
    ]);
    expect(setPaths[0].payload).toMatchObject({ id: 'gone-book', kind: 'book' });
    expect(typeof setPaths[0].payload.deletedAt).toBe('string');

    vi.doUnmock('../lib/firebase');
  });

  it('reads the tombstones and sweeps the ones that have expired', async () => {
    const deleted: string[][] = [];
    const fresh = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const ancient = new Date(Date.now() - 400 * 24 * 60 * 60 * 1000).toISOString();

    vi.resetModules();
    vi.doMock('../lib/firebase', () => ({
      getFirestoreApi: async () => ({
        db: {},
        doc: (_db: unknown, ...segments: string[]) => segments,
        collection: (_db: unknown, ...segments: string[]) => segments,
        getDocs: async (segments: string[]) => ({
          forEach: (visit: (snap: { ref: string[]; data: () => Record<string, unknown> }) => void) => {
            if (segments[segments.length - 1] !== 'deletions') return;
            visit({
              ref: [...segments, 'book:fresh'],
              data: () => ({ id: 'fresh', kind: 'book', deletedAt: fresh }),
            });
            visit({
              ref: [...segments, 'book:ancient'],
              data: () => ({ id: 'ancient', kind: 'book', deletedAt: ancient }),
            });
          },
        }),
        getDoc: async () => ({ exists: () => false }),
        deleteField: () => 'DELETE_FIELD',
        writeBatch: () => ({
          update: () => undefined,
          delete: (path: string[]) => deleted.push(path),
          commit: async () => undefined,
        }),
      }),
    }));

    const { fetchFromCloud: fetch } = await import('../services/cloudSync');
    const snapshot = await fetch('uid-1');

    expect(snapshot.deletions?.map((entry) => entry.id)).toEqual(['fresh']);
    expect(deleted).toEqual([['users', 'uid-1', 'deletions', 'book:ancient']]);

    vi.doUnmock('../lib/firebase');
  });
});
