import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Book, SharedList, SharedListBook } from '../types';

function book(id: string, overrides: Partial<Book> = {}): Book {
  return {
    id,
    title: `Title ${id}`,
    author: 'Author',
    isbn: '',
    publisher: '',
    publishYear: 2000,
    pageCount: 100,
    description: 'A long description that a shared list has no use for.',
    coverUrl: 'https://covers.example/1.jpg',
    spineCropUrl: `data:image/jpeg;base64,${'A'.repeat(2048)}`,
    spineColor: '#334455',
    shelfId: 'shelf-1',
    status: 'unread',
    confidence: 'matched',
    score: 1,
    category: 'Test',
    addedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

interface Write {
  path: string;
  payload: Record<string, unknown>;
}

/**
 * Stands in for Firestore: documents keyed by id, writes recorded verbatim so a
 * test can assert on the exact shape that would have left the browser.
 */
function mockFirestore(documents: Record<string, Record<string, unknown>>) {
  const writes: Write[] = [];
  vi.resetModules();
  vi.doMock('../lib/firebase', () => ({
    getFirestoreApi: async () => ({
      db: {},
      doc: (_db: unknown, ...segments: string[]) => segments.join('/'),
      setDoc: async (path: string, payload: Record<string, unknown>) => {
        writes.push({ path, payload });
      },
      updateDoc: async (path: string, payload: Record<string, unknown>) => {
        writes.push({ path, payload });
      },
      getDoc: async (path: string) => {
        const data = documents[path.split('/').pop() as string];
        return { exists: () => data !== undefined, data: () => data };
      },
      arrayUnion: (...values: unknown[]) => ({ arrayUnion: values }),
      arrayRemove: (...values: unknown[]) => ({ arrayRemove: values }),
      getDocs: async () => ({
        docs: Object.entries(documents).map(([id, data]) => ({
          ref: `sharedLists/${id}`,
          data: () => data,
        })),
      }),
      collection: (_db: unknown, ...segments: string[]) => segments.join('/'),
      query: (...parts: unknown[]) => parts,
      where: (...parts: unknown[]) => parts,
    }),
  }));
  return writes;
}

afterEach(() => {
  vi.doUnmock('../lib/firebase');
});

const list = (books: unknown[]): Record<string, unknown> => ({
  id: 'list-1',
  name: 'Summer',
  isPublic: true,
  ownerId: 'uid-1',
  members: [],
  memberIds: ['uid-1'],
  books,
  createdAt: '2024-01-01T00:00:00.000Z',
});

const SLIM_KEYS = ['id', 'title', 'author', 'coverUrl', 'spineColor'];

describe('shared list documents stay under the 1MB Firestore cap', () => {
  it('stores only the rendered fields when a list is created', async () => {
    const writes = mockFirestore({});
    const { createSharedList } = await import('../services/sharedLists');

    await createSharedList(list([book('b1')]) as unknown as SharedList);

    const stored = (writes[0].payload as { books: SharedListBook[] }).books;
    expect(Object.keys(stored[0]).sort()).toEqual([...SLIM_KEYS].sort());
    expect(JSON.stringify(stored)).not.toContain('data:image');
  });

  it('adds a book as a slim entry, without the spine crop', async () => {
    const writes = mockFirestore({ 'list-1': list([]) });
    const { addBookToSharedList } = await import('../services/sharedLists');

    await addBookToSharedList('list-1', book('b1'));

    expect(writes).toEqual([
      {
        path: 'sharedLists/list-1',
        payload: {
          books: {
            arrayUnion: [
              {
                id: 'b1',
                title: 'Title b1',
                author: 'Author',
                coverUrl: 'https://covers.example/1.jpg',
                spineColor: '#334455',
              },
            ],
          },
        },
      },
    ]);
  });

  it('rewrites a document that still holds whole books, dropping the fat fields', async () => {
    const legacy = { ...book('old'), proofOfCaptureUrl: 'data:image/jpeg;base64,LEGACY' };
    const writes = mockFirestore({ 'list-1': list([legacy]) });
    const { addBookToSharedList } = await import('../services/sharedLists');

    await addBookToSharedList('list-1', book('new'));

    const stored = (writes[0].payload as { books: SharedListBook[] }).books;
    expect(stored.map((entry) => entry.id)).toEqual(['old', 'new']);
    for (const entry of stored) expect(Object.keys(entry).sort()).toEqual([...SLIM_KEYS].sort());
  });

  it('refuses to add past the per-list ceiling instead of breaking the document', async () => {
    const { SHARED_LIST_MAX_BOOKS } = await import('../services/sharedLists');
    const full = Array.from({ length: SHARED_LIST_MAX_BOOKS }, (_, index) => ({
      id: `b${index}`,
      title: 't',
      author: 'a',
      coverUrl: '',
      spineColor: '#000000',
    }));
    const writes = mockFirestore({ 'list-1': list(full) });
    const { addBookToSharedList } = await import('../services/sharedLists');

    await expect(addBookToSharedList('list-1', book('one-too-many'))).rejects.toMatchObject({
      code: 'sharedList.full',
      params: { listId: 'list-1', limit: SHARED_LIST_MAX_BOOKS },
    });
    expect(writes).toHaveLength(0);
  });

  it('strips legacy entries on read, so the UI never sees a spine crop', async () => {
    mockFirestore({ 'list-1': list([{ ...book('old'), proofOfCaptureUrl: 'data:image/jpeg;base64,LEGACY' }]) });
    const { getSharedList } = await import('../services/sharedLists');

    const loaded = await getSharedList('list-1');

    expect(Object.keys(loaded!.books[0]).sort()).toEqual([...SLIM_KEYS].sort());
  });

  it('compacts the remaining entries when a book is removed', async () => {
    const writes = mockFirestore({ 'list-1': list([book('keep'), book('drop')]) });
    const { removeBookFromSharedList } = await import('../services/sharedLists');

    await removeBookFromSharedList('list-1', 'drop');

    const stored = (writes[0].payload as { books: SharedListBook[] }).books;
    expect(stored).toEqual([
      {
        id: 'keep',
        title: 'Title keep',
        author: 'Author',
        coverUrl: 'https://covers.example/1.jpg',
        spineColor: '#334455',
      },
    ]);
  });
});

describe('edits that have to survive a collaborator editing at the same time', () => {
  it('removes a book without rewriting the whole list', async () => {
    const slim = (id: string): SharedListBook => ({
      id,
      title: `Title ${id}`,
      author: 'Author',
      coverUrl: 'https://covers.example/1.jpg',
      spineColor: '#334455',
    });
    const writes = mockFirestore({ 'list-1': list([slim('keep'), slim('drop')]) });
    const { removeBookFromSharedList } = await import('../services/sharedLists');

    await removeBookFromSharedList('list-1', 'drop');

    // Sending the surviving entries back would drop a book a collaborator added
    // between the read and the write.
    expect(writes[0].payload).toEqual({ books: { arrayRemove: [slim('drop')] } });
  });

  it('says nothing to write when the book is already gone', async () => {
    const writes = mockFirestore({ 'list-1': list([]) });
    const { removeBookFromSharedList } = await import('../services/sharedLists');

    await removeBookFromSharedList('list-1', 'never-there');

    expect(writes).toHaveLength(0);
  });
});

describe('claiming an invitation', () => {
  const invited = { userId: 'uid-2', email: 'Friend@Example.com', role: 'contributor' as const };

  it('takes the claimed address off the pending list', async () => {
    const withInvite = { ...list([]), invitedEmails: ['friend@example.com'], memberIds: ['uid-1'] };
    const writes = mockFirestore({ 'list-1': withInvite });
    const { claimInvitations } = await import('../services/sharedLists');

    const claimed = await claimInvitations(invited);

    expect(claimed.map((entry) => entry.id)).toEqual(['list-1']);
    expect(writes[0].payload).toMatchObject({ invitedEmails: { arrayRemove: ['friend@example.com'] } });
  });

  it('writes nothing for a list the user already belongs to', async () => {
    const withInvite = { ...list([]), invitedEmails: ['friend@example.com'], memberIds: ['uid-1', 'uid-2'] };
    const writes = mockFirestore({ 'list-1': withInvite });
    const { claimInvitations } = await import('../services/sharedLists');

    await claimInvitations(invited);

    expect(writes).toHaveLength(0);
  });
});
