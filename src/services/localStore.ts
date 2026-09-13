import { Book, Shelf, ReadingGoals } from '../types';
import { AppError, toDetail } from './appError';
import { EMPTY_FINGERPRINTS, SyncFingerprints } from './syncPlan';

const STORAGE_KEY = 'bookshelf.library.v1';
/** Where a record this build cannot read is kept instead of being overwritten. */
const UNREADABLE_KEY = 'bookshelf.library.v1.unreadable';
const SCHEMA_VERSION = 4;

/** The schema-2 field that held a second copy of every spine crop. */
const DUPLICATE_CROP_KEY = 'proofOfCaptureUrl';

export interface PersistedLibrary {
  version: number;
  books: Book[];
  shelves: Shelf[];
  readingGoals: ReadingGoals;
  monthlyGoal: number;
  /** Book ids deleted locally, so a later cloud sync can remove them remotely too. */
  deletedBookIds: string[];
  deletedShelfIds: string[];
  /** Content fingerprints of the last successful cloud push (schema 2). */
  syncFingerprints: SyncFingerprints;
  /**
   * The account these records belong to, or null while the library has never
   * been signed in (schema 4). Signing in with a different account must not
   * merge one reader's library into another's.
   */
  ownerUid: string | null;
  updatedAt: string;
}

/** What a caller supplies; the version and timestamp are ours to set. */
export type LibrarySnapshot = Omit<PersistedLibrary, 'version' | 'updatedAt'>;

function getStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    const probe = '__bookshelf_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    // Private mode / storage disabled. The app still runs, it just cannot persist.
    return null;
  }
}

/**
 * Brings an older record up to the current schema.
 *
 * A version bump used to throw, and the caller's fallback is the bundled
 * starter library — so shipping a new field would have silently replaced every
 * existing reader's library. Only a record from a *newer* schema is refused,
 * because this build genuinely cannot know what is in it.
 */
export function migrateLibrary(parsed: PersistedLibrary): PersistedLibrary {
  if (parsed.version > SCHEMA_VERSION) {
    throw new AppError('storage.schemaMismatch', {
      found: parsed.version,
      expected: SCHEMA_VERSION,
      key: STORAGE_KEY,
    });
  }

  let record = parsed;

  // 1 -> 2: sync fingerprints did not exist. An empty map means the next push
  // writes everything once, which is exactly what used to happen every time.
  if (record.version < 2) {
    record = { ...record, syncFingerprints: EMPTY_FINGERPRINTS, version: 2 };
  }

  // 2 -> 3: every scanned book carried its spine crop twice, once as
  // `spineCropUrl` and once as `proofOfCaptureUrl`. A crop is a base64 JPEG, so
  // the duplicate was half of what a scanned library occupied. Dropping it here
  // reclaims that space on the next write rather than only for new scans.
  if (record.version < 3) {
    record = {
      ...record,
      books: record.books.map((book) => {
        if (!(DUPLICATE_CROP_KEY in book)) return book;
        const { [DUPLICATE_CROP_KEY]: legacyCrop, ...rest } = book as Book & Record<string, unknown>;
        // Keep the crop if the surviving field is the empty one.
        return rest.spineCropUrl ? (rest as Book) : ({ ...rest, spineCropUrl: String(legacyCrop ?? '') } as Book);
      }),
      version: 3,
    };
  }

  // 3 -> 4: the record did not say whose library it was, so signing in with a
  // second account merged the first account's books into it and pushed them to
  // its cloud. An existing record predates the field; null means "unclaimed",
  // and the next sign-in claims it.
  if (record.version < 4) {
    record = { ...record, ownerUid: null, version: 4 };
  }

  return record;
}

export function loadLibrary(): PersistedLibrary | null {
  const storage = getStorage();
  if (!storage) return null;

  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) return null;

  return migrateLibrary(JSON.parse(raw) as PersistedLibrary);
}

/** What became of a record that could not be read. */
export type QuarantineOutcome =
  | { status: 'moved'; key: string }
  | { status: 'nothing-stored' }
  | { status: 'failed'; error: unknown };

