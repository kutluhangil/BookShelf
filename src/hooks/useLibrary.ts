import { useEffect, useState } from 'react';
import { Book, Shelf, ReadingGoals } from '../types';
import { INITIAL_BOOKS, INITIAL_SHELVES } from '../data/initialLibrary';
import { loadLibrary, scheduleSaveLibrary, flushLibrary } from '../services/localStore';
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
  /** Whether a stored library was found, as opposed to the bundled starter one. */
  restored: boolean;
  /**
   * Kept raw rather than formatted: this runs before the i18n provider exists,
   * so the message is rendered later, in the reader's own language.
   */
  error: unknown;
}

const STARTER: Omit<InitialLibrary, 'error' | 'restored'> = {
  books: INITIAL_BOOKS,
  shelves: INITIAL_SHELVES,
  readingGoals: DEFAULT_GOALS,
  monthlyGoal: DEFAULT_MONTHLY_GOAL,
  deletedBookIds: [],
  deletedShelfIds: [],
  syncFingerprints: EMPTY_FINGERPRINTS,
};

/** Reads the persisted library once, falling back to the bundled starter library. */
function readInitialLibrary(): InitialLibrary {
  try {
    const stored = loadLibrary();
    if (!stored) return { ...STARTER, restored: false, error: null };

    return {
      books: stored.books,
      shelves: stored.shelves,
      readingGoals: stored.readingGoals ?? DEFAULT_GOALS,
      monthlyGoal: stored.monthlyGoal ?? DEFAULT_MONTHLY_GOAL,
      deletedBookIds: stored.deletedBookIds ?? [],
      deletedShelfIds: stored.deletedShelfIds ?? [],
      syncFingerprints: stored.syncFingerprints ?? EMPTY_FINGERPRINTS,
      restored: true,
      error: null,
    };
  } catch (error) {
    return { ...STARTER, restored: false, error };
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

  // Persist every mutation, coalesced: this used to serialise the whole library
  // synchronously on every keystroke in a note.
  useEffect(() => {
    scheduleSaveLibrary({
      books,
      shelves,
      readingGoals,
      monthlyGoal,
      deletedBookIds,
      deletedShelfIds,
      syncFingerprints,
    });
  }, [books, shelves, readingGoals, monthlyGoal, deletedBookIds, deletedShelfIds, syncFingerprints]);

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
  };
}
