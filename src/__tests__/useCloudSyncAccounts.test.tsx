// @vitest-environment jsdom
import React, { useEffect, useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, act, cleanup } from '@testing-library/react';
import type { Book, ReadingGoals, Shelf } from '../types';
import type { SyncFingerprints } from '../services/syncPlan';
import type { LibraryStore } from '../hooks/useLibrary';
import type { CloudSnapshot, SyncPayload } from '../services/cloudSync';

/**
 * Signing out leaves the library on the device. What happens when a *second*
 * account then signs in is the subject here: the first reader's books must not
 * end up in the second reader's library, nor in their cloud.
 */

const pushed: SyncPayload[] = [];

/** Per-account cloud contents, keyed by uid. */
const clouds: Record<string, CloudSnapshot> = {
  'uid-a': { books: [], shelves: [] },
  'uid-b': { books: [], shelves: [] },
};

let emitUser: (user: { uid: string } | null) => void = () => undefined;

vi.mock('../services/cloudSync', async () => {
  const actual = await vi.importActual<typeof import('../services/cloudSync')>('../services/cloudSync');
  return {
    ...actual,
    syncToCloud: async (_uid: string, payload: SyncPayload) => {
      pushed.push(payload);
    },
    fetchFromCloud: async (uid: string) => clouds[uid] ?? { books: [], shelves: [] },
  };
});

vi.mock('../lib/firebase', () => ({
  isFirebaseConfigured: true,
  firebaseConfigError: null,
  loginWithGoogle: async () => undefined,
  logout: async () => undefined,
  observeAuthState: (callback: (user: { uid: string } | null) => void) => {
    emitUser = callback;
    return () => undefined;
  },
}));

const { useCloudSync } = await import('../hooks/useCloudSync');
const { I18nProvider } = await import('../i18n/I18nProvider');

const ignoreToast = () => undefined;

let store: LibraryStore;

function makeBook(id: string, title: string): Book {
  return {
    id,
    title,
    author: 'Author',
    isbn: '',
    publisher: '',
    publishYear: 2000,
    pageCount: 100,
    description: '',
    coverUrl: '',
    spineCropUrl: '',
    spineColor: '#000000',
    shelfId: 'shelf-fiction',
    status: 'unread',
    confidence: 'matched',
    score: 1,
    category: 'Test',
    addedAt: '2026-01-01T00:00:00.000Z',
  };
}

const Harness: React.FC<{ initialBooks: Book[]; initialOwner: string | null }> = ({ initialBooks, initialOwner }) => {
  const [books, setBooks] = useState<Book[]>(initialBooks);
  const [shelves, setShelves] = useState<Shelf[]>([]);
  const [readingGoals, setReadingGoals] = useState<ReadingGoals>({});
  const [monthlyGoal, setMonthlyGoal] = useState(5);
  const [deletedBookIds, setDeletedBookIds] = useState<string[]>([]);
  const [deletedShelfIds, setDeletedShelfIds] = useState<string[]>([]);
  const [syncFingerprints, setSyncFingerprints] = useState<SyncFingerprints>({ books: {}, shelves: {}, meta: '' });
  const [ownerUid, setOwnerUid] = useState<string | null>(initialOwner);

  const backing: LibraryStore = {
    books,
    setBooks,
    shelves,
    setShelves,
    readingGoals,
    setReadingGoals,
    monthlyGoal,
    setMonthlyGoal,
    deletedBookIds,
    setDeletedBookIds,
    deletedShelfIds,
    setDeletedShelfIds,
    syncFingerprints,
    setSyncFingerprints,
    ownerUid,
    setOwnerUid,
    persistenceError: null,
  };
  useCloudSync(backing, ignoreToast);
  useEffect(() => {
    store = backing;
  });
  return null;
};

async function mount(initialBooks: Book[], initialOwner: string | null): Promise<void> {
  await act(async () => {
    render(
      <I18nProvider>
        <Harness initialBooks={initialBooks} initialOwner={initialOwner} />
      </I18nProvider>
    );
  });
}

afterEach(() => {
  cleanup();
  pushed.length = 0;
  clouds['uid-a'] = { books: [], shelves: [] };
  clouds['uid-b'] = { books: [], shelves: [] };
});

describe('signing in with a different account', () => {
  it('does not merge the previous account library into the new one', async () => {
    clouds['uid-b'] = { books: [makeBook('b-1', "B's book")], shelves: [] };
    await mount([makeBook('a-1', "A's private book")], 'uid-a');

    await act(async () => emitUser({ uid: 'uid-b' }));

    expect(store.books.map((book) => book.id)).toEqual(['b-1']);
    expect(store.ownerUid).toBe('uid-b');
  });

  it("drops the previous account's tombstones and fingerprints", async () => {
    await mount([makeBook('a-1', "A's book")], 'uid-a');
    await act(async () => {
      store.setDeletedBookIds(['a-deleted']);
      store.setSyncFingerprints({ books: { 'a-1': 'print' }, shelves: {}, meta: 'meta' });
    });

    await act(async () => emitUser({ uid: 'uid-b' }));

    // Applied to the new account these would delete unrelated documents and
    // suppress the first push of books it has never seen.
    expect(store.deletedBookIds).toEqual([]);
    expect(store.syncFingerprints).toEqual({ books: {}, shelves: {}, meta: '' });
  });

  it('still merges a library that has never been signed in', async () => {
    clouds['uid-a'] = { books: [makeBook('cloud-1', 'From the cloud')], shelves: [] };
    await mount([makeBook('local-1', 'Made offline')], null);

    await act(async () => emitUser({ uid: 'uid-a' }));

    expect(store.books.map((book) => book.id).sort()).toEqual(['cloud-1', 'local-1']);
    expect(store.ownerUid).toBe('uid-a');
  });

  it('still merges when the same account signs in again', async () => {
    clouds['uid-a'] = { books: [makeBook('cloud-1', 'From another device')], shelves: [] };
    await mount([makeBook('local-1', 'Made here')], 'uid-a');

    await act(async () => emitUser({ uid: 'uid-a' }));

    expect(store.books.map((book) => book.id).sort()).toEqual(['cloud-1', 'local-1']);
  });
});
