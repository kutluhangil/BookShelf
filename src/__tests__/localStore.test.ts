import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  loadLibrary,
  saveLibrary,
  scheduleSaveLibrary,
  flushLibrary,
  clearLibrary,
  isPersistenceAvailable,
  onPersistenceError,
  quarantineUnreadableLibrary,
} from '../services/localStore';
import { EMPTY_FINGERPRINTS } from '../services/syncPlan';
import { AppError } from '../services/appError';

class MemoryStorage implements Storage {
  private map = new Map<string, string>();
  get length() {
    return this.map.size;
  }
  clear() {
    this.map.clear();
  }
  getItem(key: string) {
    return this.map.get(key) ?? null;
  }
  key(index: number) {
    return Array.from(this.map.keys())[index] ?? null;
  }
  removeItem(key: string) {
    this.map.delete(key);
  }
  setItem(key: string, value: string) {
    this.map.set(key, value);
  }
}

beforeEach(() => {
  vi.stubGlobal('window', { localStorage: new MemoryStorage() });
});

const payload = {
  books: [],
  shelves: [],
  readingGoals: { annualBookCount: 12 },
  monthlyGoal: 3,
  deletedBookIds: ['gone'],
  deletedShelfIds: [],
  syncFingerprints: EMPTY_FINGERPRINTS,
} as unknown as Parameters<typeof saveLibrary>[0];

describe('localStore', () => {
  it('reports availability when storage works', () => {
    expect(isPersistenceAvailable()).toBe(true);
  });

  it('returns null before anything is stored', () => {
    expect(loadLibrary()).toBeNull();
  });

  it('round-trips a library', () => {
    saveLibrary(payload);
    const restored = loadLibrary();
    expect(restored?.monthlyGoal).toBe(3);
    expect(restored?.deletedBookIds).toEqual(['gone']);
    expect(restored?.version).toBe(4);
    expect(restored?.updatedAt).toBeTruthy();
  });

  it('clears stored data', () => {
    saveLibrary(payload);
    clearLibrary();
    expect(loadLibrary()).toBeNull();
  });

  it('raises a coded error on a schema from the future instead of silently resetting', () => {
    window.localStorage.setItem('bookshelf.library.v1', JSON.stringify({ version: 99 }));
    try {
      loadLibrary();
      expect.unreachable('loadLibrary should reject a foreign schema version');
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).code).toBe('storage.schemaMismatch');
      expect((error as AppError).params).toMatchObject({ found: 99, expected: 4 });
    }
  });
});

describe('localStore migrations', () => {
  it('upgrades a schema 1 record instead of discarding the reader\'s library', () => {
    // The caller's fallback for a load failure is the bundled starter library,
    // so a version bump that threw would have silently replaced real data.
    window.localStorage.setItem(
      'bookshelf.library.v1',
      JSON.stringify({
        version: 1,
        books: [{ id: 'b1', title: 'Kept' }],
        shelves: [],
        readingGoals: { annualBookCount: 12 },
        monthlyGoal: 3,
        deletedBookIds: [],
        deletedShelfIds: [],
        updatedAt: '2026-01-01T00:00:00.000Z',
      })
    );

    const restored = loadLibrary();
    expect(restored?.version).toBe(4);
    expect(restored?.books).toHaveLength(1);
    expect(restored?.syncFingerprints).toEqual(EMPTY_FINGERPRINTS);
  });

  it('drops the duplicated spine crop a schema 2 record carried', () => {
    // Every scanned book stored the same base64 JPEG twice. Removing the copy
    // on load reclaims the space for libraries that already exist.
    window.localStorage.setItem(
      'bookshelf.library.v1',
      JSON.stringify({
        version: 2,
        books: [{ id: 'b1', title: 'Scanned', spineCropUrl: 'data:image/jpeg;base64,AAA', proofOfCaptureUrl: 'data:image/jpeg;base64,AAA' }],
        shelves: [],
        readingGoals: {},
        monthlyGoal: 3,
        deletedBookIds: [],
        deletedShelfIds: [],
        syncFingerprints: EMPTY_FINGERPRINTS,
        updatedAt: '2026-01-01T00:00:00.000Z',
      })
    );

    const restored = loadLibrary();
    expect(restored?.version).toBe(4);
    expect(restored?.books[0]).not.toHaveProperty('proofOfCaptureUrl');
    expect(restored?.books[0].spineCropUrl).toBe('data:image/jpeg;base64,AAA');
  });

  it('marks a record written before owners were tracked as unclaimed', () => {
    // Without an owner the next sign-in merged whatever was on the device into
    // that account. Null says "not claimed yet", which the first sign-in fixes.
    window.localStorage.setItem(
      'bookshelf.library.v1',
      JSON.stringify({
        version: 3,
        books: [{ id: 'b1', title: 'Kept' }],
        shelves: [],
        readingGoals: {},
        monthlyGoal: 3,
        deletedBookIds: [],
        deletedShelfIds: [],
        syncFingerprints: EMPTY_FINGERPRINTS,
        updatedAt: '2026-01-01T00:00:00.000Z',
      })
    );

    const restored = loadLibrary();
    expect(restored?.version).toBe(4);
    expect(restored?.ownerUid).toBeNull();
    expect(restored?.books).toHaveLength(1);
  });

  it('keeps the surviving crop when only the removed field held one', () => {
    window.localStorage.setItem(
      'bookshelf.library.v1',
      JSON.stringify({
        version: 2,
        books: [{ id: 'b1', title: 'Scanned', spineCropUrl: '', proofOfCaptureUrl: 'data:image/jpeg;base64,BBB' }],
        shelves: [],
        readingGoals: {},
        monthlyGoal: 3,
        deletedBookIds: [],
        deletedShelfIds: [],
        syncFingerprints: EMPTY_FINGERPRINTS,
        updatedAt: '2026-01-01T00:00:00.000Z',
      })
    );

    const restored = loadLibrary();
    expect(restored?.books[0].spineCropUrl).toBe('data:image/jpeg;base64,BBB');
    expect(restored?.books[0]).not.toHaveProperty('proofOfCaptureUrl');
  });
});

