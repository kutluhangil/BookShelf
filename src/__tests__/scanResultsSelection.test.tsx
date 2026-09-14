// @vitest-environment jsdom
import React from 'react';
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { render, cleanup, fireEvent, screen } from '@testing-library/react';
import { I18nProvider } from '../i18n/I18nProvider';
import { LOCALE_STORAGE_KEY } from '../i18n/locale';
import { en } from '../i18n/messages/en';
import { ScanResultsView } from '../components/ScanResultsView';
import type { EditionOption, SpineCandidate } from '../types';

/**
 * The selection was seeded once, from the candidates as they stood when the
 * results screen first rendered. Resolving a spine after that promoted it to
 * matched but left it unselected, so the reader's own resolution was dropped
 * by the save they pressed right afterwards.
 */

const edition = (title: string): EditionOption => ({
  id: `ed-${title}`,
  title,
  author: 'Author',
  isbn: '',
  publisher: '',
  year: 2000,
  coverUrl: '',
  score: 0.9,
});

function candidate(id: string, overrides: Partial<SpineCandidate> = {}): SpineCandidate {
  return {
    id,
    orderIndex: 1,
    bbox: { x: 0, y: 0, width: 10, height: 10 },
    rawTextForward: id,
    rawTextReverse: id,
    dominantColor: '#C9963F',
    confidence: 'matched',
    score: 0.9,
    cropUrl: null,
    editions: [edition(id)],
    ...overrides,
  };
}

beforeEach(() => localStorage.setItem(LOCALE_STORAGE_KEY, 'en'));
afterEach(() => {
  cleanup();
  localStorage.clear();
});

function renderResults(candidates: SpineCandidate[], onSave: (saved: SpineCandidate[]) => void) {
  return render(
    <I18nProvider>
      <ScanResultsView
        sourceImageUrl=""
        candidates={candidates}
        onReviewCandidate={() => {}}
        onOpenManualSearch={() => {}}
        onSaveMatchedBooks={onSave}
        onDiscard={() => {}}
      />
    </I18nProvider>
  );
}

describe('ScanResultsView selection', () => {
  it('saves a spine that was resolved after the screen opened', () => {
    const saved: string[][] = [];
    const unresolved = candidate('needs-review', { confidence: 'review' });
    const view = renderResults([candidate('sure-thing'), unresolved], (list) =>
      saved.push(list.map((c) => c.id))
    );

    // What App does when the reader picks an edition in the review sheet.
    view.rerender(
      <I18nProvider>
        <ScanResultsView
          sourceImageUrl=""
          candidates={[candidate('sure-thing'), { ...unresolved, confidence: 'matched' }]}
          onReviewCandidate={() => {}}
          onOpenManualSearch={() => {}}
          onSaveMatchedBooks={(list) => saved.push(list.map((c) => c.id))}
          onDiscard={() => {}}
        />
      </I18nProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: en.scanResults.addMatched(2) }));

    expect(saved).toEqual([['sure-thing', 'needs-review']]);
  });

  it('keeps a spine the reader unticked unticked', () => {
    const saved: string[][] = [];
    const view = renderResults([candidate('keep'), candidate('drop')], (list) =>
      saved.push(list.map((c) => c.id))
    );

    fireEvent.click(screen.getAllByRole('checkbox', { checked: true })[1]);
    view.rerender(
      <I18nProvider>
        <ScanResultsView
          sourceImageUrl=""
          candidates={[candidate('keep'), candidate('drop')]}
          onReviewCandidate={() => {}}
          onOpenManualSearch={() => {}}
          onSaveMatchedBooks={(list) => saved.push(list.map((c) => c.id))}
          onDiscard={() => {}}
        />
      </I18nProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: en.scanResults.addMatched(1) }));

    expect(saved).toEqual([['keep']]);
  });

  it('drops a spine that was marked as not a book', () => {
    const saved: string[][] = [];
    const view = renderResults([candidate('keep'), candidate('not-a-book')], (list) =>
      saved.push(list.map((c) => c.id))
    );

    view.rerender(
      <I18nProvider>
        <ScanResultsView
          sourceImageUrl=""
          candidates={[candidate('keep'), { ...candidate('not-a-book'), isDismissed: true }]}
          onReviewCandidate={() => {}}
          onOpenManualSearch={() => {}}
          onSaveMatchedBooks={(list) => saved.push(list.map((c) => c.id))}
          onDiscard={() => {}}
        />
      </I18nProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: en.scanResults.addMatched(1) }));

    expect(saved).toEqual([['keep']]);
  });
});
