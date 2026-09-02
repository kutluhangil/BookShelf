import { Book, Shelf, ReadingGoals } from '../types';

/**
 * Content fingerprints of everything the last successful push wrote.
 *
 * Without them every sync re-wrote the whole library: one edited note cost a
 * Firestore write per book. A fingerprint is compared against the record's
 * current content, so it does not depend on any mutation site remembering to
 * bump a timestamp, and the worst a stale one can do is schedule a write that
 * was not needed.
 */
export interface SyncFingerprints {
  books: Record<string, string>;
  shelves: Record<string, string>;
  /** Covers the reading goals and the monthly goal, which live on one document. */
  meta: string;
}

export const EMPTY_FINGERPRINTS: SyncFingerprints = { books: {}, shelves: {}, meta: '' };

/** Stable JSON: keys are sorted, so a differently ordered object is not "changed". */
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, entry]) => entry !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`).join(',')}}`;
}

/** FNV-1a, 32-bit. Not a security hash — it only has to notice an edit. */
export function fingerprint(value: unknown): string {
  const text = stableStringify(value);
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(36);
}

function fingerprintAll<T extends { id: string }>(records: T[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const record of records) map[record.id] = fingerprint(record);
  return map;
}

export interface SyncInput {
  books: Book[];
  shelves: Shelf[];
  readingGoals: ReadingGoals;
  monthlyGoal: number;
}

export interface SyncPlan {
  /** Only the records whose content differs from the last successful push. */
  books: Book[];
  shelves: Shelf[];
  writeMeta: boolean;
  /** The fingerprints to store once the push succeeds. */
  next: SyncFingerprints;
}

/** Works out the smallest set of writes that brings the cloud up to date. */
export function planSync(input: SyncInput, known: SyncFingerprints): SyncPlan {
  const bookPrints = fingerprintAll(input.books);
  const shelfPrints = fingerprintAll(input.shelves);
  const metaPrint = fingerprint({ readingGoals: input.readingGoals, monthlyGoal: input.monthlyGoal });

  return {
    books: input.books.filter((book) => known.books[book.id] !== bookPrints[book.id]),
    shelves: input.shelves.filter((shelf) => known.shelves[shelf.id] !== shelfPrints[shelf.id]),
    writeMeta: known.meta !== metaPrint,
    next: { books: bookPrints, shelves: shelfPrints, meta: metaPrint },
  };
}

/** Number of documents the plan will write, for reporting. */
export function planSize(plan: SyncPlan): number {
  return plan.books.length + plan.shelves.length + (plan.writeMeta ? 1 : 0);
}

/**
 * Drops the fingerprints of records that no longer exist locally, so the map
 * does not grow forever as books are deleted.
 */
export function pruneFingerprints(prints: SyncFingerprints, input: SyncInput): SyncFingerprints {
  const bookIds = new Set(input.books.map((book) => book.id));
  const shelfIds = new Set(input.shelves.map((shelf) => shelf.id));
  return {
    books: Object.fromEntries(Object.entries(prints.books).filter(([id]) => bookIds.has(id))),
    shelves: Object.fromEntries(Object.entries(prints.shelves).filter(([id]) => shelfIds.has(id))),
    meta: prints.meta,
  };
}