describe('localStore quota failures', () => {
  class FullStorage extends MemoryStorage {
    override setItem(key: string, _value: string) {
      if (key.startsWith('__bookshelf_probe__')) return;
      throw new DOMException('exceeded the quota', 'QuotaExceededError');
    }
  }

  it('raises an actionable coded error rather than a bare DOMException', () => {
    vi.stubGlobal('window', { localStorage: new FullStorage() });
    try {
      saveLibrary(payload);
      expect.unreachable('saveLibrary should reject a full quota');
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).code).toBe('storage.quotaExceeded');
      expect((error as AppError).params).toMatchObject({ key: 'bookshelf.library.v1' });
    }
  });

  it('reports a failed coalesced write to a listener instead of throwing into a timer', () => {
    vi.useFakeTimers();
    vi.stubGlobal('window', { localStorage: new FullStorage() });

    const seen: unknown[] = [];
    const unsubscribe = onPersistenceError((error) => seen.push(error));

    scheduleSaveLibrary(payload);
    // The write runs from a timer: a throw here would reach nobody, and the
    // library would quietly stop being saved.
    expect(() => vi.advanceTimersByTime(500)).not.toThrow();

    expect(seen).toHaveLength(1);
    expect((seen[0] as AppError).code).toBe('storage.quotaExceeded');

    unsubscribe();
    vi.useRealTimers();
  });

  it('reports the same recurring failure once, not once per write', () => {
    vi.useFakeTimers();
    vi.stubGlobal('window', { localStorage: new FullStorage() });
    // The "already reported" mark is module state; start from a clean one.
    clearLibrary();

    const seen: unknown[] = [];
    const unsubscribe = onPersistenceError((error) => seen.push(error));

    scheduleSaveLibrary(payload);
    vi.advanceTimersByTime(500);
    scheduleSaveLibrary({ ...payload, monthlyGoal: 4 });
    vi.advanceTimersByTime(500);
    scheduleSaveLibrary({ ...payload, monthlyGoal: 5 });
    vi.advanceTimersByTime(500);

    expect(seen).toHaveLength(1);

    unsubscribe();
    vi.useRealTimers();
  });
});

describe('localStore coalescing', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('writes once for a burst of changes', () => {
    scheduleSaveLibrary({ ...payload, monthlyGoal: 1 });
    scheduleSaveLibrary({ ...payload, monthlyGoal: 2 });
    scheduleSaveLibrary({ ...payload, monthlyGoal: 3 });

    expect(loadLibrary()).toBeNull();

    vi.advanceTimersByTime(500);
    expect(loadLibrary()?.monthlyGoal).toBe(3);
    vi.useRealTimers();
  });

  it('flushes a pending write on demand, so a closing tab loses nothing', () => {
    scheduleSaveLibrary({ ...payload, monthlyGoal: 9 });
    flushLibrary();
    expect(loadLibrary()?.monthlyGoal).toBe(9);
    vi.useRealTimers();
  });
});

describe('quarantining an unreadable record', () => {
  const STORAGE_KEY = 'bookshelf.library.v1';
  const UNREADABLE_KEY = 'bookshelf.library.v1.unreadable';

  it('reports there is nothing to move when storage is empty', () => {
    expect(quarantineUnreadableLibrary()).toEqual({ status: 'nothing-stored' });
  });

  it('moves the raw record out of the way, verbatim', () => {
    const raw = '{"version":99,"books":[{"id":"mine"}]}';
    window.localStorage.setItem(STORAGE_KEY, raw);

    expect(quarantineUnreadableLibrary()).toEqual({ status: 'moved', key: UNREADABLE_KEY });
    expect(window.localStorage.getItem(UNREADABLE_KEY)).toBe(raw);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('leaves the record where it is when the copy cannot be written', () => {
    const raw = '{"version":99}';
    window.localStorage.setItem(STORAGE_KEY, raw);
    const failing = window.localStorage;
    const write = failing.setItem.bind(failing);
    failing.setItem = (key: string, value: string) => {
      if (key === UNREADABLE_KEY) throw new DOMException('quota', 'QuotaExceededError');
      write(key, value);
    };

    const outcome = quarantineUnreadableLibrary();

    expect(outcome.status).toBe('failed');
    // Losing the only copy is the failure this guards against.
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe(raw);
  });
});
