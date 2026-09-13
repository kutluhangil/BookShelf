import { getFirestoreApi } from '../lib/firebase';
import type { DocumentData, DocumentReference, WriteBatch } from 'firebase/firestore';
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
/** Firestore batches are capped at 500 writes; chunk to stay well inside the limit. */
const CHUNK_SIZE = 400;

const bookPath = (userId: string, bookId: string) => ['users', userId, 'books', bookId] as const;
const shelfPath = (userId: string, shelfId: string) => ['users', userId, 'shelves', shelfId] as const;
const deletionPath = (userId: string, kind: DeletionKind, id: string) =>
  ['users', userId, 'deletions', `${kind}:${id}`] as const;

export type DeletionKind = 'book' | 'shelf';

/**
 * A record the owner deleted, kept after the document itself is gone.
 *
 * Deleting a document is invisible to a second device: it only ever sees what
 * the cloud holds, so a book it still has locally looks like a record the cloud
 * has never heard of, and the merge pushes it straight back up. The tombstone
 * is the missing evidence that the record was deleted, and when.
 */
export interface RemoteDeletion {
  id: string;
  kind: DeletionKind;
  /** ISO timestamp. A local record edited after it survives the deletion. */
  deletedAt: string;
}

/**
 * How long a tombstone is kept. It has to outlive the longest plausible gap
 * between two of a reader's devices being online; past that the record comes
 * back on a device that was away, which is the same outcome as today.
 */
const TOMBSTONE_TTL_DAYS = 180;

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
  // Each deletion is two writes: the document goes, and a tombstone records
  // that it went, so another device stops pushing its own copy back up.
  const deletedAt = new Date().toISOString();
  for (const bookId of deletedBookIds) {
    operations.push((batch) => batch.delete(doc(db, ...bookPath(userId, bookId))));
    operations.push((batch) =>
      batch.set(doc(db, ...deletionPath(userId, 'book', bookId)), { id: bookId, kind: 'book', deletedAt })
    );
  }
  for (const shelfId of deletedShelfIds) {
    operations.push((batch) => batch.delete(doc(db, ...shelfPath(userId, shelfId))));
    operations.push((batch) =>
      batch.set(doc(db, ...deletionPath(userId, 'shelf', shelfId)), { id: shelfId, kind: 'shelf', deletedAt })
    );
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
  /** Records another device deleted; absent on a snapshot from an older build. */
  deletions?: RemoteDeletion[];
}

/**
 * Documents written before schema 3 carry `proofOfCaptureUrl`, a second copy of
 * the book's spine crop. The local migration only sees local records, so
 * without this a cloud fetch would put the duplicate straight back into the
 * library — and into local storage — on the next merge.
 */
const LEGACY_DUPLICATE_CROP_KEY = 'proofOfCaptureUrl';

function dropLegacyFields(raw: Record<string, unknown>): Book {
  if (!(LEGACY_DUPLICATE_CROP_KEY in raw)) return raw as unknown as Book;
  const { [LEGACY_DUPLICATE_CROP_KEY]: legacyCrop, ...rest } = raw;
  return (rest.spineCropUrl ? rest : { ...rest, spineCropUrl: String(legacyCrop ?? '') }) as unknown as Book;
}

export const fetchFromCloud = async (userId: string): Promise<CloudSnapshot> => {
  const { db, collection, doc, getDoc, getDocs, writeBatch, deleteField } = await getFirestoreApi();
  const books: Book[] = [];
  const shelves: Shelf[] = [];

  const shelvesSnapshot = await getDocs(collection(db, 'users', userId, 'shelves'));
  shelvesSnapshot.forEach((snap) => shelves.push(snap.data() as Shelf));

  const booksSnapshot = await getDocs(collection(db, 'users', userId, 'books'));
  const legacyRefs: Array<DocumentReference<DocumentData>> = [];
  booksSnapshot.forEach((snap) => {
    const data = snap.data();
    if (LEGACY_DUPLICATE_CROP_KEY in data) legacyRefs.push(snap.ref);
    books.push(dropLegacyFields(data));
  });

  // Dropping the field on read only protects the local library. Until it is
  // deleted at the source it keeps eating the document's 1MB budget and is
  // downloaded again on every fetch.
  for (let i = 0; i < legacyRefs.length; i += CHUNK_SIZE) {
    const batch = writeBatch(db);
    legacyRefs
      .slice(i, i + CHUNK_SIZE)
      .forEach((ref) => batch.update(ref, { [LEGACY_DUPLICATE_CROP_KEY]: deleteField() }));
    await batch.commit();
  }

  const deletionsSnapshot = await getDocs(collection(db, 'users', userId, 'deletions'));
  const deletions: RemoteDeletion[] = [];
  const expiredRefs: Array<DocumentReference<DocumentData>> = [];
  const expiresBefore = Date.now() - TOMBSTONE_TTL_DAYS * 24 * 60 * 60 * 1000;
  deletionsSnapshot.forEach((snap) => {
    const entry = snap.data() as RemoteDeletion;
    if (new Date(entry.deletedAt).getTime() < expiresBefore) {
      expiredRefs.push(snap.ref);
      return;
    }
    deletions.push(entry);
  });

  // Tombstones are the only records here nobody ever deletes by hand, so they
  // are swept on read once they are older than any device could still need.
  for (let i = 0; i < expiredRefs.length; i += CHUNK_SIZE) {
    const batch = writeBatch(db);
    expiredRefs.slice(i, i + CHUNK_SIZE).forEach((ref) => batch.delete(ref));
    await batch.commit();
  }

  const userSnap = await getDoc(doc(db, 'users', userId));
  const userData = userSnap.exists() ? userSnap.data() : undefined;

  return {
    books,
    shelves,
    deletions,
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
  /** Local records dropped because another device deleted them. */
  removedByRemote: Array<{ id: string; title: string }>;
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

  // A record another device deleted is only still wanted here if this device
  // touched it afterwards; otherwise keeping it would push it back up and undo
  // the deletion on every device.
  const remoteBookDeaths = new Map<string, number>();
  const remoteShelfDeaths = new Map<string, number>();
  for (const entry of cloud.deletions ?? []) {
    const at = new Date(entry.deletedAt).getTime();
    if (Number.isNaN(at)) continue;
    (entry.kind === 'shelf' ? remoteShelfDeaths : remoteBookDeaths).set(entry.id, at);
  }

  const survivesRemoteDeletion = (id: string, localTime: number, deaths: Map<string, number>): boolean => {
    const deathTime = deaths.get(id);
    return deathTime === undefined || localTime > deathTime;
  };

  const bookMap = new Map<string, Book>();
  const conflicts: MergeResult['conflicts'] = [];
  const remotelyDeleted: MergeResult['removedByRemote'] = [];
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
      const localTime = new Date(book.updatedAt ?? book.addedAt).getTime();
      if (!survivesRemoteDeletion(book.id, localTime, remoteBookDeaths)) {
        remotelyDeleted.push({ id: book.id, title: book.title });
        continue;
      }
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
      // Shelves carry no timestamp, so there is nothing that can outrank a
      // remote deletion: a shelf deleted elsewhere goes.
      if (remoteShelfDeaths.has(shelf.id)) {
        remotelyDeleted.push({ id: shelf.id, title: shelf.name });
        continue;
      }
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
    removedByRemote: remotelyDeleted,
  };
}
