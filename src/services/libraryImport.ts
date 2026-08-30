import { Book, ReadingStatus } from '../types';

/**
 * Imports a library from CSV. Handles both this app's own export format and a
 * Goodreads export, which is the format most people already have.
 */

export interface ImportRow {
  title: string;
  author: string;
  isbn: string;
  publisher: string;
  publishYear: number;
  pageCount: number;
  status: ReadingStatus;
  progress?: number;
  rating?: number;
  tags: string[];
  notes?: string;
}

export interface ImportResult {
  rows: ImportRow[];
  /** Rows that could not be read, with the reason, so nothing fails silently. */
  skipped: Array<{ line: number; reason: string }>;
  detectedFormat: 'bookshelf' | 'goodreads' | 'generic';
}

/** RFC 4180 style parser: handles quoted fields, escaped quotes and newlines. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  const source = text.replace(/^﻿/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  for (let i = 0; i < source.length; i++) {
    const char = source[i];

    if (inQuotes) {
      if (char === '"') {
        if (source[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((entry) => entry.some((cell) => cell.trim().length > 0));
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** Goodreads wraps ISBNs as `="9780441172719"`. */
function cleanIsbn(value: string): string {
  return value.replace(/[="']/g, '').trim();
}

function parseNumber(value: string | undefined): number {
  if (!value) return 0;
  const match = value.replace(/,/g, '').match(/\d+/);
  return match ? Number(match[0]) : 0;
}

function goodreadsStatus(shelf: string | undefined): ReadingStatus {
  const value = (shelf ?? '').toLowerCase();
  if (value.includes('currently-reading')) return 'reading';
  if (value.includes('read')) return 'read';
  return 'unread';
}

function ownStatus(value: string | undefined): ReadingStatus {
  const normalized = (value ?? '').trim().toLowerCase();
  if (normalized === 'read' || normalized === 'reading' || normalized === 'unread') return normalized;
  return 'unread';
}

export function parseLibraryCsv(text: string): ImportResult {
  const rows = parseCsv(text);
  if (rows.length < 2) {
    return { rows: [], skipped: [{ line: 1, reason: 'The file has no data rows.' }], detectedFormat: 'generic' };
  }

  const headers = rows[0].map(normalizeHeader);
  const index = (...names: string[]): number => {
    for (const name of names) {
      const position = headers.indexOf(name);
      if (position !== -1) return position;
    }
    return -1;
  };

  const titleIdx = index('title');
  const authorIdx = index('author', 'authorlf', 'primaryauthor');
  if (titleIdx === -1) {
    return {
      rows: [],
      skipped: [{ line: 1, reason: 'No "Title" column found. Expected a Bookshelf or Goodreads CSV export.' }],
      detectedFormat: 'generic',
    };
  }

  const detectedFormat: ImportResult['detectedFormat'] = headers.includes('exclusiveshelf')
    ? 'goodreads'
    : headers.includes('progress')
      ? 'bookshelf'
      : 'generic';

  const isbnIdx = index('isbn13', 'isbn');
  const publisherIdx = index('publisher');
  const yearIdx = index('publishyear', 'yearpublished', 'originalpublicationyear');
  const pagesIdx = index('pagecount', 'numberofpages');
  const statusIdx = index('status', 'exclusiveshelf');
  const progressIdx = index('progress');
  const ratingIdx = index('rating', 'myrating');
  const tagsIdx = index('tags', 'bookshelves');
  const notesIdx = index('notes', 'myreview');

  const parsed: ImportRow[] = [];
  const skipped: ImportResult['skipped'] = [];

  for (let i = 1; i < rows.length; i++) {
    const cells = rows[i];
    const title = cells[titleIdx]?.trim();

    if (!title) {
      skipped.push({ line: i + 1, reason: 'Missing title.' });
      continue;
    }

    const rating = parseNumber(ratingIdx === -1 ? undefined : cells[ratingIdx]);
    const progress = progressIdx === -1 ? undefined : parseNumber(cells[progressIdx]);
    const status =
      detectedFormat === 'goodreads'
        ? goodreadsStatus(statusIdx === -1 ? undefined : cells[statusIdx])
        : ownStatus(statusIdx === -1 ? undefined : cells[statusIdx]);

    parsed.push({
      title,
      author: (authorIdx === -1 ? '' : cells[authorIdx]?.trim()) || 'Unknown Author',
      isbn: isbnIdx === -1 ? '' : cleanIsbn(cells[isbnIdx] ?? ''),
      publisher: (publisherIdx === -1 ? '' : cells[publisherIdx]?.trim()) || '',
      publishYear: parseNumber(yearIdx === -1 ? undefined : cells[yearIdx]),
      pageCount: parseNumber(pagesIdx === -1 ? undefined : cells[pagesIdx]),
      status,
      progress: progress !== undefined && progress > 0 ? Math.min(100, progress) : status === 'read' ? 100 : undefined,
      rating: rating >= 1 && rating <= 5 ? rating : undefined,
      tags:
        tagsIdx === -1
          ? []
          : (cells[tagsIdx] ?? '')
              .split(',')
              .map((tag) => tag.trim())
              .filter((tag) => tag.length > 0 && !['read', 'to-read', 'currently-reading'].includes(tag)),
      notes: notesIdx === -1 ? undefined : cells[notesIdx]?.trim() || undefined,
    });
  }

  return { rows: parsed, skipped, detectedFormat };
}

/** Converts parsed rows into books, skipping ones already in the library. */
export function rowsToBooks(
  rows: ImportRow[],
  existing: Book[],
  shelfId: string
): { books: Book[]; duplicates: number } {
  const existingIsbns = new Set(existing.map((book) => book.isbn).filter(Boolean));
  const existingKeys = new Set(
    existing.map((book) => `${book.title.toLowerCase()}|${book.author.toLowerCase()}`)
  );

  const books: Book[] = [];
  let duplicates = 0;
  const stamp = Date.now().toString(36);

  rows.forEach((row, position) => {
    const key = `${row.title.toLowerCase()}|${row.author.toLowerCase()}`;
    if ((row.isbn && existingIsbns.has(row.isbn)) || existingKeys.has(key)) {
      duplicates++;
      return;
    }
    existingKeys.add(key);
    if (row.isbn) existingIsbns.add(row.isbn);

    const now = new Date().toISOString();
    books.push({
      id: `import-${stamp}-${position}`,
      title: row.title,
      author: row.author,
      isbn: row.isbn,
      publisher: row.publisher,
      publishYear: row.publishYear,
      pageCount: row.pageCount,
      description: '',
      coverUrl: '',
      spineCropUrl: '',
      spineColor: '#C9963F',
      shelfId,
      status: row.status,
      progress: row.progress,
      currentPage: row.pageCount && row.progress ? Math.round((row.pageCount * row.progress) / 100) : undefined,
      rating: row.rating,
      tags: row.tags.length > 0 ? row.tags : undefined,
      notes: row.notes,
      readAt: row.status === 'read' ? now : undefined,
      readHistory: row.status === 'read' ? [now] : undefined,
      confidence: 'matched',
      score: 1,
      category: row.tags[0] ?? 'Imported',
      addedAt: now,
      updatedAt: now,
    });
  });

  return { books, duplicates };
}
