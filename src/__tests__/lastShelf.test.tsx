// @vitest-environment jsdom
import React from 'react';
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { LOCALE_STORAGE_KEY } from '../i18n/locale';
import { en } from '../i18n/messages/en';

/**
 * A library with no shelves has nowhere to file a book: every add path reaches
 * for the first shelf and, finding none, invented a shelf id that no shelf
 * record ever had.
 */

class NoopObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

const ONLY_SHELF = { id: 'shelf-only', name: 'Only', volumeCount: 0, dominantColors: [], sortOrder: 1 };

beforeEach(() => {
  localStorage.setItem(LOCALE_STORAGE_KEY, 'en');
  localStorage.setItem(
    'bookshelf.library.v1',
    JSON.stringify({
      version: 4,
      books: [],
      shelves: [ONLY_SHELF],
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

async function renderShelvesTab() {
  vi.resetModules();
  const { default: App } = await import('../App');
  const { I18nProvider } = await import('../i18n/I18nProvider');
  render(
    <I18nProvider>
      <App />
    </I18nProvider>
  );
  fireEvent.click(screen.getAllByRole('button', { name: en.nav.shelves })[0]);
}

describe('deleting the last shelf', () => {
  it('refuses even when the shelf is empty', async () => {
    await renderShelvesTab();

    fireEvent.click(await screen.findByRole('button', { name: en.shelves.deleteEmpty }));
    fireEvent.click(screen.getByRole('button', { name: en.common.delete }));

    expect(screen.getByText(en.toasts.cannotDeleteLastShelf)).toBeTruthy();
    expect(screen.getByText(ONLY_SHELF.name)).toBeTruthy();
  });
});
