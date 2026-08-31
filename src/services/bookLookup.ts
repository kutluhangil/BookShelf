/**
 * Real book metadata lookup backed by the Open Library API.
 * Replaces the previous hard-coded "scan result" placeholders.
 */

export interface BookLookupResult {
  title: string;
  author: string;
  isbn: string;
  publisher: string;
  publishYear: number;
  pageCount: number;
  coverUrl: string;
  description?: string;
  subjects?: string[];
}

import { AppError, toDetail } from './appError';

const SEARCH_ENDPOINT = 'https://openlibrary.org/search.json';
const BOOKS_ENDPOINT = 'https://openlibrary.org/api/books';
const COVER_ENDPOINT = 'https://covers.openlibrary.org/b';

/** Strips separators and validates an ISBN-10/13 checksum-free shape. */
export function normalizeIsbn(value: string): string | null {
  const digits = value.replace(/[^0-9Xx]/g, '').toUpperCase();
  if (digits.length === 10 || digits.length === 13) return digits;
  return null;
}

function parseYear(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const match = value.match(/\d{4}/);
    if (match) return Number(match[0]);
  }
  return 0;
}

async function fetchJson(url: string, subject: string): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(url, { headers: { Accept: 'application/json' } });
  } catch (error) {
    throw new AppError('lookup.network', { subject }, { detail: toDetail(error), cause: error });
  }
  if (!response.ok) {
    throw new AppError('lookup.http', { subject, status: response.status }, { detail: url });
  }
  return response.json();
}

/** Looks up a single book by ISBN (as produced by the barcode scanner). */
export async function lookupByIsbn(rawIsbn: string): Promise<BookLookupResult> {
  const isbn = normalizeIsbn(rawIsbn);
  if (!isbn) {
    throw new AppError('lookup.invalidIsbn', { value: rawIsbn });
  }

  const key = `ISBN:${isbn}`;
  const data = (await fetchJson(
    `${BOOKS_ENDPOINT}?bibkeys=${encodeURIComponent(key)}&format=json&jscmd=data`,
    isbn
  )) as Record<string, any>;

  const entry = data[key];
  if (!entry) {
    throw new AppError('lookup.notFound', { isbn });
  }

  return {
    title: entry.title ?? 'Untitled',
    author: entry.authors?.map((a: { name: string }) => a.name).join(', ') || 'Unknown Author',
    isbn,
    publisher: entry.publishers?.map((p: { name: string }) => p.name).join(', ') || 'Unknown Publisher',
    publishYear: parseYear(entry.publish_date),
    pageCount: typeof entry.number_of_pages === 'number' ? entry.number_of_pages : 0,
    coverUrl: entry.cover?.large || entry.cover?.medium || '',
    description: typeof entry.notes === 'string' ? entry.notes : undefined,
    subjects: entry.subjects?.slice(0, 5).map((s: { name: string }) => s.name),
  };
}

/** Free-text catalog search used by the manual match sheet. */
export async function searchBooks(query: string, limit = 12): Promise<BookLookupResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const isbn = normalizeIsbn(trimmed);
  if (isbn) {
    try {
      return [await lookupByIsbn(isbn)];
    } catch {
      // Fall through to a normal text search when the ISBN is unknown.
    }
  }

  const params = new URLSearchParams({
    q: trimmed,
    limit: String(limit),
    fields: 'title,author_name,first_publish_year,publisher,isbn,cover_i,number_of_pages_median',
  });

  const data = (await fetchJson(`${SEARCH_ENDPOINT}?${params.toString()}`, trimmed)) as {
    docs?: Array<Record<string, any>>;
  };

  return (data.docs ?? []).map((doc) => ({
    title: doc.title ?? 'Untitled',
    author: doc.author_name?.[0] ?? 'Unknown Author',
    isbn: doc.isbn?.[0] ?? '',
    publisher: doc.publisher?.[0] ?? 'Unknown Publisher',
    publishYear: doc.first_publish_year ?? 0,
    pageCount: doc.number_of_pages_median ?? 0,
    coverUrl: doc.cover_i ? `${COVER_ENDPOINT}/id/${doc.cover_i}-M.jpg` : '',
  }));
}

/**
 * Resolves a decoded QR payload into a book. Supports bare ISBNs, Open Library
 * URLs and any URL that carries an ISBN in its path or query string.
 */
export async function lookupFromQrPayload(payload: string): Promise<BookLookupResult> {
  const direct = normalizeIsbn(payload);
  if (direct) return lookupByIsbn(direct);

  const embedded = payload.match(/(97[89][\d-]{10,16}|\d{9}[\dXx])/);
  if (embedded) {
    const candidate = normalizeIsbn(embedded[0]);
    if (candidate) return lookupByIsbn(candidate);
  }

  throw new AppError(
    'lookup.qrUnrecognized',
    {},
    { detail: `Decoded payload: ${payload.slice(0, 120)}` }
  );
}
