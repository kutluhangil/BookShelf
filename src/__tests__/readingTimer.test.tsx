// @vitest-environment jsdom
import React from 'react';
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, fireEvent, screen, act } from '@testing-library/react';
import { I18nProvider } from '../i18n/I18nProvider';
import { LOCALE_STORAGE_KEY } from '../i18n/locale';
import { en } from '../i18n/messages/en';
import { BookDetailModal } from '../components/BookDetailModal';
import type { Book, Shelf } from '../types';

/**
 * The reading timer counted interval ticks. A browser throttles a background
 * tab's timers to roughly one a minute, and reading is exactly what a reader
 * does with the tab in the background, so half an hour of reading was recorded
 * as a handful of seconds.
 */

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
  status: 'reading',
  progress: 50,
  confidence: 'matched',
  score: 1,
  category: 'Test',
  addedAt: '2024-01-01T00:00:00.000Z',
};

beforeEach(() => {
  localStorage.setItem(LOCALE_STORAGE_KEY, 'en');
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-01-01T10:00:00.000Z'));
});

afterEach(() => {
  vi.useRealTimers();
  cleanup();
  localStorage.clear();
});

function renderWithTimer(onAddReadingSession: (bookId: string, durationSeconds: number) => void) {
  return render(
    <I18nProvider>
      <BookDetailModal
        book={book}
        shelves={[shelf]}
        isOpen
        onClose={() => {}}
        onUpdateStatus={() => {}}
        onUpdateShelf={() => {}}
        onDeleteBook={() => {}}
        onAddReadingSession={onAddReadingSession}
      />
    </I18nProvider>
  );
}

describe('reading session timer', () => {
  it('records the time that actually passed, not the ticks it received', () => {
    const durations: number[] = [];
    renderWithTimer((_id, seconds) => durations.push(seconds));

    fireEvent.click(screen.getByRole('button', { name: en.bookDetail.startSession }));

    // The tab goes to the background: half an hour of wall clock, one tick.
    act(() => {
      vi.setSystemTime(new Date('2026-01-01T10:30:00.000Z'));
      vi.advanceTimersByTime(1000);
    });

    fireEvent.click(screen.getByRole('button', { name: en.bookDetail.stopSession }));

    expect(durations).toHaveLength(1);
    expect(durations[0]).toBeGreaterThanOrEqual(1800);
    expect(durations[0]).toBeLessThan(1810);
  });

  it('shows the elapsed time on the clock it kept', () => {
    renderWithTimer(() => {});

    fireEvent.click(screen.getByRole('button', { name: en.bookDetail.startSession }));
    act(() => {
      vi.setSystemTime(new Date('2026-01-01T10:02:05.000Z'));
      vi.advanceTimersByTime(1000);
    });

    expect(screen.getByText('02:06')).toBeTruthy();
  });

  it('starts a second session from zero', () => {
    const durations: number[] = [];
    renderWithTimer((_id, seconds) => durations.push(seconds));

    fireEvent.click(screen.getByRole('button', { name: en.bookDetail.startSession }));
    act(() => {
      vi.setSystemTime(new Date('2026-01-01T10:10:00.000Z'));
      vi.advanceTimersByTime(1000);
    });
    fireEvent.click(screen.getByRole('button', { name: en.bookDetail.stopSession }));

    fireEvent.click(screen.getByRole('button', { name: en.bookDetail.startSession }));
    act(() => {
      vi.setSystemTime(new Date('2026-01-01T10:15:00.000Z'));
      vi.advanceTimersByTime(1000);
    });
    fireEvent.click(screen.getByRole('button', { name: en.bookDetail.stopSession }));

    expect(durations[1]).toBeGreaterThanOrEqual(300);
    expect(durations[1]).toBeLessThan(310);
  });
});
