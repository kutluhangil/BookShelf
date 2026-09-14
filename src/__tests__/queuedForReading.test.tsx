// @vitest-environment jsdom
import React from 'react';
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';
import { I18nProvider } from '../i18n/I18nProvider';
import { LOCALE_STORAGE_KEY } from '../i18n/locale';
import { en } from '../i18n/messages/en';
import { QueuedForReading } from '../components/QueuedForReading';
import type { Book } from '../types';

/**
 * The queue is a shortlist of what to read next. Only the untagged branch
 * capped it, so a reader who tags books "priority" got the whole shelf.
 */

function unread(id: string, tags?: string[]): Book {
  return {
    id,
    title: `Book ${id}`,
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
    status: 'unread',
    tags,
    confidence: 'matched',
    score: 1,
    category: 'Test',
    addedAt: '2024-01-01T09:00:00',
  };
}

beforeEach(() => localStorage.setItem(LOCALE_STORAGE_KEY, 'en'));
afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe('the reading queue', () => {
  it('shows at most five books, however many carry a priority tag', () => {
    const books = Array.from({ length: 12 }, (_, i) => unread(`p${i}`, ['priority']));
    render(
      <I18nProvider>
        <QueuedForReading books={books} onSelectBook={() => {}} />
      </I18nProvider>
    );

    expect(screen.getByText(en.queued.volumeCount(5))).toBeTruthy();
  });

  it('shows at most five when it falls back to the newest unread books', () => {
    const books = Array.from({ length: 12 }, (_, i) => unread(`u${i}`));
    render(
      <I18nProvider>
        <QueuedForReading books={books} onSelectBook={() => {}} />
      </I18nProvider>
    );

    expect(screen.getByText(en.queued.volumeCount(5))).toBeTruthy();
  });

  it('shows nothing when everything has been read', () => {
    const { container } = render(
      <I18nProvider>
        <QueuedForReading books={[{ ...unread('a'), status: 'read' }]} onSelectBook={() => {}} />
      </I18nProvider>
    );

    expect(container.querySelector('section')).toBeNull();
  });
});
