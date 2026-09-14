// @vitest-environment jsdom
import React from 'react';
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, screen, waitFor, fireEvent } from '@testing-library/react';
import { LOCALE_STORAGE_KEY } from '../i18n/locale';
import { en } from '../i18n/messages/en';
import type { Book } from '../types';

/**
 * The modal asked for recommendations whenever it was open and held none. A
 * reply carrying an empty list satisfies both conditions, so the request went
 * out again the moment it came back — a loop against a paid endpoint that ran
 * for as long as the dialog stayed open.
 */

const book: Book = {
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
  confidence: 'matched',
  score: 1,
  category: 'Test',
  addedAt: '2024-01-01T00:00:00.000Z',
};

beforeEach(() => localStorage.setItem(LOCALE_STORAGE_KEY, 'en'));
afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.doUnmock('../services/apiClient');
  vi.resetModules();
});

async function renderModal(reply: () => Promise<unknown>) {
  const calls: unknown[] = [];
  vi.resetModules();
  vi.doMock('../services/apiClient', () => ({
    postJson: async (path: string) => {
      calls.push(path);
      return reply();
    },
  }));

  const { AIRecommendationsModal } = await import('../components/AIRecommendationsModal');
  const { I18nProvider } = await import('../i18n/I18nProvider');
  render(
    <I18nProvider>
      <AIRecommendationsModal isOpen onClose={() => {}} books={[book]} onAddBook={() => {}} />
    </I18nProvider>
  );
  return calls;
}

describe('AI recommendations', () => {
  it('asks once when the reply carries no recommendations', async () => {
    const calls = await renderModal(async () => ({ recommendations: [] }));

    await waitFor(() => expect(calls).toHaveLength(1));
    // Long enough for a loop to show itself.
    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(calls).toHaveLength(1);
  });

  it('still asks again when the reader presses refresh', async () => {
    const calls = await renderModal(async () => ({ recommendations: [] }));

    await waitFor(() => expect(calls).toHaveLength(1));
    fireEvent.click(screen.getByRole('button', { name: new RegExp(en.aiRecommendations.refresh, 'i') }));

    await waitFor(() => expect(calls).toHaveLength(2));
  });

  it('asks once for a reply that carries recommendations', async () => {
    const calls = await renderModal(async () => ({
      recommendations: [{ title: 'Recommended', author: 'Someone' }],
    }));

    await waitFor(() => expect(screen.getByText('Recommended')).toBeTruthy());
    expect(calls).toHaveLength(1);
  });
});
