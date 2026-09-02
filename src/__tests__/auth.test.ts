import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createAuth } from '../server/auth';

/**
 * The auth setup decides whether the paid endpoints are open. Its failure modes
 * are configuration mistakes, so they are worth pinning down: the dangerous one
 * is production quietly starting with authentication off.
 */

const saved = { ...process.env };

beforeEach(() => {
  delete process.env.NODE_ENV;
  delete process.env.REQUIRE_AUTH;
  delete process.env.FIREBASE_PROJECT_ID;
  delete process.env.FIREBASE_SERVICE_ACCOUNT;
});

afterEach(() => {
  process.env = { ...saved };
});

describe('createAuth', () => {
  it('is off by default outside production', async () => {
    const auth = await createAuth();
    expect(auth.mode).toBe('disabled');
  });

  it('refuses to start production with authentication turned off', async () => {
    process.env.NODE_ENV = 'production';
    process.env.REQUIRE_AUTH = 'false';

    await expect(createAuth()).rejects.toThrow(/not allowed in production/);
  });

  it('requires authentication in production by default', async () => {
    process.env.NODE_ENV = 'production';

    // No project configured, so it fails — but on the configuration, which
    // proves it did not fall back to the open mode.
    await expect(createAuth()).rejects.toThrow(/no Firebase project is configured/);
  });

  it('names what is missing when authentication is asked for without a project', async () => {
    process.env.REQUIRE_AUTH = 'true';
    await expect(createAuth()).rejects.toThrow(/FIREBASE_PROJECT_ID/);
  });

  it('rejects a service account that is not valid JSON, rather than ignoring it', async () => {
    process.env.REQUIRE_AUTH = 'true';
    process.env.FIREBASE_SERVICE_ACCOUNT = '{ not json';

    await expect(createAuth()).rejects.toThrow(/not valid JSON/);
  });

  it('passes every request through when it is off', async () => {
    const auth = await createAuth();
    let reached = false;

    auth.middleware(
      { header: () => undefined } as never,
      {} as never,
      () => {
        reached = true;
      }
    );
    expect(reached).toBe(true);
  });
});
