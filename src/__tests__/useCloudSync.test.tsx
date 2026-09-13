// @vitest-environment jsdom
import React, { useEffect, useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, act, cleanup } from '@testing-library/react';
import type { Book, ReadingGoals, Shelf } from '../types';
import type { SyncFingerprints } from '../services/syncPlan';
import type { LibraryStore } from '../hooks/useLibrary';
import type { SyncPayload } from '../services/cloudSync';

/**
 * A push takes as long as the network does. What the reader does during that
 * window is the subject here: an edit or a deletion made mid-flight belongs to
 * the *next* push, and must survive the first one finishing.
 */

const pushed: SyncPayload[] = [];
let releasePush: (() => void) | null = null;

vi.mock('../services/cloudSync', () => ({
  syncToCloud: (_uid: string, payload: SyncPayload) => {
    pushed.push(payload);
    return new Promise<void>((resolve) => {
      releasePush = resolve;
    });
  },
  fetchFromCloud: async () => ({ books: [], shelves: [] }),
  mergeLibraries: (local: { books: Book[]; shelves: Shelf[] }) => ({
    books: local.books,
    shelves: local.shelves,
    conflicts: [],
    addedFromCloud: 0,
  }),
}));

vi.mock('../lib/firebase', () => ({
  isFirebaseConfigured: true,
  firebaseConfigError: null,
  loginWithGoogle: async () => undefined,
  logout: async () => undefined,
  observeAuthState: (callback: (user: { uid: string } | null) => void) => {
    callback({ uid: 'uid-1' });
    return () => undefined;
  },
}));

const { useCloudSync } = await import('../hooks/useCloudSync');
const { I18nProvider } = await import('../i18n/I18nProvider');

type Api = ReturnType<typeof useCloudSync>;

// Stable identity: the auth subscription depends on it, and a new function per
// render would resubscribe forever.
const ignoreToast = () => undefined;

let api: Api;
let store: LibraryStore;

/** Hands the test the committed hook result and the store backing it. */
type Publish = (next: Api, backing: LibraryStore) => void;

const Harness: React.FC<{ publish: Publish }> = ({ publish }) => {
  const [books, setBooks] = useState<Book[]>([]);
  const [shelves, setShelves] = useState<Shelf[]>([]);
  const [readingGoals, setReadingGoals] = useState<ReadingGoals>({});
  const [monthlyGoal, setMonthlyGoal] = useState(5);
  const [deletedBookIds, setDeletedBookIds] = useState<string[]>([]);
  const [deletedShelfIds, setDeletedShelfIds] = useState<string[]>([]);
  const [syncFingerprints, setSyncFingerprints] = useState<SyncFingerprints>({ books: {}, shelves: {}, meta: '' });
  const [ownerUid, setOwnerUid] = useState<string | null>('uid-1');

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
  const current = useCloudSync(backing, ignoreToast);
  useEffect(() => publish(current, backing));
  return null;
};

async function mount(): Promise<void> {
  await act(async () => {
    render(
      <I18nProvider>
        <Harness
          publish={(next, backing) => {
            api = next;
            store = backing;
          }}
        />
      </I18nProvider>
    );
  });
}

afterEach(() => {
  cleanup();
  pushed.length = 0;
  releasePush = null;
});

describe('a push in flight', () => {
  it('keeps a tombstone recorded while it was running', async () => {
    await mount();
    await act(async () => store.setDeletedBookIds(['deleted-before']));

    let finished: Promise<void>;
    await act(async () => {
      finished = api.syncNow();
    });

    // The reader deletes another book while the request is still open.
    await act(async () => store.setDeletedBookIds((prev) => [...prev, 'deleted-during']));
    await act(async () => {
      releasePush?.();
      await finished;
    });

    expect(pushed).toHaveLength(1);
    expect(pushed[0].deletedBookIds).toEqual(['deleted-before']);
    // Dropping the whole list here would leave the book in the cloud, and the
    // next fetch would merge it back into the library.
    expect(store.deletedBookIds).toEqual(['deleted-during']);
  });

  it('keeps the same guarantee for shelves', async () => {
    await mount();
    await act(async () => store.setDeletedShelfIds(['shelf-before']));

    let finished: Promise<void>;
    await act(async () => {
      finished = api.syncNow();
    });
    await act(async () => store.setDeletedShelfIds((prev) => [...prev, 'shelf-during']));
    await act(async () => {
      releasePush?.();
      await finished;
    });

    expect(pushed[0].deletedShelfIds).toEqual(['shelf-before']);
    expect(store.deletedShelfIds).toEqual(['shelf-during']);
  });

  it('still reports unsynced work when the library changed mid-push', async () => {
    await mount();

    let finished: Promise<void>;
    await act(async () => {
      finished = api.syncNow();
    });
    await act(async () => store.setMonthlyGoal(9));
    await act(async () => {
      releasePush?.();
      await finished;
    });

    expect(api.hasUnsyncedChanges).toBe(true);
  });

  it('clears the flag when nothing happened while it ran', async () => {
    await mount();
    await act(async () => store.setMonthlyGoal(7));

    let finished: Promise<void>;
    await act(async () => {
      finished = api.syncNow();
    });
    await act(async () => {
      releasePush?.();
      await finished;
    });

    expect(api.hasUnsyncedChanges).toBe(false);
  });

  it('refuses to start a second push on top of the first', async () => {
    await mount();

    let first: Promise<void>;
    await act(async () => {
      first = api.syncNow();
    });
    await act(async () => {
      await api.syncNow();
    });

    expect(pushed).toHaveLength(1);

    await act(async () => {
      releasePush?.();
      await first;
    });
  });
});
