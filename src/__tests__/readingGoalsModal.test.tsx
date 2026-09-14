// @vitest-environment jsdom
import React from 'react';
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { render, cleanup, screen, fireEvent } from '@testing-library/react';
import { I18nProvider } from '../i18n/I18nProvider';
import { LOCALE_STORAGE_KEY } from '../i18n/locale';
import { en } from '../i18n/messages/en';
import { ReadingGoalsModal } from '../components/ReadingGoalsModal';
import type { ReadingGoals } from '../types';

/**
 * The dialog stays mounted between openings, and its boxes were filled from the
 * saved goals once, at mount. An edit the reader abandoned survived the close
 * and was there to be saved the next time the dialog opened.
 */

const goals: ReadingGoals = { annualPageCount: 10000, annualBookCount: 50, genreMilestones: [] };

beforeEach(() => localStorage.setItem(LOCALE_STORAGE_KEY, 'en'));
afterEach(() => {
  cleanup();
  localStorage.clear();
});

function view(isOpen: boolean, onSave: (next: ReadingGoals) => void = () => {}) {
  return (
    <I18nProvider>
      <ReadingGoalsModal isOpen={isOpen} onClose={() => {}} goals={goals} onSave={onSave} />
    </I18nProvider>
  );
}

describe('ReadingGoalsModal', () => {
  it('shows the saved goals again after an abandoned edit', () => {
    const rendered = render(view(true));

    const books = screen.getByPlaceholderText(en.goalsModal.booksPlaceholder) as HTMLInputElement;
    fireEvent.change(books, { target: { value: '7' } });

    rendered.rerender(view(false));
    rendered.rerender(view(true));

    expect((screen.getByPlaceholderText(en.goalsModal.booksPlaceholder) as HTMLInputElement).value).toBe('50');
  });

  it('saves what the boxes hold when the reader means it', () => {
    const saved: ReadingGoals[] = [];
    render(view(true, (next) => saved.push(next)));

    fireEvent.change(screen.getByPlaceholderText(en.goalsModal.booksPlaceholder), { target: { value: '7' } });
    fireEvent.click(screen.getByRole('button', { name: en.goalsModal.saveGoals }));

    expect(saved).toEqual([{ annualPageCount: 10000, annualBookCount: 7, genreMilestones: [] }]);
  });
});
