import { describe, expect, it } from 'vitest';
import { AppError, type AppErrorCode, type ErrorPayloads } from '../services/appError';
import { formatError } from '../i18n/formatError';
import { en } from '../i18n/messages/en';
import { tr } from '../i18n/messages/tr';

/**
 * One sample payload per code. The mapped type makes a new error code a compile
 * error here, so no code can ship without proof that both locales render it.
 */
const SAMPLES: { [K in AppErrorCode]: ErrorPayloads[K] } = {
  'lookup.network': { subject: '9780140449136' },
  'lookup.http': { subject: 'dune', status: 503 },
  'lookup.invalidIsbn': { value: '123' },
  'lookup.notFound': { isbn: '9780140449136' },
  'lookup.qrUnrecognized': {},
  'api.healthFailed': { status: 502 },
  'api.requestFailed': { status: 500 },
  'api.unauthorized': {},
  'shelf.signInRequired': {},
  'shelf.noSpines': {},
  'sharedList.missing': { listId: 'list-1' },
  'sharedList.alreadyMember': { person: 'reader@example.com' },
  'sharedList.invalidEmail': { email: 'nope' },
  'sharedList.alreadyInvited': { email: 'reader@example.com' },
  'sharedList.inviteOnly': {},
  'storage.schemaMismatch': { found: 99, expected: 1, key: 'bookshelf.library.v1' },
  'device.audioUnavailable': {},
  'device.canvasUnavailable': {},
  'firebase.notConfigured': { missing: 'VITE_FIREBASE_API_KEY' },
};

const CODES = Object.keys(SAMPLES) as AppErrorCode[];

describe('coded service errors', () => {
  it.each(CODES)('renders %s in both locales', (code) => {
    const error = new AppError(code, SAMPLES[code] as never);
    for (const catalog of [en, tr]) {
      const message = formatError(catalog, error);
      expect(message.length).toBeGreaterThan(0);
      expect(message).not.toContain('undefined');
      expect(message).not.toContain(code);
    }
  });

  it('keeps the interpolated values in the rendered sentence', () => {
    const error = new AppError('lookup.notFound', { isbn: '9780140449136' });
    expect(formatError(en, error)).toContain('9780140449136');
    expect(formatError(tr, error)).toContain('9780140449136');
  });

  it('appends the technical detail so a failure stays diagnosable', () => {
    const error = new AppError('lookup.network', { subject: 'dune' }, { detail: 'Failed to fetch' });
    expect(formatError(tr, error)).toContain('(Failed to fetch)');
  });

  it('carries the code and raw params on the Error message for logs', () => {
    const error = new AppError('api.requestFailed', { status: 500 }, { detail: 'quota exhausted' });
    expect(error.message).toBe('api.requestFailed {"status":500}: quota exhausted');
  });

  it('falls back to what an unknown throwable knows about itself', () => {
    expect(formatError(tr, new Error('boom'))).toBe('boom');
    expect(formatError(tr, 'boom')).toBe('boom');
  });
});
