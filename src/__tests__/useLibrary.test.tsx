// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, act, cleanup } from '@testing-library/react';
import type { LibraryStore } from '../hooks/useLibrary';

/**
 * A stored record this build cannot read is replaced in memory by the bundled
 * starter library. What must not follow is that starter library being written
 * over the record itself by the next coalesced save.
 */

const STORAGE_KEY = 'bookshelf.library.v1';
const UNREADABLE_KEY = 'bookshelf.library.v1.unreadable';

/** A record written by a schema this build does not know. */
const FUTURE_RECORD = JSON.stringify({
  version: 99,
  books: [{ id: 'mine', title: 'A Book Of Mine' }],
  shelves: [],
  readingGoals: {},
  monthlyGoal: 4,
  deletedBookIds: [],
  deletedShelfIds: [],
  syncFingerprints: { books: {}, shelves: {}, meta: '' },
  updatedAt: '2026-01-01T00:00:00.000Z',
});

let store: LibraryStore;

const Harness: React.FC<{ hook: () => LibraryStore }> = ({ hook }) => {
  store = hook();
  return null;
};

/**
 * Mounts the hook against whatever is in storage right now. The initial read
 * happens at module load, so every case needs its own module registry.
 */
async function mount(): Promise<{ flushLibrary: () => void }> {
  vi.resetModules();
  const { useLibrary } = await import('../hooks/useLibrary');
  const { flushLibrary } = await import('../services/localStore');
  await act(async () => {
    render(<Harness hook={useLibrary} />);
  });
  return { flushLibrary };
}

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('a stored library that cannot be read', () => {
  it('is moved aside instead of being overwritten by the starter library', async () => {
    window.localStorage.setItem(STORAGE_KEY, FUTURE_RECORD);

    const { flushLibrary } = await mount();
    await act(async () => store.setMonthlyGoal(9));
    flushLibrary();

    expect(window.localStorage.getItem(UNREADABLE_KEY)).toBe(FUTURE_RECORD);

    // Saving carries on from the starter library, at the key it belongs in.
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? 'null');
    expect(saved.version).toBe(4);
    expect(saved.monthlyGoal).toBe(9);
    expect(saved.books.some((book: { id: string }) => book.id === 'mine')).toBe(false);
  });

  it('stops saving when the record cannot be copied aside either', async () => {
    window.localStorage.setItem(STORAGE_KEY, FUTURE_RECORD);
    // Only the copy fails; the availability probe and any other write still work.
    const write = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key: string, value: string) {
      if (key === UNREADABLE_KEY) throw new DOMException('quota', 'QuotaExceededError');
      write.call(this, key, value);
    });

    const { flushLibrary } = await mount();
    await act(async () => store.setMonthlyGoal(9));
    flushLibrary();

    // Neither key may hold the starter library: the reader's own record is the
    // only copy there is.
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe(FUTURE_RECORD);
    expect(window.localStorage.getItem(UNREADABLE_KEY)).toBeNull();
  });

  it('saves as usual when the stored record is readable', async () => {
    const { flushLibrary } = await mount();
    await act(async () => store.setMonthlyGoal(7));
    flushLibrary();

    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? 'null');
    expect(saved.monthlyGoal).toBe(7);
    expect(window.localStorage.getItem(UNREADABLE_KEY)).toBeNull();
  });
});
