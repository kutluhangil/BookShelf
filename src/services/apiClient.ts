import { getAuthInstance, isFirebaseConfigured } from '../lib/firebase';
import { AppError } from './appError';

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

let capabilitiesPromise: Promise<ServerCapabilities> | null = null;

export function fetchServerCapabilities(force = false): Promise<ServerCapabilities> {
  if (force || !capabilitiesPromise) {
    capabilitiesPromise = fetch('/api/health')
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

  const response = await fetch(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const serverDetail = [payload?.error, payload?.detail].filter(Boolean).join(': ');
    throw new ApiError(response.status, serverDetail || `POST ${path}`);
  }

  return payload as T;
}
