import { describe, expect, it, afterEach, vi } from 'vitest';
import { lookupByIsbn, normalizeIsbn } from '../services/bookLookup';

describe('normalizeIsbn', () => {
  it('accepts hyphenated ISBN-13', () => {
    expect(normalizeIsbn('978-0-441-17271-9')).toBe('9780441172719');
  });

  it('accepts ISBN-10 with a trailing X', () => {
    expect(normalizeIsbn('097522980x')).toBe('097522980X');
  });

  it('rejects anything that is not 10 or 13 characters', () => {
    expect(normalizeIsbn('12345')).toBeNull();
    expect(normalizeIsbn('')).toBeNull();
  });
});

const ISBN = '9780441172719';

const entry = {
  [`ISBN:${ISBN}`]: {
    title: 'Dune',
    authors: [{ name: 'Frank Herbert' }],
    number_of_pages: 412,
  },
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('bookLookup request deadline', () => {
  it('fails with a timeout when Open Library never answers', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', (_url: string, init: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init.signal?.addEventListener('abort', () =>
          reject(new DOMException('The operation was aborted.', 'AbortError'))
        );
      })
    );

    const lookup = lookupByIsbn(ISBN);
    const rejects = expect(lookup).rejects.toMatchObject({
      code: 'lookup.timeout',
      params: { subject: ISBN, seconds: 10 },
    });

    await vi.advanceTimersByTimeAsync(10_000);
    await rejects;
  });

  it('returns the book when the answer arrives in time', async () => {
    vi.stubGlobal('fetch', () =>
      Promise.resolve({ ok: true, json: () => Promise.resolve(entry) } as Response)
    );

    await expect(lookupByIsbn(ISBN)).resolves.toMatchObject({ title: 'Dune', pageCount: 412 });
  });
});
