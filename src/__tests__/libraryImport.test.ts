import { describe, expect, it } from 'vitest';
import { parseCsv, parseLibraryCsv, rowsToBooks } from '../services/libraryImport';
import { Book } from '../types';

describe('parseCsv', () => {
  it('handles quoted fields, escaped quotes and embedded newlines', () => {
    const rows = parseCsv('a,b\n"say ""hi""","line1\nline2"');
    expect(rows).toEqual([
      ['a', 'b'],
      ['say "hi"', 'line1\nline2'],
    ]);
  });

  it('strips a UTF-8 BOM', () => {
    expect(parseCsv('﻿Title,Author\nDune,Herbert')[0][0]).toBe('Title');
  });
});

describe('parseLibraryCsv', () => {
  it('reads a Goodreads export, including its ="isbn" wrapping', () => {
    const csv = [
      'Title,Author,ISBN13,My Rating,Exclusive Shelf,Number of Pages,Year Published,Publisher,Bookshelves,My Review',
      '"Dune","Frank Herbert","=""9780441172719""",5,read,412,1965,Ace,"sci-fi, favorites","Great"',
      '"Neuromancer","William Gibson","=""9780441569595""",0,currently-reading,271,1984,Ace,"cyberpunk",""',
    ].join('\n');

    const result = parseLibraryCsv(csv);

    expect(result.detectedFormat).toBe('goodreads');
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toMatchObject({
      title: 'Dune',
      author: 'Frank Herbert',
      isbn: '9780441172719',
      status: 'read',
      rating: 5,
      pageCount: 412,
      publishYear: 1965,
      progress: 100,
    });
    expect(result.rows[0].tags).toEqual(['sci-fi', 'favorites']);
    expect(result.rows[1].status).toBe('reading');
    expect(result.rows[1].rating).toBeUndefined();
  });

  it('reads this app own export format', () => {
    const csv = [
      'Title,Author,ISBN,Publisher,Publish Year,Page Count,Status,Progress (%),Tags,Notes',
      '"1984","George Orwell","9780451524935","Signet",1949,328,"reading",42,"dystopia","note"',
    ].join('\n');

    const result = parseLibraryCsv(csv);
    expect(result.detectedFormat).toBe('bookshelf');
    expect(result.rows[0]).toMatchObject({ status: 'reading', progress: 42, notes: 'note' });
  });

  it('reports rows it skipped instead of dropping them silently', () => {
    const csv = 'Title,Author\n,No Title Here\nDune,Herbert';
    const result = parseLibraryCsv(csv);
    expect(result.rows).toHaveLength(1);
    expect(result.skipped).toEqual([{ line: 2, reason: 'Missing title.' }]);
  });

  it('explains itself when the file has no Title column', () => {
    const result = parseLibraryCsv('Foo,Bar\n1,2');
    expect(result.rows).toHaveLength(0);
    expect(result.skipped[0].reason).toMatch(/No "Title" column/);
  });
});

describe('rowsToBooks', () => {
  const existing: Book[] = [
    {
      id: 'existing',
      title: 'Dune',
      author: 'Frank Herbert',
      isbn: '9780441172719',
      publisher: 'Ace',
      publishYear: 1965,
      pageCount: 412,
      description: '',
      coverUrl: '',
      spineCropUrl: '',
      spineColor: '#000000',
      shelfId: 'shelf-1',
      status: 'read',
      confidence: 'matched',
      score: 1,
      category: 'Sci-Fi',
      addedAt: '2024-01-01T00:00:00.000Z',
    },
  ];

  it('skips books already in the library, by ISBN or by title and author', () => {
    const { rows } = parseLibraryCsv(
      'Title,Author,ISBN\nDune,Frank Herbert,9780441172719\nNeuromancer,William Gibson,9780441569595'
    );
    const { books, duplicates } = rowsToBooks(rows, existing, 'shelf-1');
    expect(duplicates).toBe(1);
    expect(books).toHaveLength(1);
    expect(books[0].title).toBe('Neuromancer');
  });

  it('gives imported books unique ids and derives the current page', () => {
    const { rows } = parseLibraryCsv(
      'Title,Author,Page Count,Progress\nA,Author A,200,50\nB,Author B,300,25'
    );
    const { books } = rowsToBooks(rows, [], 'shelf-1');
    expect(new Set(books.map((b) => b.id)).size).toBe(2);
    expect(books[0].currentPage).toBe(100);
    expect(books[1].currentPage).toBe(75);
  });
});
