import { Book, Shelf, ReadingGoals } from '../types';
import { AppError } from './appError';
import { EMPTY_FINGERPRINTS, SyncFingerprints } from './syncPlan';

const STORAGE_KEY = 'bookshelf.library.v1';
const SCHEMA_VERSION = 2;

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

  return record;
}

export function loadLibrary(): PersistedLibrary | null {
  const storage = getStorage();
  if (!storage) return null;

  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) return null;

  return migrateLibrary(JSON.parse(raw) as PersistedLibrary);
}

export function saveLibrary(data: LibrarySnapshot): void {
  const storage = getStorage();
  if (!storage) return;

  const payload: PersistedLibrary = {
    ...data,
    version: SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
  };
  storage.setItem(STORAGE_KEY, JSON.stringify(payload));
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
  saveLibrary(data);
}

export function clearLibrary(): void {
  pending = null;
  if (timer !== null) {
    clearTimeout(timer);
    timer = null;
  }
  getStorage()?.removeItem(STORAGE_KEY);
}

export function isPersistenceAvailable(): boolean {
  return getStorage() !== null;
}
