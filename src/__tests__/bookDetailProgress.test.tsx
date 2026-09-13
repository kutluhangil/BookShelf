// @vitest-environment jsdom
import React from 'react';
import { describe, expect, it, afterEach, beforeEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { I18nProvider } from '../i18n/I18nProvider';
import { LOCALE_STORAGE_KEY } from '../i18n/locale';
import { en } from '../i18n/messages/en';
import { BookDetailModal } from '../components/BookDetailModal';
import type { Book, Shelf } from '../types';

// Pinned west of Greenwich: the due date only came back as the day before where
// UTC midnight and the reader's own day disagree.
process.env.TZ = 'America/New_York';

const shelf: Shelf = { id: 'shelf-1', name: 'Fiction', volumeCount: 1, dominantColors: [], sortOrder: 1 };

const book: Book = {
  id: 'b1',
  title: 'A Book',
  author: 'Author',
  isbn: '',
  publisher: '',
  publishYear: 2000,
  pageCount: 300,
  description: '',
  coverUrl: '',
  spineCropUrl: '',
  spineColor: '#000000',
  shelfId: 'shelf-1',
  status: 'read',
  progress: 100,
  currentPage: 300,
  readAt: '2025-01-01T00:00:00.000Z',
  confidence: 'matched',
  score: 1,
  category: 'Test',
  addedAt: '2024-01-01T00:00:00.000Z',
};

beforeEach(() => localStorage.setItem(LOCALE_STORAGE_KEY, 'en'));
afterEach(() => {
  localStorage.clear();
  cleanup();
});

describe('BookDetailModal page input', () => {
  it('ignores an emptied page box instead of resetting the book to page zero', () => {
    const pages: number[] = [];
    const view = render(
      <I18nProvider>
        <BookDetailModal
          book={book}
          shelves={[shelf]}
          isOpen
          onClose={() => {}}
          onUpdateStatus={() => {}}
          onUpdateCurrentPage={(_id, page) => {
            pages.push(page);
          }}
          onUpdateProgress={() => {}}
          onUpdateShelf={() => {}}
          onDeleteBook={() => {}}
        />
      </I18nProvider>
    );

    const input = view.getByLabelText(en.bookDetail.currentPage) as HTMLInputElement;
    // Clearing the box is the first half of typing a new number. Reading it as
    // page 0 marked a finished book unread and dropped its completion date.
    fireEvent.change(input, { target: { value: '' } });
    expect(pages).toEqual([]);

    fireEvent.change(input, { target: { value: '151' } });
    expect(pages).toEqual([151]);
  });
});

describe('BookDetailModal lending', () => {
  it('stores the due date the reader picked, not the day before it', () => {
    const lent: Array<string | undefined> = [];
    const lendable: Book = { ...book, id: 'b2' };
    const view = render(
      <I18nProvider>
        <BookDetailModal
          book={lendable}
          shelves={[shelf]}
          isOpen
          onClose={() => {}}
          onUpdateStatus={() => {}}
          onUpdateShelf={() => {}}
          onDeleteBook={() => {}}
          onUpdateLending={(_id, _to, _at, due) => {
            lent.push(due);
          }}
        />
      </I18nProvider>
    );

    fireEvent.change(view.getByPlaceholderText(en.bookDetail.friendPlaceholder), {
      target: { value: 'A friend' },
    });
    fireEvent.change(view.getByLabelText(en.bookDetail.dueDateAria), { target: { value: '2025-12-25' } });
    fireEvent.click(view.getByText(en.bookDetail.lend));

    expect(lent).toHaveLength(1);
    const stored = new Date(lent[0]!);
    expect(stored.getDate()).toBe(25);
    expect(stored.getMonth()).toBe(11);
  });
});

const coordinateShelf: Shelf = {
  ...shelf,
  layout: 'coordinate',
  gridDimensions: { cols: 6, rows: 3 },
  coordinates: { b1: { x: 2, y: 2 } },
};

function renderCoordinateEditor(onUpdateCoordinate: (
  bookId: string,
  shelfId: string,
  x: number | undefined,
  y: number | undefined
) => void) {
  return render(
    <I18nProvider>
      <BookDetailModal
        book={book}
        shelves={[coordinateShelf]}
        isOpen
        onClose={() => {}}
        onUpdateStatus={() => {}}
        onUpdateCurrentPage={() => {}}
        onUpdateProgress={() => {}}
        onUpdateShelf={() => {}}
        onUpdateCoordinate={onUpdateCoordinate}
        onDeleteBook={() => {}}
      />
    </I18nProvider>
  );
}

describe('BookDetailModal bin coordinates', () => {
  it('clamps a column past the last one instead of filing the book off the map', () => {
    const written: Array<[number | undefined, number | undefined]> = [];
    const view = renderCoordinateEditor((_id, _shelfId, x, y) => written.push([x, y]));

    // The grid only draws columns 1..6, so a 9 put the book nowhere at all.
    fireEvent.change(view.getByLabelText(en.bookDetail.colLabel), { target: { value: '9' } });

    expect(written).toEqual([[6, 2]]);
  });

  it('clamps a row past the last one', () => {
    const written: Array<[number | undefined, number | undefined]> = [];
    const view = renderCoordinateEditor((_id, _shelfId, x, y) => written.push([x, y]));

    fireEvent.change(view.getByLabelText(en.bookDetail.rowLabel), { target: { value: '12' } });

    expect(written).toEqual([[2, 3]]);
  });

  it('clears the coordinate when the box is emptied', () => {
    const written: Array<[number | undefined, number | undefined]> = [];
    const view = renderCoordinateEditor((_id, _shelfId, x, y) => written.push([x, y]));

    fireEvent.change(view.getByLabelText(en.bookDetail.colLabel), { target: { value: '' } });

    expect(written).toEqual([[undefined, undefined]]);
  });
});
