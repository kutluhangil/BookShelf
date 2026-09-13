import { useEffect, useState } from 'react';
import { Book, Shelf, ReadingGoals } from '../types';
import { INITIAL_BOOKS, INITIAL_SHELVES } from '../data/initialLibrary';
import {
  loadLibrary,
  scheduleSaveLibrary,
  flushLibrary,
  onPersistenceError,
  quarantineUnreadableLibrary,
  type QuarantineOutcome,
} from '../services/localStore';
import { EMPTY_FINGERPRINTS, type SyncFingerprints } from '../services/syncPlan';

export const DEFAULT_GOALS: ReadingGoals = {
  annualPageCount: 10000,
  annualBookCount: 50,
  genreMilestones: [],
};

const DEFAULT_MONTHLY_GOAL = 5;

interface InitialLibrary {
  books: Book[];
  shelves: Shelf[];
  readingGoals: ReadingGoals;
  monthlyGoal: number;
  deletedBookIds: string[];
  deletedShelfIds: string[];
  syncFingerprints: SyncFingerprints;
  /** The account the stored records belong to; null while never signed in. */
  ownerUid: string | null;
  /** Whether a stored library was found, as opposed to the bundled starter one. */
  restored: boolean;
  /** What became of a record that could not be read; null when there was none. */
  quarantine: QuarantineOutcome | null;
  /** False while writing would overwrite a record that could not be moved aside. */
  canPersist: boolean;
  /**
   * Kept raw rather than formatted: this runs before the i18n provider exists,
   * so the message is rendered later, in the reader's own language.
   */
  error: unknown;
}

const STARTER: Omit<InitialLibrary, 'error' | 'restored' | 'quarantine' | 'canPersist'> = {
  books: INITIAL_BOOKS,
  shelves: INITIAL_SHELVES,
  readingGoals: DEFAULT_GOALS,
  monthlyGoal: DEFAULT_MONTHLY_GOAL,
  deletedBookIds: [],
  deletedShelfIds: [],
  syncFingerprints: EMPTY_FINGERPRINTS,
  ownerUid: null,
};

/** Reads the persisted library once, falling back to the bundled starter library. */
function readInitialLibrary(): InitialLibrary {
  try {
    const stored = loadLibrary();
    if (!stored) return { ...STARTER, restored: false, quarantine: null, canPersist: true, error: null };

    return {
      books: stored.books,
      shelves: stored.shelves,
      readingGoals: stored.readingGoals ?? DEFAULT_GOALS,
      monthlyGoal: stored.monthlyGoal ?? DEFAULT_MONTHLY_GOAL,
      deletedBookIds: stored.deletedBookIds ?? [],
      deletedShelfIds: stored.deletedShelfIds ?? [],
      syncFingerprints: stored.syncFingerprints ?? EMPTY_FINGERPRINTS,
      ownerUid: stored.ownerUid ?? null,
      restored: true,
      quarantine: null,
      canPersist: true,
      error: null,
    };
  } catch (error) {
    // The starter library below becomes the live state, and the first coalesced
    // write would put it where the unreadable record is. Move that record aside
    // first; if even the copy fails, persistence stays off for the session
    // rather than trading the reader's library for the demo one.
    const quarantine = quarantineUnreadableLibrary();
    return {
      ...STARTER,
      restored: false,
      quarantine,
      canPersist: quarantine.status !== 'failed',
      error,
    };
  }
}

// Read at module load: the library has to be the very first state the app has,
// before any render can show an empty shelf and then replace it.
export const initialLibrary = readInitialLibrary();

export interface LibraryStore {
  books: Book[];
  setBooks: React.Dispatch<React.SetStateAction<Book[]>>;
  shelves: Shelf[];
  setShelves: React.Dispatch<React.SetStateAction<Shelf[]>>;
  readingGoals: ReadingGoals;
  setReadingGoals: React.Dispatch<React.SetStateAction<ReadingGoals>>;
  monthlyGoal: number;
  setMonthlyGoal: React.Dispatch<React.SetStateAction<number>>;
  /** Tombstones, so a deletion propagates to the cloud instead of resurrecting. */
  deletedBookIds: string[];
  setDeletedBookIds: React.Dispatch<React.SetStateAction<string[]>>;
  deletedShelfIds: string[];
  setDeletedShelfIds: React.Dispatch<React.SetStateAction<string[]>>;
  /** What the last successful push wrote, so the next sends only the difference. */
  syncFingerprints: SyncFingerprints;
  setSyncFingerprints: React.Dispatch<React.SetStateAction<SyncFingerprints>>;
  /** Whose records these are, so a second account cannot absorb the first's. */
  ownerUid: string | null;
  setOwnerUid: React.Dispatch<React.SetStateAction<string | null>>;
  /** The last failed write, so the app can tell the reader it stopped saving. */
  persistenceError: unknown;
}

/**
 * The library itself: the records, and keeping them on disk.
 *
 * Everything here was inline in App alongside the scan flow, the filters and
 * every dialog, which is how a component reaches sixteen hundred lines.
 */
export function useLibrary(): LibraryStore {
  const [books, setBooks] = useState<Book[]>(initialLibrary.books);
  const [shelves, setShelves] = useState<Shelf[]>(initialLibrary.shelves);
  const [readingGoals, setReadingGoals] = useState<ReadingGoals>(initialLibrary.readingGoals);
  const [monthlyGoal, setMonthlyGoal] = useState<number>(initialLibrary.monthlyGoal);
  const [deletedBookIds, setDeletedBookIds] = useState<string[]>(initialLibrary.deletedBookIds);
  const [deletedShelfIds, setDeletedShelfIds] = useState<string[]>(initialLibrary.deletedShelfIds);
  const [syncFingerprints, setSyncFingerprints] = useState<SyncFingerprints>(initialLibrary.syncFingerprints);
  const [ownerUid, setOwnerUid] = useState<string | null>(initialLibrary.ownerUid);
  const [persistenceError, setPersistenceError] = useState<unknown>(null);

  // A coalesced write runs from a timer, so a failure has nowhere to throw.
  useEffect(() => onPersistenceError((error) => setPersistenceError(error)), []);

  // Persist every mutation, coalesced: this used to serialise the whole library
  // synchronously on every keystroke in a note.
  useEffect(() => {
    if (!initialLibrary.canPersist) return;
    scheduleSaveLibrary({
      books,
      shelves,
      readingGoals,
      monthlyGoal,
      deletedBookIds,
      deletedShelfIds,
      syncFingerprints,
      ownerUid,
    });
  }, [books, shelves, readingGoals, monthlyGoal, deletedBookIds, deletedShelfIds, syncFingerprints, ownerUid]);

  // A coalesced write must not be lost to a closing or backgrounded tab.
  // `pagehide` fires where `beforeunload` does not, notably on iOS.
  useEffect(() => {
    const flush = () => flushLibrary();
    const onHidden = () => {
      if (document.visibilityState === 'hidden') flushLibrary();
    };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onHidden);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onHidden);
      flushLibrary();
    };
  }, []);

  // Keep shelf volume counts in sync with the actual books.
  useEffect(() => {
    setShelves((prev) => {
      let changed = false;
      const next = prev.map((shelf) => {
        const count = books.filter((book) => book.shelfId === shelf.id).length;
        if (shelf.volumeCount === count) return shelf;
        changed = true;
        return { ...shelf, volumeCount: count };
      });
      return changed ? next : prev;
    });
  }, [books]);

  return {
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
    persistenceError,
  };
}
