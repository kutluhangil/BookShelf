// @vitest-environment jsdom
import React from 'react';
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react';
import { LOCALE_STORAGE_KEY } from '../i18n/locale';
import { en } from '../i18n/messages/en';
import type { Book, Shelf } from '../types';

/**
 * A coordinate bin used to outlive the book it pointed at: the record stayed in
 * the shelf for good, and went up to the cloud on every write after that.
 */

class NoopObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

const STORAGE_KEY = 'bookshelf.library.v1';

const otherShelf: Shelf = {
  id: 'shelf-2',
  name: 'Essays',
  volumeCount: 0,
  dominantColors: [],
  sortOrder: 2,
};

const shelf: Shelf = {
  id: 'shelf-1',
  name: 'Fiction',
  volumeCount: 1,
  dominantColors: [],
  sortOrder: 1,
  layout: 'coordinate',
  gridDimensions: { cols: 6, rows: 3 },
  coordinates: { 'book-1': { x: 2, y: 1 }, 'book-2': { x: 3, y: 1 } },
};

const books: Book[] = [
  {
    id: 'book-1',
    title: 'Filed Volume',
    author: 'Author',
    isbn: '',
    publisher: '',
    publishYear: 2000,
    pageCount: 100,
    description: '',
    coverUrl: '',
    spineCropUrl: '',
    spineColor: '#000000',
    shelfId: 'shelf-1',
    status: 'unread',
    confidence: 'matched',
    score: 1,
    category: 'Test',
    addedAt: '2024-01-01T00:00:00.000Z',
  },
];

beforeEach(() => {
  localStorage.setItem(LOCALE_STORAGE_KEY, 'en');
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      version: 4,
      books,
      shelves: [shelf, otherShelf],
      readingGoals: { annualPageCount: 10000, annualBookCount: 50, genreMilestones: [] },
      monthlyGoal: 5,
      deletedBookIds: [],
      deletedShelfIds: [],
      syncFingerprints: { books: {}, shelves: {} },
      ownerUid: null,
      updatedAt: new Date().toISOString(),
    })
  );
  vi.stubGlobal('IntersectionObserver', NoopObserver);
  vi.stubGlobal('ResizeObserver', NoopObserver);
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify({ status: 'ok', model: 'test', authRequired: false })))
  );
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }));
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.resetModules();
});

function storedCoordinates(): Record<string, unknown> {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) throw new Error('the library was never written');
  return (JSON.parse(raw) as { shelves: Shelf[] }).shelves[0].coordinates ?? {};
}

async function openTheFiledBook() {
  vi.resetModules();
  const { default: App } = await import('../App');
  const { I18nProvider } = await import('../i18n/I18nProvider');
  render(
    <I18nProvider>
      <App />
    </I18nProvider>
  );

  const [card] = await screen.findAllByText('Filed Volume');
  fireEvent.click(card);
  return screen.findByRole('dialog');
}

describe('deleting a book that sits in a coordinate bin', () => {
  it('releases the bin it occupied', async () => {
    await openTheFiledBook();

    fireEvent.click(await screen.findByRole('button', { name: en.bookDetail.removeVolume }));
    fireEvent.click(screen.getByRole('button', { name: en.bookDetail.confirmDelete }));

    // The write is coalesced behind a timer; a closing tab is what flushes it.
    window.dispatchEvent(new Event('pagehide'));

    expect(storedCoordinates()).toEqual({ 'book-2': { x: 3, y: 1 } });
  });
});

describe('moving a book off the shelf it was filed on', () => {
  it('releases the bin on the shelf it left', async () => {
    const dialog = await openTheFiledBook();

    fireEvent.change(within(dialog).getByLabelText(en.bookDetail.assignedShelf), { target: { value: otherShelf.id } });
    window.dispatchEvent(new Event('pagehide'));

    expect(storedCoordinates()).toEqual({ 'book-2': { x: 3, y: 1 } });
  });
});
