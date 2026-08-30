import type { NextFunction, Request, Response } from 'express';
import type { App } from 'firebase-admin/app';
import type { Auth, DecodedIdToken } from 'firebase-admin/auth';

/**
 * The Gemini endpoints cost money per call. Without authentication anyone who
 * reaches the server can spend the project's quota, so in production a valid
 * Firebase ID token is required. Local development can opt out explicitly.
 */

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: DecodedIdToken;
    }
  }
}

export type AuthMode = 'firebase' | 'disabled';

function readServiceAccount(): Record<string, unknown> | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch (error) {
    throw new Error(
      `FIREBASE_SERVICE_ACCOUNT is set but is not valid JSON: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

export interface AuthSetup {
  mode: AuthMode;
  /** Express middleware enforcing the configured mode. */
  middleware: (req: Request, res: Response, next: NextFunction) => void;
}

/**
 * Decides the auth mode from the environment and returns the matching middleware.
 * Throws when production is misconfigured rather than quietly serving an open endpoint.
 */
export async function createAuth(): Promise<AuthSetup> {
  const isProduction = process.env.NODE_ENV === 'production';
  const requireAuthEnv = process.env.REQUIRE_AUTH;
  const requireAuth = requireAuthEnv === undefined ? isProduction : requireAuthEnv === 'true';

  if (!requireAuth) {
    if (isProduction) {
      throw new Error(
        'REQUIRE_AUTH=false is not allowed in production: it would expose the paid Gemini endpoints to anyone. ' +
          'Configure FIREBASE_SERVICE_ACCOUNT (and FIREBASE_PROJECT_ID) instead.'
      );
    }
    return {
      mode: 'disabled',
      middleware: (_req, _res, next) => next(),
    };
  }

  const serviceAccount = readServiceAccount();
  const projectId = process.env.FIREBASE_PROJECT_ID ?? (serviceAccount?.project_id as string | undefined);

  if (!projectId) {
    throw new Error(
      'Authentication is required but no Firebase project is configured. Set FIREBASE_PROJECT_ID, and either ' +
        'FIREBASE_SERVICE_ACCOUNT (the service account JSON) or GOOGLE_APPLICATION_CREDENTIALS (a path to it).'
    );
  }

  const [{ initializeApp, cert, applicationDefault, getApps }, { getAuth }] = await Promise.all([
    import('firebase-admin/app'),
    import('firebase-admin/auth'),
  ]);

  const existing = getApps();
  const app: App =
    existing.length > 0
      ? existing[0]
      : initializeApp({
          credential: serviceAccount ? cert(serviceAccount as never) : applicationDefault(),
          projectId,
        });

  const adminAuth: Auth = getAuth(app);

  const middleware = (req: Request, res: Response, next: NextFunction) => {
    const header = req.header('authorization');
    const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : null;

    if (!token) {
      res.status(401).json({
        error: 'Authentication required',
        detail: 'Sign in and send your Firebase ID token as an `Authorization: Bearer <token>` header.',
      });
      return;
    }

    adminAuth
      .verifyIdToken(token)
      .then((decoded) => {
        req.user = decoded;
        next();
      })
      .catch((error: unknown) => {
        res.status(401).json({
          error: 'Invalid credentials',
          detail: error instanceof Error ? error.message : String(error),
        });
      });
  };

  return { mode: 'firebase', middleware };
}
