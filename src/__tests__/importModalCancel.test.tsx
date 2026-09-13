// @vitest-environment jsdom
import React from 'react';
import { describe, expect, it, afterEach, beforeEach, vi } from 'vitest';
import { render, cleanup, act, fireEvent } from '@testing-library/react';
import { I18nProvider } from '../i18n/I18nProvider';
import { LOCALE_STORAGE_KEY } from '../i18n/locale';
import { ImportModal } from '../components/ImportModal';
import type { Book } from '../types';

const pendingLookups: Array<(value: { coverUrl: string }) => void> = [];

vi.mock('../services/bookLookup', () => ({
  lookupByIsbn: () =>
    new Promise<{ coverUrl: string }>((resolve) => {
      pendingLookups.push(resolve);
    }),
}));

const CSV = ['Title,Author,ISBN', 'Dune,Frank Herbert,9780441172719'].join('\n');

/** The parser only needs a name and text(), so skip jsdom's File plumbing. */
const csvFile = { name: 'library.csv', text: () => Promise.resolve(CSV) } as unknown as File;

beforeEach(() => {
  localStorage.setItem(LOCALE_STORAGE_KEY, 'en');
  pendingLookups.length = 0;
});

afterEach(() => {
  localStorage.clear();
  cleanup();
});

const renderImport = (onImport: (books: Book[]) => void) =>
  render(
    <I18nProvider>
      <ImportModal
        isOpen
        onClose={() => {}}
        existingBooks={[]}
        targetShelfId="shelf-1"
        onImport={onImport}
      />
    </I18nProvider>
  );

/** Drives the sheet to the enrichment stage with one ISBN in flight. */
const startEnrichment = async (onImport: (books: Book[]) => void) => {
  const view = renderImport(onImport);
  const input = view.container.querySelector('input[type="file"]') as HTMLInputElement;

  await act(async () => {
    fireEvent.change(input, { target: { files: [csvFile] } });
  });

  await act(async () => {
    fireEvent.click(view.getByText('Import 1 books'));
  });

  expect(pendingLookups).toHaveLength(1);
  return view;
};

describe('ImportModal cancellation', () => {
  it('imports the books when enrichment finishes', async () => {
    const onImport = vi.fn();
    await startEnrichment(onImport);

    await act(async () => {
      pendingLookups[0]({ coverUrl: 'https://covers.example/dune.jpg' });
    });

    expect(onImport).toHaveBeenCalledTimes(1);
    expect(onImport.mock.calls[0][0]).toHaveLength(1);
  });

  it('does not import books after the reader closes the sheet', async () => {
    const onImport = vi.fn();
    const view = await startEnrichment(onImport);

    fireEvent.click(view.getByLabelText('Close import'));

    await act(async () => {
      pendingLookups[0]({ coverUrl: 'https://covers.example/dune.jpg' });
    });

    expect(onImport).not.toHaveBeenCalled();
  });
});
