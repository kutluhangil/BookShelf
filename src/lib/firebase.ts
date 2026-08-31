import type { FirebaseApp } from 'firebase/app';
import type { Auth, User } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import { AppError } from '../services/appError';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const REQUIRED_KEYS = ['apiKey', 'authDomain', 'projectId', 'appId'] as const;

const missingKeys = REQUIRED_KEYS.filter((key) => !firebaseConfig[key]);

/**
 * Cloud features (Google sign-in, sync, shared lists) are only available when the
 * Firebase environment variables are present. The app itself works fully offline
 * against local storage, so callers must check this flag before touching the SDK.
 */
export const isFirebaseConfigured = missingKeys.length === 0;

/** The failure to show when a cloud feature is reached without configuration. */
export const firebaseConfigError = isFirebaseConfigured
  ? null
  : new AppError('firebase.notConfigured', {
      missing: missingKeys
        .map((key) => `VITE_FIREBASE_${key.replace(/([A-Z])/g, '_$1').toUpperCase()}`)
        .join(', '),
    });

/**
 * The Firebase SDK is ~670KB minified — larger than the rest of the app combined,
 * and useless to a reader who never signs in. It is therefore loaded on demand
 * through these accessors, which Rollup splits into its own lazy chunk.
 */
let appPromise: Promise<FirebaseApp> | null = null;

function requireConfigured(): void {
  if (!isFirebaseConfigured) throw firebaseConfigError as AppError;
}

async function getApp(): Promise<FirebaseApp> {
  requireConfigured();
  if (!appPromise) {
    appPromise = import('firebase/app').then(({ initializeApp }) => initializeApp(firebaseConfig));
  }
  return appPromise;
}

let authPromise: Promise<Auth> | null = null;

export async function getAuthInstance(): Promise<Auth> {
  if (!authPromise) {
    authPromise = (async () => {
      const [app, { getAuth }] = await Promise.all([getApp(), import('firebase/auth')]);
      return getAuth(app);
    })();
  }
  return authPromise;
}

let dbPromise: Promise<Firestore> | null = null;

/** Resolves the Firestore instance, loading the SDK on first use. */
export async function requireDb(): Promise<Firestore> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const [app, { getFirestore }] = await Promise.all([getApp(), import('firebase/firestore')]);
      return getFirestore(app);
    })();
  }
  return dbPromise;
}

/** Firestore query helpers, loaded alongside the SDK so callers need one await. */
export async function getFirestoreApi() {
  const [db, api] = await Promise.all([requireDb(), import('firebase/firestore')]);
  return { db, ...api };
}

export const loginWithGoogle = async (): Promise<User> => {
  const [auth, { GoogleAuthProvider, signInWithPopup }] = await Promise.all([
    getAuthInstance(),
    import('firebase/auth'),
  ]);
  const result = await signInWithPopup(auth, new GoogleAuthProvider());
  return result.user;
};

export const logout = async (): Promise<void> => {
  const [auth, { signOut }] = await Promise.all([getAuthInstance(), import('firebase/auth')]);
  await signOut(auth);
};

/**
 * Subscribes to auth state. Returns a synchronous unsubscribe so it can be used
 * directly as a React effect cleanup, even though the SDK loads asynchronously.
 * Load failures are reported through `onError` rather than being swallowed.
 */
export const observeAuthState = (
  callback: (user: User | null) => void,
  onError?: (error: Error) => void
): (() => void) => {
  if (!isFirebaseConfigured) {
    callback(null);
    return () => undefined;
  }

  let cancelled = false;
  let unsubscribe: (() => void) | null = null;

  void (async () => {
    try {
      const [auth, { onAuthStateChanged }] = await Promise.all([getAuthInstance(), import('firebase/auth')]);
      if (cancelled) return;
      unsubscribe = onAuthStateChanged(auth, callback);
    } catch (error) {
      if (cancelled) return;
      onError?.(error instanceof Error ? error : new Error(String(error)));
    }
  })();

  return () => {
    cancelled = true;
    unsubscribe?.();
  };
};

export type { User };
