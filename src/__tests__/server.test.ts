import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createApp, type AppOptions } from '../server/app';
import type { AuthSetup } from '../server/auth';

/**
 * The HTTP surface: authentication, rate limiting, body limits and the security
 * headers. None of it was covered, and all of it is the part where a mistake is
 * a bill or a breach rather than a rendering glitch.
 */

const openAuth: AuthSetup = { mode: 'disabled', middleware: (_req, _res, next) => next() };

/** Accepts `Bearer <uid>` and rejects everything else, standing in for Firebase. */
const tokenAuth: AuthSetup = {
  mode: 'firebase',
  middleware: (req, res, next) => {
    const header = req.header('authorization');
    const token = header?.startsWith('Bearer ') ? header.slice(7).trim() : null;
    if (!token) {
      res.status(401).json({ error: 'Authentication required', detail: 'Send an ID token.' });
      return;
    }
    req.user = { uid: token } as NonNullable<typeof req.user>;
    next();
  },
};

function fakeAi(generateContent = vi.fn(async () => ({ text: '{"spines":[]}' }))) {
  return { models: { generateContent } } as unknown as AppOptions['ai'];
}

function app(overrides: Partial<AppOptions> = {}) {
  return createApp({
    ai: fakeAi(),
    model: 'test-model',
    auth: openAuth,
    isProduction: false,
    trustProxy: false,
    ...overrides,
  });
}

const IMAGE = { imageBase64: Buffer.from('not really a jpeg').toString('base64') };

describe('GET /api/health', () => {
  it('reports the model and that auth is off', async () => {
    const response = await request(app()).get('/api/health').expect(200);
    expect(response.body).toEqual({ status: 'ok', model: 'test-model', authRequired: false });
  });

  it('tells the client when a token will be required', async () => {
    const response = await request(app({ auth: tokenAuth })).get('/api/health').expect(200);
    expect(response.body.authRequired).toBe(true);
  });
});

describe('authentication', () => {
  it('rejects an unauthenticated call to a paid endpoint', async () => {
    const generateContent = vi.fn();
    await request(app({ auth: tokenAuth, ai: fakeAi(generateContent) }))
      .post('/api/gemini/shelf')
      .send(IMAGE)
      .expect(401);

    // The point of the 401 is that the call never reaches the paid API.
    expect(generateContent).not.toHaveBeenCalled();
  });

  it('rejects an unauthenticated call before buffering its body', async () => {
    // Authentication is mounted ahead of the body parser, so a 12MB upload from
    // an anonymous caller is refused rather than read.
    const oversized = { imageBase64: 'A'.repeat(600_000) };
    await request(app({ auth: tokenAuth })).post('/api/gemini/recommend').send(oversized).expect(401);
  });

  it('lets an authenticated call through', async () => {
    await request(app({ auth: tokenAuth }))
      .post('/api/gemini/shelf')
      .set('Authorization', 'Bearer user-1')
      .send(IMAGE)
      .expect(200);
  });
});

describe('rate limiting', () => {
  /** Sends `count` shelf requests as `uid` and returns the status codes. */
  async function burst(server: ReturnType<typeof app>, uid: string, count: number) {
    const codes: number[] = [];
    for (let i = 0; i < count; i++) {
      const response = await request(server)
        .post('/api/gemini/shelf')
        .set('Authorization', `Bearer ${uid}`)
        .send(IMAGE);
      codes.push(response.status);
    }
    return codes;
  }

  it('stops one account after its allowance and says when to retry', async () => {
    const server = app({ auth: tokenAuth });
    const codes = await burst(server, 'heavy-user', 21);

    expect(codes.slice(0, 20).every((code) => code === 200)).toBe(true);
    expect(codes[20]).toBe(429);

    const rejected = await request(server)
      .post('/api/gemini/shelf')
      .set('Authorization', 'Bearer heavy-user')
      .send(IMAGE);
    expect(rejected.headers['retry-after']).toBeTruthy();
  });

  it('does not charge one account for another account\'s usage', async () => {
    // The limiter used to bucket by address, so everyone behind one NAT — or
    // behind one proxy — shared a single allowance.
    const server = app({ auth: tokenAuth });
    await burst(server, 'heavy-user', 21);

    await request(server)
      .post('/api/gemini/shelf')
      .set('Authorization', 'Bearer quiet-user')
      .send(IMAGE)
      .expect(200);
  });
});

