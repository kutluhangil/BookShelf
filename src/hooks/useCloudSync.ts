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
import { planSync, planSize, pruneFingerprints, EMPTY_FINGERPRINTS } from '../services/syncPlan';
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
    ownerUid,
    setOwnerUid,
  } = library;

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasUnsyncedChanges, setHasUnsyncedChanges] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  /**
   * Counts library edits. A push takes as long as the network does, and an edit
   * made while it is in flight is not part of it — without a way to notice that,
   * the success handler would clear the dirty flag on work that never left the
   * device, and nothing would schedule another push until the next edit.
   */
  const revisionRef = useRef(0);

  /** Guards against two pushes overlapping; `isSyncing` is state, so it lags. */
  const inFlightRef = useRef(false);

  // Flag unsynced work. Skipped on mount so a freshly loaded library is not
  // reported as dirty before the user has touched anything.
  const isFirstRenderRef = useRef(true);
  useEffect(() => {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      return;
    }
    revisionRef.current += 1;
    setHasUnsyncedChanges(true);
  }, [books, shelves, readingGoals, monthlyGoal]);

  // The login merge reads the library as it stands at that moment. Depending on
  // it directly would resubscribe the auth listener on every edit.
  const stateRef = useRef({ books, shelves, syncFingerprints, deletedBookIds, deletedShelfIds, ownerUid });
  stateRef.current = { books, shelves, syncFingerprints, deletedBookIds, deletedShelfIds, ownerUid };

  useEffect(
    () =>
      observeAuthState(
        async (user) => {
          setCurrentUser(user);
          if (!user) return;

          const { books: localBooks, shelves: localShelves, syncFingerprints: prints } = stateRef.current;
          const { deletedBookIds: goneBooks, deletedShelfIds: goneShelves, ownerUid: owner } = stateRef.current;

          // Signing out leaves the library on the device, so the records in
          // memory may belong to whoever was signed in before. Merging them
          // into a second account copied one reader's books into another's
          // library and, eight seconds later, into their cloud. A library with
          // no owner yet is the reader's own offline one and does merge.
          const isForeignLibrary = owner !== null && owner !== user.uid;

          try {
            setIsSyncing(true);
            const cloudData = await fetchFromCloud(user.uid);

            if (isForeignLibrary) {
              // Adopt this account's library instead of mixing the two. The
              // tombstones and fingerprints describe the other account's sync
              // history and mean nothing here.
              setBooks(cloudData.books);
              setShelves(cloudData.shelves);
              setDeletedBookIds([]);
              setDeletedShelfIds([]);
              setSyncFingerprints(EMPTY_FINGERPRINTS);
              setOwnerUid(user.uid);
              if (cloudData.readingGoals) setReadingGoals(cloudData.readingGoals);
              if (typeof cloudData.monthlyGoal === 'number') setMonthlyGoal(cloudData.monthlyGoal);

              pushToast({
                title: t.toasts.accountSwitched,
                description: t.toasts.accountSwitchedDetail(cloudData.books.length),
                icon: 'switch_account',
              });
              return;
            }

            const merged = mergeLibraries(
              { books: localBooks, shelves: localShelves },
              cloudData,
              { bookIds: goneBooks, shelfIds: goneShelves },
              prints
            );

            setBooks(merged.books);
            setShelves(merged.shelves);
            setOwnerUid(user.uid);
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

            // Removing records the reader never deleted here is the one merge
            // outcome that looks like data loss, so it is never silent.
            if (merged.removedByRemote.length > 0) {
              pushToast({
                title: t.toasts.removedByRemote(merged.removedByRemote.length),
                description: t.toasts.removedByRemoteDetail(
                  merged.removedByRemote
                    .slice(0, 3)
                    .map((entry) => entry.title)
                    .join(', '),
                  Math.max(0, merged.removedByRemote.length - 3)
                ),
                icon: 'delete_sweep',
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
    [
      pushToast,
      setBooks,
      setShelves,
      setReadingGoals,
      setMonthlyGoal,
      setDeletedBookIds,
      setDeletedShelfIds,
      setSyncFingerprints,
      setOwnerUid,
      t,
    ]
  );

  const syncNow = useCallback(async () => {
    if (!currentUser) return;
    // A second push started while the first is still running would work from the
    // same fingerprints, write everything twice, and clear the tombstones the
    // first one had not sent yet.
    if (inFlightRef.current) return;

    // Only the records whose content differs from the last successful push. A
    // full-library write per sync meant one edited note cost a Firestore write
    // per book in the library.
    const input = { books, shelves, readingGoals, monthlyGoal };
    const plan = planSync(input, syncFingerprints);
    // What this push is responsible for. Everything below clears exactly this
    // much and no more, so a deletion made while the request was in flight is
    // still waiting to be sent afterwards.
    const pushedBookIds = deletedBookIds;
    const pushedShelfIds = deletedShelfIds;
    const revision = revisionRef.current;
    const writes = planSize(plan) + pushedBookIds.length + pushedShelfIds.length;

    inFlightRef.current = true;
    try {
      setIsSyncing(true);
      await syncToCloud(currentUser.uid, {
        books: plan.books,
        shelves: plan.shelves,
        readingGoals,
        monthlyGoal,
        writeMeta: plan.writeMeta,
        deletedBookIds: pushedBookIds,
        deletedShelfIds: pushedShelfIds,
      });

      // These tombstones have been applied remotely; drop them. Dropping the
      // whole list instead would lose a book deleted mid-push, and the next
      // fetch would merge it straight back into the library.
      const appliedBooks = new Set(pushedBookIds);
      const appliedShelves = new Set(pushedShelfIds);
      setDeletedBookIds((prev) => prev.filter((id) => !appliedBooks.has(id)));
      setDeletedShelfIds((prev) => prev.filter((id) => !appliedShelves.has(id)));
      setSyncFingerprints(pruneFingerprints(plan.next, input));
      if (revisionRef.current === revision) setHasUnsyncedChanges(false);
      setLastSyncedAt(new Date().toISOString());
      pushToast({
        title: t.toasts.syncComplete,
        description: t.toasts.syncCompleteDetail(writes),
        icon: 'cloud_done',
      });
    } catch (error) {
      pushToast({ title: t.toasts.syncFailed, description: formatError(t, error), icon: 'error' });
    } finally {
      inFlightRef.current = false;
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
