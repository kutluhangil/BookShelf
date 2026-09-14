// @vitest-environment jsdom
import React from 'react';
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { render, cleanup, fireEvent, screen } from '@testing-library/react';
import { I18nProvider } from '../i18n/I18nProvider';
import { LOCALE_STORAGE_KEY } from '../i18n/locale';
import { en } from '../i18n/messages/en';
import { NavigationHeader } from '../components/NavigationHeader';

/**
 * The profile menu was dismissed by a `mousedown` outside it and nothing else,
 * so a reader on the keyboard had no way to close it again.
 */

beforeEach(() => localStorage.setItem(LOCALE_STORAGE_KEY, 'en'));
afterEach(() => {
  cleanup();
  localStorage.clear();
});

function openMenu() {
  render(
    <I18nProvider>
      <NavigationHeader currentView="library" books={[]} />
    </I18nProvider>
  );
  const trigger = screen.getByRole('button', { name: en.header.profileTooltip });
  fireEvent.click(trigger);
  return trigger;
}

describe('profile menu', () => {
  it('opens on the profile button', () => {
    const trigger = openMenu();
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByText(en.header.shareAndExport)).toBeTruthy();
  });

  it('closes on Escape', () => {
    const trigger = openMenu();

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByText(en.header.shareAndExport)).toBeNull();
  });

  it('stays open on any other key', () => {
    const trigger = openMenu();

    fireEvent.keyDown(document, { key: 'a' });

    expect(trigger.getAttribute('aria-expanded')).toBe('true');
  });
});
