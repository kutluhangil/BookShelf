import { getFirestoreApi } from '../lib/firebase';
import type { WriteBatch } from 'firebase/firestore';
import { Book, Shelf, ReadingGoals } from '../types';
import { fingerprint, SyncFingerprints } from './syncPlan';

/** Firestore rejects `undefined`; strip those keys before writing. */
function stripUndefined(value: object): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (entry !== undefined) cleaned[key] = entry;
  }
  return cleaned;
}

export interface SyncPayload {
  /** Only the books that changed since the last push, not the whole library. */
  books: Book[];
  shelves: Shelf[];
  readingGoals?: ReadingGoals;
  monthlyGoal?: number;
  /** Skipped when the goals are unchanged, so an idle sync writes nothing. */
  writeMeta?: boolean;
  deletedBookIds?: string[];
  deletedShelfIds?: string[];
}

/**
 * A user's library lives under `users/{uid}/books` and `users/{uid}/shelves`.
 * Ownership is the document path, so no record has to carry a `userId` field,
 * no read needs a `where` clause (and therefore no composite index), and the
 * security rules reduce to a single uid comparison.
 */
const bookPath = (userId: string, bookId: string) => ['users', userId, 'books', bookId] as const;
const shelfPath = (userId: string, shelfId: string) => ['users', userId, 'shelves', shelfId] as const;

/**
 * Pushes the given records to Firestore and removes documents the user deleted
 * locally, so deletions do not resurrect on the next fetch.
 *
 * The caller decides what to send: see `planSync`, which narrows a library down
 * to the records whose content actually changed. Passing everything still works
 * and is what a first sync does.
 */
export const syncToCloud = async (userId: string, payload: SyncPayload): Promise<void> => {
  const {
    books,
    shelves,
    readingGoals,
    monthlyGoal,
    writeMeta = true,
    deletedBookIds = [],
    deletedShelfIds = [],
  } = payload;

  if (books.length === 0 && shelves.length === 0 && !writeMeta && deletedBookIds.length === 0 && deletedShelfIds.length === 0) {
    return;
  }

  const { db, doc, writeBatch } = await getFirestoreApi();

  const operations: Array<(batch: WriteBatch) => void> = [];

  for (const shelf of shelves) {
    operations.push((batch) => batch.set(doc(db, ...shelfPath(userId, shelf.id)), stripUndefined(shelf), { merge: true }));
  }
  for (const book of books) {
    operations.push((batch) => batch.set(doc(db, ...bookPath(userId, book.id)), stripUndefined(book), { merge: true }));
  }
  for (const bookId of deletedBookIds) {
    operations.push((batch) => batch.delete(doc(db, ...bookPath(userId, bookId))));
  }
  for (const shelfId of deletedShelfIds) {
    operations.push((batch) => batch.delete(doc(db, ...shelfPath(userId, shelfId))));
  }
  if (writeMeta) {
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
  }

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
  const { db, collection, doc, getDoc, getDocs } = await getFirestoreApi();
  const books: Book[] = [];
  const shelves: Shelf[] = [];

  const shelvesSnapshot = await getDocs(collection(db, 'users', userId, 'shelves'));
  shelvesSnapshot.forEach((snap) => shelves.push(snap.data() as Shelf));

  const booksSnapshot = await getDocs(collection(db, 'users', userId, 'books'));
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
  deleted: { bookIds: string[]; shelfIds: string[] },
  /**
   * Fingerprints of the last successful push. They turn the shelf merge into a
   * three-way one: a shelf the cloud changed but this device did not is a
   * remote edit to accept, not a conflict to overwrite.
   */
  lastSynced: SyncFingerprints = { books: {}, shelves: {}, meta: '' }
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

  // Shelves carry no timestamp, so the books' newest-wins rule does not apply.
  // The last-synced fingerprint supplies the missing third point of reference:
  // if the local copy still matches what this device pushed, any difference in
  // the cloud copy is someone else's newer edit. Local edits still win, but a
  // remote rename is no longer silently thrown away, and either way it is
  // reported rather than resolved in silence.
  const shelfMap = new Map<string, Shelf>();

  for (const shelf of cloud.shelves) {
    if (deletedShelves.has(shelf.id)) continue;
    shelfMap.set(shelf.id, shelf);
  }

  for (const shelf of local.shelves) {
    const remote = shelfMap.get(shelf.id);
    if (!remote) {
      shelfMap.set(shelf.id, shelf);
      continue;
    }

    const localPrint = fingerprint(shelf);
    const remotePrint = fingerprint(remote);
    if (localPrint === remotePrint) {
      shelfMap.set(shelf.id, shelf);
      continue;
    }

    const pushedPrint = lastSynced.shelves[shelf.id];
    const localIsUntouched = pushedPrint !== undefined && pushedPrint === localPrint;
    const keepLocal = !localIsUntouched;

    conflicts.push({ id: shelf.id, title: shelf.name, keptSide: keepLocal ? 'local' : 'cloud' });
    shelfMap.set(shelf.id, keepLocal ? shelf : remote);
  }

  return {
    books: Array.from(bookMap.values()),
    shelves: Array.from(shelfMap.values()).sort((a, b) => a.sortOrder - b.sortOrder),
    conflicts,
    addedFromCloud,
  };
}
