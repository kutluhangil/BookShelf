// @vitest-environment jsdom
import React from 'react';
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { LOCALE_STORAGE_KEY } from '../i18n/locale';
import { en } from '../i18n/messages/en';

/**
 * Scanning the barcode of a book already in the library used to report "Book
 * added" and open a dialog on a record that was never inserted, so the reader
 * was told about a book they could not see.
 */

class NoopObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

/** The ISBN of a book in the bundled starter library. */
const EXISTING_ISBN = '9780451524935';
const EXISTING_TITLE = '1984';

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
  vi.restoreAllMocks();
  vi.doUnmock('../components/ScanModal');
  vi.doUnmock('../services/bookLookup');
  vi.resetModules();
});

async function renderAppWithScannedIsbn(lookupIsbn: string) {
  vi.resetModules();
  vi.doMock('../components/ScanModal', () => ({
    ScanModal: ({ isOpen, onCapture }: { isOpen: boolean; onCapture: (p: unknown) => void }) =>
      isOpen ? (
        <button type="button" onClick={() => onCapture({ imageUrl: '', mode: 'isbn', barcode: lookupIsbn })}>
          capture-isbn
        </button>
      ) : null,
  }));
  vi.doMock('../services/bookLookup', () => ({
    lookupByIsbn: async () => ({
      title: EXISTING_TITLE,
      author: 'George Orwell',
      isbn: lookupIsbn,
      publisher: 'Signet Classics',
      publishYear: 1961,
      pageCount: 328,
      coverUrl: '',
      subjects: ['Fiction'],
    }),
    lookupFromQrPayload: async () => {
      throw new Error('not used');
    },
    searchBooks: async () => [],
  }));

  // Imported after the module registry was reset, so App and the provider below
  // share one instance of the i18n context.
  const { default: App } = await import('../App');
  const { I18nProvider } = await import('../i18n/I18nProvider');
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
    await renderAppWithScannedIsbn(EXISTING_ISBN);

    expect(await screen.findByText(en.toasts.alreadyInLibrary)).toBeTruthy();
    expect(screen.queryByText(en.toasts.bookAdded)).toBeNull();
  });

  it('opens the copy the library already holds', async () => {
    await renderAppWithScannedIsbn(EXISTING_ISBN);

    const dialog = await screen.findByRole('dialog');
    await waitFor(() => expect(dialog.textContent).toContain(EXISTING_TITLE));
  });
});
