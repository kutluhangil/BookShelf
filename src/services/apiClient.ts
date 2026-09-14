import { getAuthInstance, isFirebaseConfigured } from '../lib/firebase';
import { AppError, toDetail } from './appError';

/**
 * Single entry point for the server's AI endpoints. It attaches the signed-in
 * user's Firebase ID token when there is one, and turns the server's structured
 * error payloads into errors carrying the actionable detail.
 */

export interface ServerCapabilities {
  status: string;
  model: string;
  /** When true the AI endpoints reject unauthenticated calls. */
  authRequired: boolean;
}

/**
 * A server rejection. The code is picked from the status so the reader gets
 * "sign in" rather than "HTTP 401", while `detail` keeps the server's own
 * (English) explanation for the console.
 */
export class ApiError extends AppError<'api.requestFailed' | 'api.unauthorized' | 'api.healthFailed'> {
  readonly status: number;

  constructor(status: number, detail?: string, options: { health?: boolean } = {}) {
    if (status === 401) {
      super('api.unauthorized', {}, { detail });
    } else if (options.health) {
      super('api.healthFailed', { status }, { detail });
    } else {
      super('api.requestFailed', { status }, { detail });
    }
    this.name = 'ApiError';
    this.status = status;
  }

  get isAuthError(): boolean {
    return this.status === 401;
  }
}

async function getIdToken(): Promise<string | null> {
  if (!isFirebaseConfigured) return null;
  try {
    const auth = await getAuthInstance();
    const user = auth.currentUser;
    return user ? await user.getIdToken() : null;
  } catch {
    // A missing or broken auth session is not fatal here; the server decides
    // whether the call is allowed and returns 401 with an explanation.
    return null;
  }
}

/**
 * How long an AI call may take before it is abandoned.
 *
 * A request the server accepts and never answers otherwise blocks its caller
 * for as long as the browser keeps the socket: a shelf scan sat on the
 * processing screen behind a spinner with no way forward. Generous, because
 * these calls carry a photo and the model takes its time.
 */
export const API_TIMEOUT_MS = 60_000;

/** The health check answers immediately or not at all. */
export const HEALTH_TIMEOUT_MS = 10_000;

/** Runs a request under a deadline, raising `api.timeout` when it expires. */
async function fetchWithDeadline(path: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(path, { ...init, signal: controller.signal });
  } catch (error) {
    if (controller.signal.aborted) {
      throw new AppError('api.timeout', { path, seconds: timeoutMs / 1000 }, { detail: toDetail(error) });
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

let capabilitiesPromise: Promise<ServerCapabilities> | null = null;

export function fetchServerCapabilities(force = false): Promise<ServerCapabilities> {
  if (force || !capabilitiesPromise) {
    capabilitiesPromise = fetchWithDeadline('/api/health', {}, HEALTH_TIMEOUT_MS)
      .then(async (response) => {
        if (!response.ok) throw new ApiError(response.status, undefined, { health: true });
        return (await response.json()) as ServerCapabilities;
      })
      .catch((error) => {
        capabilitiesPromise = null;
        throw error;
      });
  }
  return capabilitiesPromise;
}

export async function postJson<T>(path: string, body: unknown): Promise<T> {
  const token = await getIdToken();

  const response = await fetchWithDeadline(
    path,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    },
    API_TIMEOUT_MS
  );

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const serverDetail = [payload?.error, payload?.detail].filter(Boolean).join(': ');
    throw new ApiError(response.status, serverDetail || `POST ${path}`);
  }

  return payload as T;
}
