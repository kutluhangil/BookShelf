import { describe, expect, it } from 'vitest';
import { Book, Shelf, ReadingGoals } from '../types';
import { EMPTY_FINGERPRINTS, fingerprint, planSize, planSync, pruneFingerprints } from '../services/syncPlan';

function book(id: string, overrides: Partial<Book> = {}): Book {
  return {
    id,
    title: id,
    author: 'Author',
    isbn: '',
    publisher: '',
    publishYear: 2000,
    pageCount: 100,
    description: '',
    coverUrl: '',
    spineCropUrl: '',
    spineColor: '#000000',
    shelfId: 'shelf-1',
    status: 'unread',
    confidence: 'matched',
    score: 1,
    category: 'Test',
    addedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

const shelf: Shelf = { id: 'shelf-1', name: 'Fiction', volumeCount: 0, dominantColors: [], sortOrder: 1 };
const goals: ReadingGoals = { annualPageCount: 10000, annualBookCount: 50, genreMilestones: [] };

const input = (books: Book[], shelves: Shelf[] = [shelf], monthlyGoal = 5) => ({
  books,
  shelves,
  readingGoals: goals,
  monthlyGoal,
});

describe('fingerprint', () => {
  it('ignores key order, so a rebuilt object is not reported as an edit', () => {
    expect(fingerprint({ a: 1, b: 2 })).toBe(fingerprint({ b: 2, a: 1 }));
  });

  it('ignores undefined values, which Firestore drops on write anyway', () => {
    expect(fingerprint({ a: 1, b: undefined })).toBe(fingerprint({ a: 1 }));
  });

  it('changes when the content does', () => {
    expect(fingerprint(book('x'))).not.toBe(fingerprint(book('x', { title: 'edited' })));
  });
});

describe('planSync', () => {
  it('sends everything on a first sync', () => {
    const plan = planSync(input([book('a'), book('b')]), EMPTY_FINGERPRINTS);
    expect(plan.books).toHaveLength(2);
    expect(plan.shelves).toHaveLength(1);
    expect(plan.writeMeta).toBe(true);
    expect(planSize(plan)).toBe(4);
  });

  it('sends nothing when nothing changed', () => {
    const state = input([book('a'), book('b')]);
    const first = planSync(state, EMPTY_FINGERPRINTS);
    const second = planSync(state, first.next);

    expect(second.books).toHaveLength(0);
    expect(second.shelves).toHaveLength(0);
    expect(second.writeMeta).toBe(false);
    expect(planSize(second)).toBe(0);
  });

  it('sends only the edited book out of a large library', () => {
    const library = Array.from({ length: 500 }, (_, i) => book(`b${i}`));
    const first = planSync(input(library), EMPTY_FINGERPRINTS);

    const edited = library.map((entry) => (entry.id === 'b250' ? { ...entry, notes: 'a thought' } : entry));
    const second = planSync(input(edited), first.next);

    expect(second.books.map((entry) => entry.id)).toEqual(['b250']);
    expect(planSize(second)).toBe(1);
  });

  it('sends a book whose content changed without its timestamp moving', () => {
    // The plan does not trust any mutation site to bump `updatedAt`.
    const before = planSync(input([book('a')]), EMPTY_FINGERPRINTS);
    const after = planSync(input([book('a', { rating: 5 })]), before.next);
    expect(after.books.map((entry) => entry.id)).toEqual(['a']);
  });

  it('writes the goals document only when a goal changed', () => {
    const first = planSync(input([book('a')]), EMPTY_FINGERPRINTS);
    expect(planSync(input([book('a')], [shelf], 5), first.next).writeMeta).toBe(false);
    expect(planSync(input([book('a')], [shelf], 9), first.next).writeMeta).toBe(true);
  });
});

describe('pruneFingerprints', () => {
  it('forgets records that no longer exist locally', () => {
    const first = planSync(input([book('a'), book('b')]), EMPTY_FINGERPRINTS);
    const pruned = pruneFingerprints(first.next, input([book('a')]));

    expect(Object.keys(pruned.books)).toEqual(['a']);
    expect(Object.keys(pruned.shelves)).toEqual(['shelf-1']);
  });
});
