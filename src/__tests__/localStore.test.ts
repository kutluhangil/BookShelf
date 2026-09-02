import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  loadLibrary,
  saveLibrary,
  scheduleSaveLibrary,
  flushLibrary,
  clearLibrary,
  isPersistenceAvailable,
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
    expect(restored?.version).toBe(2);
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
      expect((error as AppError).params).toMatchObject({ found: 99, expected: 2 });
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
    expect(restored?.version).toBe(2);
    expect(restored?.books).toHaveLength(1);
    expect(restored?.syncFingerprints).toEqual(EMPTY_FINGERPRINTS);
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
