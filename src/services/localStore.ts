import { Book, Shelf, ReadingGoals } from '../types';

const STORAGE_KEY = 'bookshelf.library.v1';
const SCHEMA_VERSION = 1;

export interface PersistedLibrary {
  version: number;
  books: Book[];
  shelves: Shelf[];
  readingGoals: ReadingGoals;
  monthlyGoal: number;
  /** Book ids deleted locally, so a later cloud sync can remove them remotely too. */
  deletedBookIds: string[];
  deletedShelfIds: string[];
  updatedAt: string;
}

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

export function loadLibrary(): PersistedLibrary | null {
  const storage = getStorage();
  if (!storage) return null;

  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) return null;

  const parsed = JSON.parse(raw) as PersistedLibrary;
  if (parsed.version !== SCHEMA_VERSION) {
    throw new Error(
      `Stored library uses schema version ${parsed.version}, expected ${SCHEMA_VERSION}. ` +
        `Clear the "${STORAGE_KEY}" localStorage key to reset.`
    );
  }
  return parsed;
}

export function saveLibrary(data: Omit<PersistedLibrary, 'version' | 'updatedAt'>): void {
  const storage = getStorage();
  if (!storage) return;

  const payload: PersistedLibrary = {
    ...data,
    version: SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
  };
  storage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function clearLibrary(): void {
  getStorage()?.removeItem(STORAGE_KEY);
}

export function isPersistenceAvailable(): boolean {
  return getStorage() !== null;
}
