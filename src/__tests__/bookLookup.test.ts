import { describe, expect, it } from 'vitest';
import { normalizeIsbn } from '../services/bookLookup';

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
