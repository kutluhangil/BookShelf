// @vitest-environment jsdom
import React from 'react';
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { I18nProvider } from '../i18n/I18nProvider';
import { LOCALE_STORAGE_KEY } from '../i18n/locale';
import { en } from '../i18n/messages/en';
import App from '../App';

/**
 * Scanning the barcode of a book already in the library used to report "Book
 * added" and open a dialog on a record that was never inserted, so the reader
 * was told about a book they could not see.
 */

/** The ISBN of a book in the bundled starter library. */
const EXISTING_ISBN = '9780451524935';
const EXISTING_TITLE = '1984';

// Hoisted, so App sees these rather than the real camera and the real network.
vi.mock('../components/ScanModal', () => ({
  ScanModal: ({ isOpen, onCapture }: { isOpen: boolean; onCapture: (payload: unknown) => void }) =>
    isOpen ? (
      <button type="button" onClick={() => onCapture({ imageUrl: '', mode: 'isbn', barcode: EXISTING_ISBN })}>
        capture-isbn
      </button>
    ) : null,
}));

vi.mock('../services/bookLookup', () => ({
  lookupByIsbn: async (isbn: string) => ({
    title: EXISTING_TITLE,
    author: 'George Orwell',
    isbn,
    publisher: 'Signet Classics',
    publishYear: 1961,
    pageCount: 328,
    coverUrl: '',
    subjects: ['Fiction'],
  }),
  lookupFromQrPayload: async () => {
    throw new Error('not used in this test');
  },
  searchBooks: async () => [],
}));

class NoopObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

beforeEach(() => {
  localStorage.setItem(LOCALE_STORAGE_KEY, 'en');
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
});

async function scanTheBarcodeOfABookAlreadyOwned() {
  render(
    <I18nProvider>
      <App />
    </I18nProvider>
  );

  fireEvent.click(screen.getAllByRole('button', { name: en.nav.scanShelf })[0]);
  fireEvent.click(await screen.findByText('capture-isbn'));
}

describe('scanning a barcode that is already in the library', () => {
  it('says the book is already there instead of claiming it was added', async () => {
    await scanTheBarcodeOfABookAlreadyOwned();

    expect(await screen.findByText(en.toasts.alreadyInLibrary)).toBeTruthy();
    expect(screen.queryByText(en.toasts.bookAdded)).toBeNull();
  });

  it('opens the copy the library already holds', async () => {
    await scanTheBarcodeOfABookAlreadyOwned();

    const dialog = await screen.findByRole('dialog');
    await waitFor(() => expect(dialog.textContent).toContain(EXISTING_TITLE));
  });
});
