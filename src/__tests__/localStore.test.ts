import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadLibrary, saveLibrary, clearLibrary, isPersistenceAvailable } from '../services/localStore';
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
};

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
    expect(restored?.version).toBe(1);
    expect(restored?.updatedAt).toBeTruthy();
  });

  it('clears stored data', () => {
    saveLibrary(payload);
    clearLibrary();
    expect(loadLibrary()).toBeNull();
  });

  it('raises a coded error on a schema mismatch instead of silently resetting', () => {
    window.localStorage.setItem('bookshelf.library.v1', JSON.stringify({ version: 99 }));
    try {
      loadLibrary();
      expect.unreachable('loadLibrary should reject a foreign schema version');
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).code).toBe('storage.schemaMismatch');
      expect((error as AppError).params).toMatchObject({ found: 99, expected: 1 });
    }
  });
});
