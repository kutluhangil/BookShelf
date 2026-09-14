// @vitest-environment jsdom
import React from 'react';
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';
import { I18nProvider } from '../i18n/I18nProvider';
import { LOCALE_STORAGE_KEY } from '../i18n/locale';
import { MonthlyGoalDashboard } from '../components/MonthlyGoalDashboard';
import { LibraryAnnualProgressBar } from '../components/LibraryAnnualProgressBar';
import type { Book } from '../types';

/**
 * `readAt` keeps only a book's latest finish, so reading a book again was
 * invisible to both counters — and the earlier finish was moved out of the
 * month it happened in.
 */

const now = new Date();
const thisMonth = (day: number) => new Date(now.getFullYear(), now.getMonth(), day, 9, 0, 0).toString();

const reread: Book = {
  id: 'b1',
  title: 'Read Twice',
  author: 'Author',
  isbn: '',
  publisher: '',
  publishYear: 2000,
  pageCount: 200,
  description: '',
  coverUrl: '',
  spineCropUrl: '',
  spineColor: '#000000',
  shelfId: 'shelf-1',
  status: 'read',
  readAt: thisMonth(20),
  readHistory: [thisMonth(2), thisMonth(20)],
  confidence: 'matched',
  score: 1,
  category: 'Test',
  addedAt: '2024-01-01T09:00:00',
};

beforeEach(() => localStorage.setItem(LOCALE_STORAGE_KEY, 'en'));
afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe('goal counters', () => {
  it('counts both finishes of a book read twice this month', () => {
    render(
      <I18nProvider>
        <MonthlyGoalDashboard books={[reread]} monthlyGoal={5} onUpdateGoal={() => {}} />
      </I18nProvider>
    );

    expect(screen.getByText('2')).toBeTruthy();
    expect(screen.getByText('/ 5')).toBeTruthy();
  });

  it('counts both finishes, and both books’ worth of pages, against the year', () => {
    render(
      <I18nProvider>
        <LibraryAnnualProgressBar
          books={[reread]}
          goals={{ annualBookCount: 50, annualPageCount: 10000, genreMilestones: [] }}
        />
      </I18nProvider>
    );

    // Two finishes of a 200-page book against the year's book and page goals.
    expect(screen.getByText('2')).toBeTruthy();
    expect(screen.getByText('400')).toBeTruthy();
  });
});
