// @vitest-environment jsdom
import React from 'react';
import { describe, expect, it, afterEach, beforeEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { I18nProvider } from '../i18n/I18nProvider';
import { LOCALE_STORAGE_KEY } from '../i18n/locale';
import { BottomNavBar } from '../components/BottomNavBar';
import { ToastContainer } from '../components/Toast';
import { en } from '../i18n/messages/en';

// The assertions compare against the English catalog, so the locale is pinned
// rather than left to whatever language the test runner's jsdom reports.
beforeEach(() => localStorage.setItem(LOCALE_STORAGE_KEY, 'en'));
afterEach(() => {
  localStorage.clear();
  cleanup();
});

const withI18n = (ui: React.ReactElement) => render(<I18nProvider>{ui}</I18nProvider>);

describe('BottomNavBar', () => {
  it('names every tab and marks only the active one', () => {
    withI18n(<BottomNavBar activeTab="shelves" onTabChange={() => {}} onOpenScanner={() => {}} />);

    // The icon fonts render their ligature name as text. If the spans were not
    // hidden, the accessible name would come out as "shelves shelves".
    const shelves = screen.getByRole('button', { name: en.nav.shelves });
    expect(shelves.getAttribute('aria-current')).toBe('page');

    const library = screen.getByRole('button', { name: en.nav.library });
    expect(library.getAttribute('aria-current')).toBeNull();
  });

  it('gives the scan button an accessible name of its own', () => {
    withI18n(<BottomNavBar activeTab="library" onTabChange={() => {}} onOpenScanner={() => {}} />);
    expect(screen.getByRole('button', { name: en.nav.scanShelf })).toBeTruthy();
  });

  it('labels the navigation landmark', () => {
    withI18n(<BottomNavBar activeTab="library" onTabChange={() => {}} onOpenScanner={() => {}} />);
    expect(screen.getByRole('navigation', { name: en.nav.primary })).toBeTruthy();
  });
});

describe('ToastContainer', () => {
  it('announces its contents through a live region', () => {
    withI18n(
      <ToastContainer
        toasts={[{ id: 'a', title: 'Synced', description: '12 books', icon: 'cloud_done' }]}
        removeToast={() => {}}
      />
    );

    const region = screen.getByRole('status');
    expect(region.getAttribute('aria-live')).toBe('polite');
    expect(region.textContent).toContain('Synced');
  });

  it('gives the dismiss button a name instead of an icon ligature', () => {
    const removeToast = vi.fn();
    withI18n(<ToastContainer toasts={[{ id: 'a', title: 'Synced' }]} removeToast={removeToast} />);
    expect(screen.getByRole('button', { name: en.common.close })).toBeTruthy();
  });
});