/**
 * Moves aside a record this build cannot read.
 *
 * The caller's fallback for an unreadable record is the bundled starter
 * library, and the next coalesced write would put that starter library exactly
 * where the reader's own one was — a record from a newer build, or one a fixed
 * build could still salvage, gone for good. Copying the raw text to a second
 * key first lets the record survive being replaced in memory. When the copy
 * itself cannot be made, nothing is removed and the caller keeps persistence
 * off rather than destroy the record.
 */
export function quarantineUnreadableLibrary(): QuarantineOutcome {
  const storage = getStorage();
  if (!storage) return { status: 'nothing-stored' };

  const raw = storage.getItem(STORAGE_KEY);
  if (raw === null) return { status: 'nothing-stored' };

  try {
    storage.setItem(UNREADABLE_KEY, raw);
  } catch (error) {
    return { status: 'failed', error };
  }

  storage.removeItem(STORAGE_KEY);
  return { status: 'moved', key: UNREADABLE_KEY };
}

/**
 * Every browser spells a full quota differently, and Safari reports it as a
 * plain `QuotaExceededError` with code 22 while Firefox uses 1014.
 */
function isQuotaExceeded(error: unknown): boolean {
  if (!(error instanceof DOMException)) return false;
  return (
    error.name === 'QuotaExceededError' ||
    error.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    error.code === 22 ||
    error.code === 1014
  );
}

export function saveLibrary(data: LibrarySnapshot): void {
  const storage = getStorage();
  if (!storage) return;

  const payload: PersistedLibrary = {
    ...data,
    version: SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
  };
  const serialized = JSON.stringify(payload);

  try {
    storage.setItem(STORAGE_KEY, serialized);
  } catch (error) {
    // A full quota is the one failure a reader can act on, and the one this
    // app actually provokes: a scanned book carries a base64 spine photo.
    if (isQuotaExceeded(error)) {
      throw new AppError(
        'storage.quotaExceeded',
        { megabytes: (serialized.length / (1024 * 1024)).toFixed(1), key: STORAGE_KEY },
        { detail: toDetail(error), cause: error }
      );
    }
    throw error;
  }
}

/**
 * Persistence failures have no caller to throw to: the write runs from a timer
 * and from `pagehide`. Without a channel out, a full quota meant the library
 * simply stopped being saved and nothing on screen ever said so.
 */
type PersistenceErrorListener = (error: unknown) => void;

const errorListeners = new Set<PersistenceErrorListener>();
let reportedFailure: string | null = null;

export function onPersistenceError(listener: PersistenceErrorListener): () => void {
  errorListeners.add(listener);
  return () => {
    errorListeners.delete(listener);
  };
}

function reportPersistenceFailure(error: unknown): void {
  // The same failure recurs on every coalesced write; it is one problem, not
  // one per keystroke. A different failure, or a recurrence after a successful
  // write, is reported again.
  const signature = error instanceof AppError ? error.code : toDetail(error);
  if (signature === reportedFailure) return;
  reportedFailure = signature;
  errorListeners.forEach((listener) => listener(error));
}

/**
 * Coalesced writes.
 *
 * Persisting ran on every state change, and each run serialised the entire
 * library synchronously on the main thread — once per keystroke in a note, per
 * frame of a drag. Only the last write in a burst matters, so the burst is
 * collapsed. `flushLibrary` exists because a pending write must not be lost to
 * a closing tab.
 */
const SAVE_DELAY_MS = 400;

let pending: LibrarySnapshot | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;

export function scheduleSaveLibrary(data: LibrarySnapshot): void {
  pending = data;
  if (timer !== null) return;
  timer = setTimeout(() => {
    timer = null;
    flushLibrary();
  }, SAVE_DELAY_MS);
}

/** Writes any coalesced snapshot immediately. Safe to call when none is waiting. */
export function flushLibrary(): void {
  if (timer !== null) {
    clearTimeout(timer);
    timer = null;
  }
  if (!pending) return;
  const data = pending;
  pending = null;

  try {
    saveLibrary(data);
    reportedFailure = null;
  } catch (error) {
    reportPersistenceFailure(error);
  }
}

export function clearLibrary(): void {
  pending = null;
  reportedFailure = null;
  if (timer !== null) {
    clearTimeout(timer);
    timer = null;
  }
  getStorage()?.removeItem(STORAGE_KEY);
}

export function isPersistenceAvailable(): boolean {
  return getStorage() !== null;
}