describe('request validation', () => {
  it('rejects a missing image as a client error, not an upstream failure', async () => {
    const response = await request(app()).post('/api/gemini/shelf').send({}).expect(400);
    expect(response.body.detail).toContain('imageBase64');
  });

  it('rejects an image past the size limit with the actual size', async () => {
    // Base64 carries three bytes per four characters, so the 8MB decoded limit
    // sits just under the 12MB the body parser will accept.
    const tooBig = { imageBase64: 'A'.repeat(11_500_000) };
    const response = await request(app()).post('/api/gemini/shelf').send(tooBig).expect(400);
    expect(response.body.detail).toMatch(/limit is 8MB/);
  });

  it('rejects an empty recommendation request', async () => {
    const response = await request(app()).post('/api/gemini/recommend').send({ books: [] }).expect(400);
    expect(response.body.detail).toContain('non-empty array');
  });

  it('caps the body of the endpoints that take no image', async () => {
    const books = Array.from({ length: 40_000 }, () => ({ title: 'x' }));
    await request(app()).post('/api/gemini/recommend').send({ books }).expect(413);
  });
});

describe('upstream failures', () => {
  it('maps a Gemini error to 502 and keeps its message', async () => {
    const failing = fakeAi(
      vi.fn(async () => {
        throw new Error('upstream exploded');
      })
    );
    const response = await request(app({ ai: failing })).post('/api/gemini/shelf').send(IMAGE).expect(502);
    expect(response.body.detail).toBe('upstream exploded');
  });

  it('does not return a stack frame in production', async () => {
    const failing = fakeAi(
      vi.fn(async () => {
        throw new Error('upstream exploded');
      })
    );
    const response = await request(app({ ai: failing, isProduction: true }))
      .post('/api/gemini/shelf')
      .send(IMAGE)
      .expect(502);

    expect(response.body.detail).toBe('upstream exploded');
    expect(response.body.hint).toBeUndefined();
  });

  it('reports unreadable JSON with the reason and the raw response', async () => {
    const babbling = fakeAi(vi.fn(async () => ({ text: 'not json at all' })));
    const response = await request(app({ ai: babbling })).post('/api/gemini/shelf').send(IMAGE).expect(502);
    expect(response.body.detail).toContain('not json at all');
  });

  it('unwraps a JSON response the model wrapped in a markdown fence', async () => {
    const fenced = fakeAi(vi.fn(async () => ({ text: '```json\n{"spines":[{"title":"Dune"}]}\n```' })));
    const response = await request(app({ ai: fenced })).post('/api/gemini/shelf').send(IMAGE).expect(200);
    expect(response.body.spines).toEqual([{ title: 'Dune' }]);
  });

  it('reports an unreadable page as 422 rather than success', async () => {
    const blank = fakeAi(vi.fn(async () => ({ text: '   ' })));
    await request(app({ ai: blank })).post('/api/gemini/quote').send(IMAGE).expect(422);
  });
});

describe('security headers', () => {
  it('sends a content security policy in production', async () => {
    const response = await request(app({ isProduction: true })).get('/api/health').expect(200);
    const csp = response.headers['content-security-policy'];

    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain('https://covers.openlibrary.org');
    // Google sign-in opens a popup that talks back to this window.
    expect(response.headers['cross-origin-opener-policy']).toBe('same-origin-allow-popups');
    expect(response.headers['x-content-type-options']).toBe('nosniff');
  });

  it('omits the policy in development, where Vite needs inline scripts and eval', async () => {
    const response = await request(app({ isProduction: false })).get('/api/health').expect(200);
    expect(response.headers['content-security-policy']).toBeUndefined();
  });
});
