import { getFirestoreApi } from '../lib/firebase';
import type { WriteBatch } from 'firebase/firestore';
import { Book, Shelf, ReadingGoals } from '../types';

/** Firestore rejects `undefined`; strip those keys before writing. */
function stripUndefined<T extends Record<string, unknown>>(value: T): T {
  const cleaned: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (entry !== undefined) cleaned[key] = entry;
  }
  return cleaned as T;
}

export interface SyncPayload {
  books: Book[];
  shelves: Shelf[];
  readingGoals?: ReadingGoals;
  monthlyGoal?: number;
  deletedBookIds?: string[];
  deletedShelfIds?: string[];
}

/**
 * Pushes the local library to Firestore and removes documents the user deleted
 * locally, so deletions do not resurrect on the next fetch.
 */
export const syncToCloud = async (userId: string, payload: SyncPayload): Promise<void> => {
  const { db, doc, writeBatch } = await getFirestoreApi();
  const { books, shelves, readingGoals, monthlyGoal, deletedBookIds = [], deletedShelfIds = [] } = payload;

  const operations: Array<(batch: WriteBatch) => void> = [];

  for (const shelf of shelves) {
    operations.push((batch) =>
      batch.set(doc(db, 'shelves', shelf.id), stripUndefined({ ...shelf, userId }), { merge: true })
    );
  }
  for (const book of books) {
    operations.push((batch) =>
      batch.set(doc(db, 'books', book.id), stripUndefined({ ...book, userId }), { merge: true })
    );
  }
  for (const bookId of deletedBookIds) {
    operations.push((batch) => batch.delete(doc(db, 'books', bookId)));
  }
  for (const shelfId of deletedShelfIds) {
    operations.push((batch) => batch.delete(doc(db, 'shelves', shelfId)));
  }
  operations.push((batch) =>
    batch.set(
      doc(db, 'users', userId),
      stripUndefined({
        lastSync: new Date().toISOString(),
        readingGoals: readingGoals ?? null,
        monthlyGoal: monthlyGoal ?? null,
      }),
      { merge: true }
    )
  );

  // Firestore batches are capped at 500 writes; chunk to stay well inside the limit.
  const CHUNK_SIZE = 400;
  for (let i = 0; i < operations.length; i += CHUNK_SIZE) {
    const batch = writeBatch(db);
    operations.slice(i, i + CHUNK_SIZE).forEach((apply) => apply(batch));
    await batch.commit();
  }
};

export interface CloudSnapshot {
  books: Book[];
  shelves: Shelf[];
  readingGoals?: ReadingGoals;
  monthlyGoal?: number;
}

export const fetchFromCloud = async (userId: string): Promise<CloudSnapshot> => {
  const { db, collection, doc, getDoc, getDocs, query, where } = await getFirestoreApi();
  const books: Book[] = [];
  const shelves: Shelf[] = [];

  const shelvesSnapshot = await getDocs(query(collection(db, 'shelves'), where('userId', '==', userId)));
  shelvesSnapshot.forEach((snap) => shelves.push(snap.data() as Shelf));

  const booksSnapshot = await getDocs(query(collection(db, 'books'), where('userId', '==', userId)));
  booksSnapshot.forEach((snap) => books.push(snap.data() as Book));

  const userSnap = await getDoc(doc(db, 'users', userId));
  const userData = userSnap.exists() ? userSnap.data() : undefined;

  return {
    books,
    shelves,
    readingGoals: userData?.readingGoals ?? undefined,
    monthlyGoal: userData?.monthlyGoal ?? undefined,
  };
};

/**
 * Merges a cloud snapshot into the local state instead of overwriting it.
 * Conflicts are resolved per entity: locally deleted ids win, otherwise the copy
 * with the newer `updatedAt`/`addedAt` timestamp wins.
 */
export interface MergeResult {
  books: Book[];
  shelves: Shelf[];
  /** Records that existed on both sides with different timestamps. */
  conflicts: Array<{ id: string; title: string; keptSide: 'local' | 'cloud' }>;
  addedFromCloud: number;
}

export function mergeLibraries(
  local: { books: Book[]; shelves: Shelf[] },
  cloud: CloudSnapshot,
  deleted: { bookIds: string[]; shelfIds: string[] }
): MergeResult {
  const deletedBooks = new Set(deleted.bookIds);
  const deletedShelves = new Set(deleted.shelfIds);

  const bookMap = new Map<string, Book>();
  const conflicts: MergeResult['conflicts'] = [];
  const localIds = new Set(local.books.map((book) => book.id));
  let addedFromCloud = 0;

  for (const book of cloud.books) {
    if (deletedBooks.has(book.id)) continue;
    bookMap.set(book.id, book);
    if (!localIds.has(book.id)) addedFromCloud++;
  }

  for (const book of local.books) {
    const existing = bookMap.get(book.id);
    if (!existing) {
      bookMap.set(book.id, book);
      continue;
    }
    const localTime = new Date(book.updatedAt ?? book.addedAt).getTime();
    const cloudTime = new Date(existing.updatedAt ?? existing.addedAt).getTime();
    const keepLocal = localTime >= cloudTime;

    // Only a genuine divergence counts: identical timestamps mean the same edit.
    if (localTime !== cloudTime) {
      conflicts.push({ id: book.id, title: book.title, keptSide: keepLocal ? 'local' : 'cloud' });
    }
    bookMap.set(book.id, keepLocal ? book : existing);
  }

  const shelfMap = new Map<string, Shelf>();
  for (const shelf of cloud.shelves) {
    if (!deletedShelves.has(shelf.id)) shelfMap.set(shelf.id, shelf);
  }
  for (const shelf of local.shelves) {
    shelfMap.set(shelf.id, shelf);
  }

  return {
    books: Array.from(bookMap.values()),
    shelves: Array.from(shelfMap.values()).sort((a, b) => a.sortOrder - b.sortOrder),
    conflicts,
    addedFromCloud,
  };
}
