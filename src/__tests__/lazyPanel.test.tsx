// @vitest-environment jsdom
import React from 'react';
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, screen, fireEvent } from '@testing-library/react';
import { I18nProvider } from '../i18n/I18nProvider';
import { LOCALE_STORAGE_KEY } from '../i18n/locale';
import { en } from '../i18n/messages/en';
import { LazyPanel } from '../components/LazyPanel';

/**
 * `React.lazy` remembers a rejected import: the chunk is never fetched again,
 * whatever the panel does with its own state. The button offering to try again
 * could therefore only ever show the same failure, so it offers the one thing
 * that does re-fetch the chunk.
 */

const Explodes: React.FC = () => {
  throw new Error('chunk 404');
};

beforeEach(() => {
  localStorage.setItem(LOCALE_STORAGE_KEY, 'en');
  // React logs the caught error; the test is about what the reader is offered.
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('a dashboard panel whose chunk will not load', () => {
  it('says which panel failed', () => {
    render(
      <I18nProvider>
        <LazyPanel label="Growth">
          <Explodes />
        </LazyPanel>
      </I18nProvider>
    );

    expect(screen.getByText(en.lazyPanel.failed('Growth'))).toBeTruthy();
  });

  it('offers a reload, which is what actually fetches the chunk again', () => {
    const reload = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, reload },
    });

    render(
      <I18nProvider>
        <LazyPanel label="Growth">
          <Explodes />
        </LazyPanel>
      </I18nProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: en.common.reload }));

    expect(reload).toHaveBeenCalledTimes(1);
  });
});
