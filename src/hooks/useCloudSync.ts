import { useCallback, useEffect, useRef, useState } from 'react';
import {
  isFirebaseConfigured,
  firebaseConfigError,
  loginWithGoogle,
  logout as signOut,
  observeAuthState,
  type User,
} from '../lib/firebase';
import { syncToCloud, fetchFromCloud, mergeLibraries } from '../services/cloudSync';
import { planSync, planSize, pruneFingerprints } from '../services/syncPlan';
import { useT } from '../i18n/I18nProvider';
import { formatError } from '../i18n/formatError';
import type { ToastApi } from './useToasts';
import type { LibraryStore } from './useLibrary';

/** How long after the last edit the library is pushed without being asked. */
const AUTO_SYNC_DELAY_MS = 8000;

export interface CloudSyncApi {
  currentUser: User | null;
  isSyncing: boolean;
  hasUnsyncedChanges: boolean;
  lastSyncedAt: string | null;
  syncNow: () => Promise<void>;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

/**
 * Sign-in, the merge on login, and pushing changes back up.
 *
 * The library itself belongs to `useLibrary`; this hook reads and writes it
 * through the store rather than owning it, because a merge has to replace the
 * local records wholesale.
 */
export function useCloudSync(library: LibraryStore, pushToast: ToastApi['pushToast']): CloudSyncApi {
  const t = useT();
  const {
    books,
    setBooks,
    shelves,
    setShelves,
    readingGoals,
    setReadingGoals,
    monthlyGoal,
    setMonthlyGoal,
    deletedBookIds,
    setDeletedBookIds,
    deletedShelfIds,
    setDeletedShelfIds,
    syncFingerprints,
    setSyncFingerprints,
  } = library;

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasUnsyncedChanges, setHasUnsyncedChanges] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  // Flag unsynced work. Skipped on mount so a freshly loaded library is not
  // reported as dirty before the user has touched anything.
  const isFirstRenderRef = useRef(true);
  useEffect(() => {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      return;
    }
    setHasUnsyncedChanges(true);
  }, [books, shelves, readingGoals, monthlyGoal]);

  // The login merge reads the library as it stands at that moment. Depending on
  // it directly would resubscribe the auth listener on every edit.
  const stateRef = useRef({ books, shelves, syncFingerprints, deletedBookIds, deletedShelfIds });
  stateRef.current = { books, shelves, syncFingerprints, deletedBookIds, deletedShelfIds };

  useEffect(
    () =>
      observeAuthState(
        async (user) => {
          setCurrentUser(user);
          if (!user) return;

          const { books: localBooks, shelves: localShelves, syncFingerprints: prints } = stateRef.current;
          const { deletedBookIds: goneBooks, deletedShelfIds: goneShelves } = stateRef.current;

          try {
            setIsSyncing(true);
            const cloudData = await fetchFromCloud(user.uid);
            const merged = mergeLibraries(
              { books: localBooks, shelves: localShelves },
              cloudData,
              { bookIds: goneBooks, shelfIds: goneShelves },
              prints
            );

            setBooks(merged.books);
            setShelves(merged.shelves);
            if (cloudData.readingGoals) setReadingGoals(cloudData.readingGoals);
            if (typeof cloudData.monthlyGoal === 'number') setMonthlyGoal(cloudData.monthlyGoal);

            pushToast({
              title: t.toasts.librarySynced,
              description: t.toasts.librarySyncedDetail(merged.addedFromCloud),
              icon: 'cloud_download',
            });

            // A silent last-write-wins merge can lose an edit made on another
            // device, so say what happened instead of hiding it.
            if (merged.conflicts.length > 0) {
              const keptCloud = merged.conflicts.filter((entry) => entry.keptSide === 'cloud');
              pushToast({
                title: t.toasts.conflictsResolved(merged.conflicts.length),
                description: t.toasts.conflictsDetail(
                  merged.conflicts
                    .slice(0, 3)
                    .map((entry) => entry.title)
                    .join(', '),
                  Math.max(0, merged.conflicts.length - 3),
                  keptCloud.length
                ),
                icon: 'merge',
              });
            }
          } catch (error) {
            pushToast({ title: t.toasts.cloudFetchFailed, description: formatError(t, error), icon: 'error' });
          } finally {
            setIsSyncing(false);
          }
        },
        (error) =>
          pushToast({
            title: t.toasts.cloudUnavailable,
            description: t.toasts.cloudUnavailableDetail(error.message),
            icon: 'cloud_off',
          })
      ),
    [pushToast, setBooks, setShelves, setReadingGoals, setMonthlyGoal, t]
  );

  const syncNow = useCallback(async () => {
    if (!currentUser) return;

    // Only the records whose content differs from the last successful push. A
    // full-library write per sync meant one edited note cost a Firestore write
    // per book in the library.
    const input = { books, shelves, readingGoals, monthlyGoal };
    const plan = planSync(input, syncFingerprints);
    const writes = planSize(plan) + deletedBookIds.length + deletedShelfIds.length;

    try {
      setIsSyncing(true);
      await syncToCloud(currentUser.uid, {
        books: plan.books,
        shelves: plan.shelves,
        readingGoals,
        monthlyGoal,
        writeMeta: plan.writeMeta,
        deletedBookIds,
        deletedShelfIds,
      });

      // Tombstones have been applied remotely; drop them.
      setDeletedBookIds([]);
      setDeletedShelfIds([]);
      setSyncFingerprints(pruneFingerprints(plan.next, input));
      setHasUnsyncedChanges(false);
      setLastSyncedAt(new Date().toISOString());
      pushToast({
        title: t.toasts.syncComplete,
        description: t.toasts.syncCompleteDetail(writes),
        icon: 'cloud_done',
      });
    } catch (error) {
      pushToast({ title: t.toasts.syncFailed, description: formatError(t, error), icon: 'error' });
    } finally {
      setIsSyncing(false);
    }
  }, [
    currentUser,
    books,
    shelves,
    readingGoals,
    monthlyGoal,
    syncFingerprints,
    setSyncFingerprints,
    deletedBookIds,
    setDeletedBookIds,
    deletedShelfIds,
    setDeletedShelfIds,
    pushToast,
    t,
  ]);

  // Debounced auto-sync: without it the cloud copy silently goes stale whenever
  // the user forgets to press Sync.
  useEffect(() => {
    if (!currentUser || !hasUnsyncedChanges || isSyncing) return;
    const timer = window.setTimeout(() => void syncNow(), AUTO_SYNC_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [currentUser, hasUnsyncedChanges, isSyncing, syncNow]);

  // Best-effort warning if the tab closes with work that never reached the cloud.
  useEffect(() => {
    if (!currentUser || !hasUnsyncedChanges) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [currentUser, hasUnsyncedChanges]);

  const login = useCallback(async () => {
    if (!isFirebaseConfigured) {
      pushToast({
        title: t.toasts.cloudDisabled,
        description: firebaseConfigError ? formatError(t, firebaseConfigError) : '',
        icon: 'cloud_off',
      });
      return;
    }
    try {
      await loginWithGoogle();
    } catch (error) {
      pushToast({ title: t.toasts.signInFailed, description: formatError(t, error), icon: 'error' });
    }
  }, [pushToast, t]);

  const logout = useCallback(async () => {
    try {
      await signOut();
      pushToast({ title: t.toasts.signedOut, description: t.toasts.signedOutDetail, icon: 'logout' });
    } catch (error) {
      pushToast({ title: t.toasts.signOutFailed, description: formatError(t, error), icon: 'error' });
    }
  }, [pushToast, t]);

  return { currentUser, isSyncing, hasUnsyncedChanges, lastSyncedAt, syncNow, login, logout };
}
