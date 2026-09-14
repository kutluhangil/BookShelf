import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { AppError } from '../services/appError';

/**
 * The AI endpoints had no deadline. A request the server accepted and never
 * answered left the scan sitting on the processing screen with a spinner and
 * no way forward, for as long as the browser held the socket open.
 */

/** A fetch that never answers, but does honour an abort. */
function neverAnswers(): typeof fetch {
  return ((_url: string, init?: RequestInit) =>
    new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
    })) as unknown as typeof fetch;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.resetModules();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('AI endpoint requests', () => {
  it('gives up on a request the server never answers', async () => {
    vi.stubGlobal('fetch', neverAnswers());
    const { postJson, API_TIMEOUT_MS } = await import('../services/apiClient');

    const pending = postJson('/api/gemini/shelf', { imageBase64: '' });
    const assertion = expect(pending).rejects.toMatchObject({ code: 'api.timeout' });

    await vi.advanceTimersByTimeAsync(API_TIMEOUT_MS + 10);
    await assertion;
  });

  it('names the endpoint and the deadline in the failure', async () => {
    vi.stubGlobal('fetch', neverAnswers());
    const { postJson, API_TIMEOUT_MS } = await import('../services/apiClient');

    const pending = postJson('/api/gemini/quote', {}).catch((error: unknown) => error);
    await vi.advanceTimersByTimeAsync(API_TIMEOUT_MS + 10);
    const thrown = await pending;

    // The module registry is reset per test, so `instanceof` would compare
    // against a different copy of the class; the code is the contract anyway.
    expect((thrown as AppError).code).toBe('api.timeout');
    expect((thrown as AppError).params).toMatchObject({
      path: '/api/gemini/quote',
      seconds: API_TIMEOUT_MS / 1000,
    });
  });

  it('gives up on a health check that never answers', async () => {
    vi.stubGlobal('fetch', neverAnswers());
    const { fetchServerCapabilities, HEALTH_TIMEOUT_MS } = await import('../services/apiClient');

    const pending = fetchServerCapabilities().catch((error: unknown) => error);
    await vi.advanceTimersByTimeAsync(HEALTH_TIMEOUT_MS + 10);

    expect((await pending as AppError).code).toBe('api.timeout');
  });

  it('returns the payload of a request that does answer', async () => {
    vi.stubGlobal(
      'fetch',
      (async () => new Response(JSON.stringify({ ok: true }), { status: 200 })) as unknown as typeof fetch
    );
    const { postJson } = await import('../services/apiClient');

    await expect(postJson('/api/gemini/quote', {})).resolves.toEqual({ ok: true });
  });
});
