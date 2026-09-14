// @vitest-environment jsdom
import React from 'react';
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, screen, waitFor } from '@testing-library/react';
import { LOCALE_STORAGE_KEY } from '../i18n/locale';
import type { BookLookupResult } from '../services/bookLookup';

/**
 * The sheet is one component reused for every spine. Its results outlived the
 * query they answered, so reopening it for another spine showed the previous
 * spine's matches — clickable, and filed against the new candidate.
 */

const result = (title: string): BookLookupResult => ({
  title,
  author: 'Author',
  isbn: '',
  publisher: 'Publisher',
  publishYear: 2000,
  pageCount: 100,
  coverUrl: '',
});

beforeEach(() => localStorage.setItem(LOCALE_STORAGE_KEY, 'en'));
afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.doUnmock('../services/bookLookup');
  vi.resetModules();
  vi.useRealTimers();
});

describe('ManualSearchSheet', () => {
  it('does not show one spine’s results under another spine’s query', async () => {
    vi.resetModules();
    vi.doMock('../services/bookLookup', () => ({
      searchBooks: async (query: string) => [result(`Match for ${query}`)],
    }));

    const { ManualSearchSheet } = await import('../components/ManualSearchSheet');
    const { I18nProvider } = await import('../i18n/I18nProvider');

    const sheet = (open: boolean, query: string) => (
      <I18nProvider>
        <ManualSearchSheet isOpen={open} onClose={() => {}} onSelectResult={() => {}} initialQuery={query} />
      </I18nProvider>
    );

    const view = render(sheet(true, 'first spine'));
    await waitFor(() => expect(screen.getAllByText('Match for first spine').length).toBeGreaterThan(0));

    view.rerender(sheet(false, 'first spine'));
    view.rerender(sheet(true, 'second spine'));

    expect(screen.queryAllByText('Match for first spine')).toHaveLength(0);
    await waitFor(() => expect(screen.getAllByText('Match for second spine').length).toBeGreaterThan(0));
  });
});
