// @vitest-environment jsdom
import React from 'react';
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';
import { I18nProvider } from '../i18n/I18nProvider';
import { LOCALE_STORAGE_KEY } from '../i18n/locale';
import { en } from '../i18n/messages/en';
import { ReadingCalendarWidget } from '../components/ReadingCalendarWidget';
import { GamificationBadges } from '../components/GamificationBadges';
import type { Book } from '../types';

/**
 * The app had three definitions of a reading streak. A reader who finishes
 * books but never runs the session timer was congratulated on a seven-day
 * streak by the toasts while this widget showed them zero.
 */

function finishedOn(dates: string[]): Book {
  return {
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
    readAt: dates[dates.length - 1],
    readHistory: dates,
    confidence: 'matched',
    score: 1,
    category: 'Test',
    addedAt: '2024-01-01T09:00:00',
  };
}

/** Local-time ISO-ish stamps for the last `count` days, oldest first. */
function recentDays(count: number): string[] {
  const days: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const date = new Date();
    date.setHours(9, 0, 0, 0);
    date.setDate(date.getDate() - i);
    days.push(date.toString());
  }
  return days;
}

beforeEach(() => {
  localStorage.setItem(LOCALE_STORAGE_KEY, 'en');
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
});

/** The number the widget prints under one of its stat labels. */
function statAfter(label: string): string {
  const value = screen.getByText(label).nextElementSibling;
  if (!value) throw new Error(`no value printed under "${label}"`);
  return (value.textContent ?? '').trim().split(/\s+/)[0];
}

describe('reading calendar', () => {
  it('counts a day the reader finished a book, with no timed session', () => {
    render(
      <I18nProvider>
        <ReadingCalendarWidget books={[finishedOn(recentDays(3))]} />
      </I18nProvider>
    );

    expect(statAfter(en.calendar.currentStreak)).toBe('3');
    expect(statAfter(en.calendar.maxStreak)).toBe('3');
    expect(statAfter(en.calendar.totalDays)).toBe('3');
  });

  it('reports no streak for a library nobody has read', () => {
    render(
      <I18nProvider>
        <ReadingCalendarWidget books={[{ ...finishedOn([]), status: 'unread', readAt: undefined, readHistory: undefined }]} />
      </I18nProvider>
    );

    expect(statAfter(en.calendar.currentStreak)).toBe('0');
    expect(statAfter(en.calendar.maxStreak)).toBe('0');
  });
});

describe('gamification badges', () => {
  it('unlocks the streak badge on the same seven days the toasts celebrate', () => {
    render(
      <I18nProvider>
        <GamificationBadges books={[finishedOn(recentDays(7))]} />
      </I18nProvider>
    );

    // A locked badge is the dimmed card; an earned one is not.
    const card = screen.getByText(en.badges.streak.title).closest('div')!;
    expect(card.className).not.toContain('opacity-60');
  });
});
