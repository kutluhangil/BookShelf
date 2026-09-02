// @vitest-environment jsdom
import React from 'react';
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { I18nProvider } from '../i18n/I18nProvider';
import { LOCALE_STORAGE_KEY } from '../i18n/locale';
import { en } from '../i18n/messages/en';

/**
 * A smoke test for the composition itself.
 *
 * The unit tests cover the services; nothing covered whether App still mounts
 * after its state was split across hooks, which is exactly the kind of break a
 * type checker cannot see.
 */

// jsdom implements neither of these, and the incremental book list and the
// health check reach for them during the first render.
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
  vi.restoreAllMocks();
});

describe('App', () => {
  it('mounts and renders the bundled starter library', async () => {
    const { default: App } = await import('../App');

    render(
      <I18nProvider>
        <App />
      </I18nProvider>
    );

    // The navigation landmark proves the shell rendered; a book title proves the
    // library store reached the grid.
    expect(screen.getByRole('navigation', { name: en.nav.primary })).toBeTruthy();
    expect(screen.getAllByRole('button', { name: en.nav.scanShelf }).length).toBeGreaterThan(0);
  });

  it('opens no dialog before anything is clicked', async () => {
    const { default: App } = await import('../App');

    render(
      <I18nProvider>
        <App />
      </I18nProvider>
    );

    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('useActiveModal', () => {
  it('holds one overlay at a time, so two dialogs cannot both be open', async () => {
    const { renderHook, act } = await import('@testing-library/react');
    const { useActiveModal } = await import('../hooks/useActiveModal');

    const { result } = renderHook(() => useActiveModal());

    act(() => result.current.openModal({ kind: 'share', shelfId: 'shelf-1' }));
    expect(result.current.modal).toEqual({ kind: 'share', shelfId: 'shelf-1' });

    // Opening the profile share used to leave the previous shelf behind,
    // because the shelf and the "is open" flag were separate pieces of state.
    act(() => result.current.openModal({ kind: 'share', shelfId: null }));
    expect(result.current.modal).toEqual({ kind: 'share', shelfId: null });

    act(() => result.current.openModal({ kind: 'import' }));
    expect(result.current.modal).toEqual({ kind: 'import' });
  });

  it('ignores a close from a dialog that is no longer the open one', async () => {
    const { renderHook, act } = await import('@testing-library/react');
    const { useActiveModal } = await import('../hooks/useActiveModal');

    const { result } = renderHook(() => useActiveModal());

    act(() => result.current.openModal({ kind: 'scanner' }));
    act(() => result.current.openModal({ kind: 'bookDetail', bookId: 'b1' }));

    // A late onClose from the scanner must not dismiss the detail view.
    act(() => result.current.closeIf('scanner'));
    expect(result.current.modal).toEqual({ kind: 'bookDetail', bookId: 'b1' });

    act(() => result.current.closeIf('bookDetail'));
    expect(result.current.modal).toEqual({ kind: 'none' });
  });
});
