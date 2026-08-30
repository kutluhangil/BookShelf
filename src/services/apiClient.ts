import { getAuthInstance, isFirebaseConfigured } from '../lib/firebase';

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

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly detail?: string
  ) {
    super(detail ? `${message}: ${detail}` : message);
    this.name = 'ApiError';
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
        if (!response.ok) throw new ApiError('Server health check failed', response.status);
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
    throw new ApiError(
      payload?.error ?? `Request to ${path} failed`,
      response.status,
      payload?.detail ?? undefined
    );
  }

  return payload as T;
}
