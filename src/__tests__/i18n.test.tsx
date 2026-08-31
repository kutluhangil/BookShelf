// @vitest-environment jsdom
import React from 'react';
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { en } from '../i18n/messages/en';
import { tr } from '../i18n/messages/tr';
import { LOCALE_STORAGE_KEY, detectInitialLocale } from '../i18n/locale';
import { I18nProvider, useI18n } from '../i18n/I18nProvider';
import { LanguageSwitch } from '../components/LanguageSwitch';

type Catalog = Record<string, unknown>;

/** Walks both catalogs in lockstep, reporting the path of the first mismatch. */
function collectMismatches(a: Catalog, b: Catalog, path = ''): string[] {
  const problems: string[] = [];
  for (const key of Object.keys(a)) {
    const here = path ? `${path}.${key}` : key;
    const left = a[key];
    const right = b[key];

    if (right === undefined) {
      problems.push(`${here}: missing`);
      continue;
    }
    if (typeof left !== typeof right) {
      problems.push(`${here}: type ${typeof left} vs ${typeof right}`);
      continue;
    }
    if (typeof left === 'string') {
      if (right === '') problems.push(`${here}: empty string`);
      continue;
    }
    if (Array.isArray(left)) {
      if (!Array.isArray(right) || left.length !== right.length) {
        problems.push(`${here}: array length ${left.length} vs ${(right as unknown[])?.length}`);
      }
      continue;
    }
    if (typeof left === 'object' && left !== null) {
      problems.push(...collectMismatches(left as Catalog, right as Catalog, here));
    }
  }
  return problems;
}

afterEach(cleanup);

describe('message catalogs', () => {
  it('define every English key in Turkish, with nothing blank', () => {
    expect(collectMismatches(en as unknown as Catalog, tr as unknown as Catalog)).toEqual([]);
  });

  it('define no Turkish key that English does not have', () => {
    expect(collectMismatches(tr as unknown as Catalog, en as unknown as Catalog)).toEqual([]);
  });

  it('keeps interpolated values in the Turkish copy', () => {
    expect(tr.library.summary(3, 2)).toContain('3');
    expect(tr.library.summary(3, 2)).toContain('2');
    expect(tr.toasts.booksAddedDetail(5)).toContain('5');
  });
});

describe('detectInitialLocale', () => {
  const originalLanguages = navigator.languages;

  const setLanguages = (languages: string[]) => {
    Object.defineProperty(navigator, 'languages', { value: languages, configurable: true });
  };

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'languages', { value: originalLanguages, configurable: true });
  });

  it('prefers an explicitly stored choice over the browser language', () => {
    localStorage.setItem(LOCALE_STORAGE_KEY, 'en');
    setLanguages(['tr-TR']);
    expect(detectInitialLocale()).toBe('en');
  });

  it('falls back to Turkish for a Turkish browser', () => {
    setLanguages(['tr-TR', 'en-US']);
    expect(detectInitialLocale()).toBe('tr');
  });

  it('falls back to English for any other browser language', () => {
    setLanguages(['de-DE']);
    expect(detectInitialLocale()).toBe('en');
  });

  it('survives storage that throws', () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage blocked');
    });
    setLanguages(['tr']);
    expect(detectInitialLocale()).toBe('tr');
    getItem.mockRestore();
  });
});

function Probe() {
  const { t } = useI18n();
  return <p>{t.library.title}</p>;
}

describe('LanguageSwitch', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(LOCALE_STORAGE_KEY, 'en');
  });

  it('swaps the rendered copy and persists the choice', async () => {
    const user = userEvent.setup();
    render(
      <I18nProvider>
        <LanguageSwitch />
        <Probe />
      </I18nProvider>
    );

    expect(screen.getByText(en.library.title)).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'TR' }));

    expect(screen.getByText(tr.library.title)).toBeTruthy();
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('tr');
    expect(document.documentElement.lang).toBe('tr');
  });
});
