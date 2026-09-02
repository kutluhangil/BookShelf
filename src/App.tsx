import React, { useState, useMemo, useEffect, useCallback, useRef, lazy } from 'react';
import { Book, Shelf, SpineCandidate, EditionOption, ReadingStatus, SpikeSample, ReadingGoals } from './types';
import { INITIAL_BOOKS, INITIAL_SHELVES } from './data/initialLibrary';
import { recognizeShelf, buildDemoCandidates } from './services/clusteringEngine';
import { lookupByIsbn, lookupFromQrPayload, BookLookupResult } from './services/bookLookup';
import { isFirebaseConfigured, firebaseConfigError, loginWithGoogle, logout, observeAuthState, type User } from './lib/firebase';
import { syncToCloud, fetchFromCloud, mergeLibraries } from './services/cloudSync';
import { loadLibrary, saveLibrary, isPersistenceAvailable } from './services/localStore';
import { fetchServerCapabilities, type ServerCapabilities } from './services/apiClient';
import { ShelfStrip } from './components/ShelfStrip';
import { BookCard } from './components/BookCard';
import { NavigationHeader } from './components/NavigationHeader';
import { BottomNavBar } from './components/BottomNavBar';
import { ScanModal, type CapturePayload } from './components/ScanModal';
import { ProcessingView } from './components/ProcessingView';
import { ScanResultsView } from './components/ScanResultsView';
import { ReviewMatchSheet } from './components/ReviewMatchSheet';
import { ManualSearchSheet } from './components/ManualSearchSheet';
import { BookDetailModal } from './components/BookDetailModal';
import { ShareModal } from './components/ShareModal';
import { SpikeAccuracyDashboard } from './components/SpikeAccuracyDashboard';
import { OnboardingModal } from './components/OnboardingModal';
import { YourShelvesView } from './components/YourShelvesView';
import { SharedListsView } from './components/SharedListsView';

import { GamificationBadges } from './components/GamificationBadges';
import { MonthlyGoalDashboard } from './components/MonthlyGoalDashboard';
import { ReadingGoalsDashboard } from './components/ReadingGoalsDashboard';
import { DailyQuoteDashboard } from './components/DailyQuoteDashboard';
import { RecommendedBooks } from './components/RecommendedBooks';
import { QueuedForReading } from './components/QueuedForReading';
import { ReadingCalendarWidget } from './components/ReadingCalendarWidget';
import { ToastContainer, ToastMessage } from './components/Toast';
import { ReadingGoalsModal } from './components/ReadingGoalsModal';
import { BookComparisonModal } from './components/BookComparisonModal';
import { AIRecommendationsModal } from './components/AIRecommendationsModal';
import { ImportModal } from './components/ImportModal';
import { LibraryAnnualProgressBar } from './components/LibraryAnnualProgressBar';
import { calculateReadingStreak } from './utils/streak';
import { parseNLPSearchQuery } from './utils/searchParser';
import { haptic } from './services/haptics';
import { useIncrementalList } from './hooks/useIncrementalList';
import { LazyPanel } from './components/LazyPanel';
import { motion } from 'motion/react';
import { BookCover } from './components/BookCover';
import { useT } from './i18n/I18nProvider';
import { formatError } from './i18n/formatError';

// Recharts is ~390KB and none of these panels are above the fold, so they load
// on demand instead of blocking first paint.
const LibraryGrowthDashboard = lazy(() =>
  import('./components/LibraryGrowthDashboard').then((m) => ({ default: m.LibraryGrowthDashboard }))
);
const ReadingAnalyticsDashboard = lazy(() =>
  import('./components/ReadingAnalyticsDashboard').then((m) => ({ default: m.ReadingAnalyticsDashboard }))
);
const WeeklyReadingChart = lazy(() =>
  import('./components/WeeklyReadingChart').then((m) => ({ default: m.WeeklyReadingChart }))
);

type ActiveTab = 'library' | 'shelves' | 'shared' | 'eval';

const DEFAULT_GOALS: ReadingGoals = {
  annualPageCount: 10000,
  annualBookCount: 50,
  genreMilestones: [],
};

/** Reads the persisted library once, falling back to the bundled starter library. */
function readInitialState() {
  try {
    const stored = loadLibrary();
    if (stored) {
      return {
        books: stored.books,
        shelves: stored.shelves,
        readingGoals: stored.readingGoals ?? DEFAULT_GOALS,
        monthlyGoal: stored.monthlyGoal ?? 5,
        deletedBookIds: stored.deletedBookIds ?? [],
        deletedShelfIds: stored.deletedShelfIds ?? [],
        restored: true,
        error: null as unknown,
      };
    }
  } catch (error) {
    return {
      books: INITIAL_BOOKS,
      shelves: INITIAL_SHELVES,
      readingGoals: DEFAULT_GOALS,
      monthlyGoal: 5,
      deletedBookIds: [] as string[],
      deletedShelfIds: [] as string[],
      restored: false,
      // Kept raw: readInitialState runs before the provider exists, so the
      // message is rendered later, in the reader's locale.
      error: error as unknown,
    };
  }

  return {
    books: INITIAL_BOOKS,
    shelves: INITIAL_SHELVES,
    readingGoals: DEFAULT_GOALS,
    monthlyGoal: 5,
    deletedBookIds: [] as string[],
    deletedShelfIds: [] as string[],
    restored: false,
    error: null as string | null,
  };
}

const initialState = readInitialState();

export default function App() {
  const t = useT();

  // Primary Store State
  const [books, setBooks] = useState<Book[]>(initialState.books);
  const [shelves, setShelves] = useState<Shelf[]>(initialState.shelves);
  const [monthlyGoal, setMonthlyGoal] = useState<number>(initialState.monthlyGoal);
  const [readingGoals, setReadingGoals] = useState<ReadingGoals>(initialState.readingGoals);

  // Tombstones so deletions propagate to the cloud instead of resurrecting.
  const [deletedBookIds, setDeletedBookIds] = useState<string[]>(initialState.deletedBookIds);
  const [deletedShelfIds, setDeletedShelfIds] = useState<string[]>(initialState.deletedShelfIds);

  const [activeTab, setActiveTab] = useState<ActiveTab>('library');

  // Filter & Search States
  const [selectedShelfId, setSelectedShelfId] = useState<string>('all');
  const [readingStatusFilter, setReadingStatusFilter] = useState<'all' | ReadingStatus>('all');
  const [smartFilter, setSmartFilter] = useState<'none' | 'recently_added' | 'high_priority' | 'abandoned'>('none');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortMode, setSortMode] = useState<'physical' | 'recent' | 'author' | 'title'>('physical');
  const [viewMode, setViewMode] = useState<'list' | 'gallery'>('list');

  // Compare Mode States
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [compareQueue, setCompareQueue] = useState<Book[]>([]);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);

  // Scanning Lifecycle States
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingLabel, setProcessingLabel] = useState<string>('');
  const [pendingScanData, setPendingScanData] = useState<{ imageUrl: string; candidates: SpineCandidate[] } | null>(null);
  const [scanResultsMode, setScanResultsMode] = useState(false);

  // Modals & Sheets
  const [activeReviewCandidate, setActiveReviewCandidate] = useState<SpineCandidate | null>(null);
  const [manualSearchCandidateId, setManualSearchCandidateId] = useState<string | null>(null);
  const [isManualAddOpen, setIsManualAddOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [activeBookDetail, setActiveBookDetail] = useState<Book | null>(null);
  const [activeShareShelf, setActiveShareShelf] = useState<Shelf | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isRecommendationsModalOpen, setIsRecommendationsModalOpen] = useState(false);
  const [isSpikeDashboardOpen, setIsSpikeDashboardOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isReadingGoalsModalOpen, setIsReadingGoalsModalOpen] = useState(false);

  // Toast & Milestone States
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [lastNotifiedCompletedCount, setLastNotifiedCompletedCount] = useState<number>(
    () => initialState.books.filter((b) => b.status === 'read').length
  );
  const [lastNotifiedStreak, setLastNotifiedStreak] = useState<number>(() => calculateReadingStreak(initialState.books));
  const [isReminderEnabled, setIsReminderEnabled] = useState(false);
  const reminderTriggeredRef = useRef(false);

  // Auth & Sync States
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [serverCapabilities, setServerCapabilities] = useState<ServerCapabilities | null>(null);
  const [hasUnsyncedChanges, setHasUnsyncedChanges] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  const pushToast = useCallback((toast: Omit<ToastMessage, 'id'> & { id?: string }) => {
    const id = toast.id ?? `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev, { ...toast, id }]);
    window.setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 6000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // The server tells us whether the AI endpoints need a signed-in user.
  useEffect(() => {
    fetchServerCapabilities()
      .then(setServerCapabilities)
      .catch((error) =>
        pushToast({
          title: t.toasts.serverUnreachable,
          description: t.toasts.serverUnreachableDetail(formatError(t, error)),
          icon: 'cloud_off',
        })
      );
  }, [pushToast, t]);

  // Surface a storage problem instead of silently losing data.
  useEffect(() => {
    if (initialState.error) {
      pushToast({
        title: t.toasts.storedLibraryUnreadable,
        description: formatError(t, initialState.error),
        icon: 'error',
      });
    } else if (!isPersistenceAvailable()) {
      pushToast({
        title: t.toasts.storageUnavailable,
        description: t.toasts.storageUnavailableDetail,
        icon: 'warning',
      });
    }
  }, [pushToast, t]);

  // Persist every mutation locally.
  useEffect(() => {
    saveLibrary({ books, shelves, readingGoals, monthlyGoal, deletedBookIds, deletedShelfIds });
  }, [books, shelves, readingGoals, monthlyGoal, deletedBookIds, deletedShelfIds]);

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

  // Keep shelf volume counts in sync with the actual books.
  useEffect(() => {
    setShelves((prev) => {
      let changed = false;
      const next = prev.map((shelf) => {
        const count = books.filter((book) => book.shelfId === shelf.id).length;
        if (shelf.volumeCount === count) return shelf;
        changed = true;
        return { ...shelf, volumeCount: count };
      });
      return changed ? next : prev;
    });
  }, [books]);

  const booksRef = useRef(books);
  const shelvesRef = useRef(shelves);
  booksRef.current = books;
  shelvesRef.current = shelves;

  useEffect(() => {
    return observeAuthState(
      async (user) => {
      setCurrentUser(user);
      if (!user) return;

      try {
        setIsSyncing(true);
        const cloudData = await fetchFromCloud(user.uid);
        const merged = mergeLibraries(
          { books: booksRef.current, shelves: shelvesRef.current },
          cloudData,
          { bookIds: deletedBookIds, shelfIds: deletedShelfIds }
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
              merged.conflicts.slice(0, 3).map((entry) => entry.title).join(', '),
              Math.max(0, merged.conflicts.length - 3),
              keptCloud.length
            ),
            icon: 'merge',
          });
        }
      } catch (error) {
        pushToast({
          title: t.toasts.cloudFetchFailed,
          description: formatError(t, error),
          icon: 'error',
        });
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
    );
    // deletedBookIds/deletedShelfIds are read through the closure only at login time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pushToast, t]);

  const handleLogin = async () => {
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
      pushToast({
        title: t.toasts.signInFailed,
        description: formatError(t, error),
        icon: 'error',
      });
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      pushToast({ title: t.toasts.signedOut, description: t.toasts.signedOutDetail, icon: 'logout' });
    } catch (error) {
      pushToast({
        title: t.toasts.signOutFailed,
        description: formatError(t, error),
        icon: 'error',
      });
    }
  };

  const handleSyncToCloud = useCallback(async () => {
    if (!currentUser) return;
    try {
      setIsSyncing(true);
      await syncToCloud(currentUser.uid, {
        books,
        shelves,
        readingGoals,
        monthlyGoal,
        deletedBookIds,
        deletedShelfIds,
      });
      // Tombstones have been applied remotely; drop them.
      setDeletedBookIds([]);
      setDeletedShelfIds([]);
      setHasUnsyncedChanges(false);
      setLastSyncedAt(new Date().toISOString());
      pushToast({
        title: t.toasts.syncComplete,
        description: t.toasts.syncCompleteDetail(books.length),
        icon: 'cloud_done',
      });
    } catch (error) {
      pushToast({
        title: t.toasts.syncFailed,
        description: formatError(t, error),
        icon: 'error',
      });
    } finally {
      setIsSyncing(false);
    }
  }, [currentUser, books, shelves, readingGoals, monthlyGoal, deletedBookIds, deletedShelfIds, pushToast, t]);

  // Debounced auto-sync: without it the cloud copy silently goes stale whenever
  // the user forgets to press Sync.
  useEffect(() => {
    if (!currentUser || !hasUnsyncedChanges || isSyncing) return;
    const timer = window.setTimeout(() => {
      void handleSyncToCloud();
    }, 8000);
    return () => window.clearTimeout(timer);
  }, [currentUser, hasUnsyncedChanges, isSyncing, handleSyncToCloud]);

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

  useEffect(() => {
    if (!isReminderEnabled || reminderTriggeredRef.current) return;

    let latestDate = 0;
    books.forEach((b) => {
      b.readingSessions?.forEach((s) => {
        const t = new Date(s.date).getTime();
        if (t > latestDate) latestDate = t;
      });
      b.readHistory?.forEach((dateString) => {
        const time = new Date(dateString).getTime();
        if (time > latestDate) latestDate = time;
      });
      if (b.readAt) {
        const time = new Date(b.readAt).getTime();
        if (time > latestDate) latestDate = time;
      }
    });

    if (latestDate > 0 && Date.now() - latestDate > 48 * 60 * 60 * 1000) {
      reminderTriggeredRef.current = true;
      pushToast({
        title: t.toasts.readingReminder,
        description: t.toasts.readingReminderDetail,
        icon: 'menu_book',
      });
      haptic.success();
    }
  }, [isReminderEnabled, books, pushToast, t]);

  useEffect(() => {
    const currentCompletedCount = books.filter((b) => b.status === 'read').length;
    if (currentCompletedCount > lastNotifiedCompletedCount) {
      if (currentCompletedCount % 5 === 0) {
        pushToast({
          title: t.toasts.milestone,
          description: t.toasts.milestoneDetail(currentCompletedCount),
          icon: 'emoji_events',
        });
        haptic.success();
      }
      setLastNotifiedCompletedCount(currentCompletedCount);
    }
  }, [books, lastNotifiedCompletedCount, pushToast, t]);

  useEffect(() => {
    const streak = calculateReadingStreak(books);
    if (streak > lastNotifiedStreak) {
      if (streak % 7 === 0) {
        pushToast({
          title: t.toasts.streak,
          description: t.toasts.streakDetail(streak),
          icon: 'local_fire_department',
        });
        haptic.success();
      }
      setLastNotifiedStreak(streak);
    }
  }, [books, lastNotifiedStreak, pushToast, t]);

  // Filtered books in the current view
  const filteredBooks = useMemo(() => {
    let result = books.filter((book) => {
      if (selectedShelfId !== 'all' && book.shelfId !== selectedShelfId) return false;
      if (readingStatusFilter !== 'all' && book.status !== readingStatusFilter) return false;

      if (smartFilter !== 'none') {
        if (smartFilter === 'recently_added') {
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          if (new Date(book.addedAt).getTime() < sevenDaysAgo.getTime()) return false;
        } else if (smartFilter === 'high_priority') {
          const priorityTags = ['high priority', 'urgent', 'must read', 'priority'];
          if (!book.tags?.some((tag) => priorityTags.includes(tag.toLowerCase()))) return false;
        } else if (smartFilter === 'abandoned') {
          if (book.status === 'unread') return false;
          if (book.progress === undefined || book.progress >= 30) return false;
        }
      }

      if (searchQuery.trim() && !parseNLPSearchQuery(searchQuery, book)) return false;
      return true;
    });

    if (sortMode === 'recent') {
      result = [...result].sort((a, b) => {
        const lastReadA = a.readHistory?.length
          ? new Date(a.readHistory[a.readHistory.length - 1]).getTime()
          : a.readAt
            ? new Date(a.readAt).getTime()
            : 0;
        const lastReadB = b.readHistory?.length
          ? new Date(b.readHistory[b.readHistory.length - 1]).getTime()
          : b.readAt
            ? new Date(b.readAt).getTime()
            : 0;
        return lastReadB - lastReadA;
      });
    } else if (sortMode === 'author') {
      result = [...result].sort((a, b) => a.author.localeCompare(b.author));
    } else if (sortMode === 'title') {
      result = [...result].sort((a, b) => a.title.localeCompare(b.title));
    }

    return result;
  }, [books, selectedShelfId, readingStatusFilter, smartFilter, searchQuery, sortMode]);

  // Render the grid in chunks so a large library does not mount hundreds of
  // animated cards at once.
  const {
    visible: visibleBooks,
    hasMore: hasMoreBooks,
    remaining: remainingBooks,
    sentinelRef: listSentinelRef,
    loadMore: loadMoreBooks,
  } = useIncrementalList(filteredBooks, 60);

  const allSpineColors = useMemo(() => books.map((b) => b.spineColor || '#C9963F'), [books]);

  const targetShelfId = selectedShelfId !== 'all' ? selectedShelfId : shelves[0]?.id ?? 'shelf-fiction';

  const handleBookClick = (book: Book) => {
    haptic.selectionClick();
    if (!isCompareMode) {
      setActiveBookDetail(book);
      return;
    }
    if (compareQueue.some((b) => b.id === book.id)) {
      setCompareQueue((queue) => queue.filter((b) => b.id !== book.id));
      return;
    }
    if (compareQueue.length < 2) {
      const newQueue = [...compareQueue, book];
      setCompareQueue(newQueue);
      if (newQueue.length === 2) setIsCompareModalOpen(true);
    }
  };

  /** AI features need a signed-in user when the server enforces authentication. */
  const aiRequiresLogin = serverCapabilities?.authRequired === true && !currentUser;

  const blockAiWithLoginPrompt = useCallback((): boolean => {
    if (!aiRequiresLogin) return false;
    pushToast({
      title: t.toasts.signInRequired,
      description: t.toasts.signInRequiredDetail,
      icon: 'lock',
    });
    return true;
  }, [aiRequiresLogin, pushToast, t]);

  const exitCompareMode = () => {
    setIsCompareMode(false);
    setCompareQueue([]);
    setIsCompareModalOpen(false);
  };

  /** Turns an Open Library result into a library book on the active shelf. */
  const bookFromLookup = useCallback(
    (result: BookLookupResult, source: string): Book => ({
      id: `${source}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      title: result.title,
      author: result.author,
      isbn: result.isbn,
      publisher: result.publisher,
      publishYear: result.publishYear,
      pageCount: result.pageCount,
      description: result.description ?? '',
      coverUrl: result.coverUrl,
      spineCropUrl: '',
      spineColor: '#C9963F',
      shelfId: targetShelfId,
      status: 'unread',
      confidence: 'matched',
      score: 1,
      category: result.subjects?.[0] ?? 'Uncategorized',
      tags: result.subjects,
      addedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
    [targetShelfId]
  );

  const addBook = useCallback(
    (book: Book) => {
      setBooks((prev) => {
        const duplicate = book.isbn && prev.find((b) => b.isbn && b.isbn === book.isbn);
        if (duplicate) return prev;
        return [book, ...prev];
      });
      setDeletedBookIds((prev) => prev.filter((id) => id !== book.id));
    },
    []
  );

  // Handle Capture from Camera, Upload, Barcode or Demo Sample
  const handleCapture = useCallback(
    async (payload: CapturePayload) => {
      setIsScannerOpen(false);

      if (payload.mode === 'isbn' || payload.mode === 'qr') {
        if (!payload.barcode) {
          pushToast({
            title: t.toasts.noCode,
            description: t.toasts.noCodeDetail,
            icon: 'error',
          });
          return;
        }

        setProcessingLabel(payload.mode === 'isbn' ? t.processingLabels.isbn : t.processingLabels.qr);
        setIsProcessing(true);
        try {
          const result =
            payload.mode === 'isbn' ? await lookupByIsbn(payload.barcode) : await lookupFromQrPayload(payload.barcode);
          const book = bookFromLookup(result, payload.mode);
          addBook(book);
          haptic.success();
          setActiveBookDetail(book);
          pushToast({
            title: t.toasts.bookAdded,
            description: t.toasts.titleAndAuthor(result.title, result.author),
            icon: 'library_add',
          });
        } catch (error) {
          pushToast({
            title: t.toasts.lookupFailed,
            description: formatError(t, error),
            icon: 'error',
          });
        } finally {
          setIsProcessing(false);
        }
        return;
      }

      // Shelf mode
      if (payload.sample) {
        const candidates = buildDemoCandidates(payload.sample.imageUrl, payload.sample.groundTruth);
        setPendingScanData({ imageUrl: payload.sample.imageUrl, candidates });
        setProcessingLabel(t.processingLabels.demoShelf);
        setIsProcessing(true);
        return;
      }

      if (blockAiWithLoginPrompt()) return;

      setProcessingLabel(t.processingLabels.shelf);
      setIsProcessing(true);
      try {
        const candidates = await recognizeShelf(payload.imageUrl);
        if (candidates.length === 0) {
          setIsProcessing(false);
          pushToast({
            title: t.toasts.noSpines,
            description: t.toasts.noSpinesDetail,
            icon: 'error',
          });
          return;
        }
        setPendingScanData({ imageUrl: payload.imageUrl, candidates });
      } catch (error) {
        setIsProcessing(false);
        pushToast({
          title: t.toasts.shelfRecognitionFailed,
          description: formatError(t, error),
          icon: 'error',
        });
      }
    },
    [addBook, bookFromLookup, pushToast, blockAiWithLoginPrompt, t]
  );

  const handleProcessingComplete = () => {
    setIsProcessing(false);
    setScanResultsMode(true);
  };

  const handleSaveMatchedBooks = (candidatesToSave: SpineCandidate[]) => {
    const stamp = Date.now().toString(36);
    const newBooks: Book[] = candidatesToSave
      .filter((c) => !c.isDismissed && (c.matchedBook || c.editions[0]))
      .map((c, index) => {
        const uniqueId = `scan-${stamp}-${index}-${Math.random().toString(36).slice(2, 7)}`;
        if (c.matchedBook) {
          return {
            ...c.matchedBook,
            id: uniqueId,
            shelfId: targetShelfId,
            addedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
        }
        const ed = c.editions[0];
        return {
          id: uniqueId,
          title: ed.title,
          author: ed.author,
          isbn: ed.isbn,
          publisher: ed.publisher,
          publishYear: ed.year,
          pageCount: 0,
          description: ed.description ?? '',
          coverUrl: ed.coverUrl,
          spineCropUrl: c.cropUrl,
          spineColor: c.dominantColor,
          shelfId: targetShelfId,
          status: 'unread',
          confidence: c.confidence,
          score: c.score,
          category: 'Physical Scan',
          addedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          proofOfCaptureUrl: c.cropUrl,
        };
      });

    setBooks((prev) => [...newBooks, ...prev]);
    setPendingScanData(null);
    setScanResultsMode(false);
    setActiveTab('library');
    haptic.success();
    pushToast({
      title: t.toasts.volumesCataloged,
      description: t.toasts.booksAddedDetail(newBooks.length),
      icon: 'library_add',
    });
  };

  const handleSelectEdition = (candidateId: string, edition: EditionOption) => {
    if (!pendingScanData) return;
    const updated = pendingScanData.candidates.map((c) => {
      if (c.id !== candidateId) return c;
      return {
        ...c,
        confidence: 'matched' as const,
        score: Math.max(c.score, edition.score),
        matchedBook: {
          id: `resolved-${Date.now().toString(36)}-${c.orderIndex}`,
          title: edition.title,
          author: edition.author,
          isbn: edition.isbn,
          publisher: edition.publisher,
          publishYear: edition.year,
          pageCount: 0,
          description: edition.description ?? '',
          coverUrl: edition.coverUrl,
          spineCropUrl: c.cropUrl,
          spineColor: c.dominantColor,
          shelfId: targetShelfId,
          status: 'unread' as const,
          confidence: 'matched' as const,
          score: Math.max(c.score, edition.score),
          category: 'Resolved Volume',
          addedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          proofOfCaptureUrl: c.cropUrl,
        },
      };
    });

    setPendingScanData({ ...pendingScanData, candidates: updated });
    setActiveReviewCandidate(null);
  };

  const handleSelectManualResult = (result: BookLookupResult) => {
    // Manual add from the library toolbar (no scan in progress).
    if (!manualSearchCandidateId || !pendingScanData) {
      const book = bookFromLookup(result, 'manual');
      addBook(book);
      haptic.success();
      pushToast({
        title: t.toasts.bookAdded,
        description: t.toasts.titleAndAuthor(result.title, result.author),
        icon: 'library_add',
      });
      setIsManualAddOpen(false);
      return;
    }

    const updated = pendingScanData.candidates.map((c) => {
      if (c.id !== manualSearchCandidateId) return c;
      return {
        ...c,
        confidence: 'matched' as const,
        score: 0.99,
        matchedBook: {
          id: `manual-${Date.now().toString(36)}-${c.orderIndex}`,
          title: result.title,
          author: result.author,
          isbn: result.isbn,
          publisher: result.publisher,
          publishYear: result.publishYear,
          pageCount: result.pageCount,
          description: result.description ?? '',
          coverUrl: result.coverUrl,
          spineCropUrl: c.cropUrl,
          spineColor: c.dominantColor,
          shelfId: targetShelfId,
          status: 'unread' as const,
          confidence: 'matched' as const,
          score: 0.99,
          category: 'Manual Identifier',
          addedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          proofOfCaptureUrl: c.cropUrl,
        },
      };
    });

    setPendingScanData({ ...pendingScanData, candidates: updated });
    setManualSearchCandidateId(null);
  };

  const handleMarkNotBook = (candidateId: string) => {
    if (!pendingScanData) return;
    setPendingScanData({
      ...pendingScanData,
      candidates: pendingScanData.candidates.map((c) => (c.id === candidateId ? { ...c, isDismissed: true } : c)),
    });
    setActiveReviewCandidate(null);
  };

  /** Applies a partial update to a book and mirrors it into the open detail modal. */
  const updateBook = useCallback((bookId: string, patch: (book: Book) => Partial<Book>) => {
    const stamp = new Date().toISOString();
    setBooks((prev) => prev.map((b) => (b.id === bookId ? { ...b, ...patch(b), updatedAt: stamp } : b)));
    setActiveBookDetail((prev) => (prev && prev.id === bookId ? { ...prev, ...patch(prev), updatedAt: stamp } : prev));
  }, []);

  const handleUpdateStatus = (bookId: string, status: ReadingStatus) => {
    const now = new Date().toISOString();
    updateBook(bookId, (b) => {
      const autoProgress = status === 'read' ? 100 : status === 'unread' ? 0 : b.progress ?? 25;
      const isNewlyRead = status === 'read' && b.status !== 'read';
      return {
        status,
        progress: autoProgress,
        currentPage: b.pageCount ? Math.round((b.pageCount * autoProgress) / 100) : b.currentPage,
        readAt: status === 'read' ? (isNewlyRead ? now : b.readAt || now) : undefined,
        readHistory: isNewlyRead ? [...(b.readHistory || []), now] : b.readHistory,
      };
    });
  };

  const handleUpdateProgress = (bookId: string, progress: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(progress)));
    const derivedStatus: ReadingStatus = clamped === 100 ? 'read' : clamped > 0 ? 'reading' : 'unread';
    const now = new Date().toISOString();

    updateBook(bookId, (b) => {
      const isNewlyRead = derivedStatus === 'read' && b.status !== 'read';
      return {
        progress: clamped,
        currentPage: b.pageCount ? Math.round((b.pageCount * clamped) / 100) : b.currentPage,
        status: derivedStatus,
        readAt: derivedStatus === 'read' ? (isNewlyRead ? now : b.readAt || now) : undefined,
        readHistory: isNewlyRead ? [...(b.readHistory || []), now] : b.readHistory,
      };
    });
  };

  /** Page-level progress; percentage is derived so both stay consistent. */
  const handleUpdateCurrentPage = (bookId: string, page: number) => {
    const book = books.find((b) => b.id === bookId);
    if (!book) return;
    if (!book.pageCount) {
      pushToast({
        title: t.toasts.pageCountUnknown,
        description: t.toasts.pageCountUnknownDetail,
        icon: 'error',
      });
      return;
    }
    const clampedPage = Math.max(0, Math.min(book.pageCount, Math.round(page)));
    handleUpdateProgress(bookId, (clampedPage / book.pageCount) * 100);
  };

  const handleUpdatePageCount = (bookId: string, pageCount: number) => {
    const clamped = Math.max(0, Math.round(pageCount));
    updateBook(bookId, (b) => ({
      pageCount: clamped,
      currentPage: clamped ? Math.round((clamped * (b.progress ?? 0)) / 100) : undefined,
    }));
  };

  const handleUpdateShelf = (bookId: string, shelfId: string) => updateBook(bookId, () => ({ shelfId }));

  const handleUpdateCoordinate = (bookId: string, shelfId: string, x: number | undefined, y: number | undefined) => {
    setShelves((prev) =>
      prev.map((s) => {
        if (s.id !== shelfId) return s;
        const newCoords = { ...(s.coordinates || {}) };
        if (x === undefined || y === undefined) delete newCoords[bookId];
        else newCoords[bookId] = { x, y };
        return { ...s, coordinates: newCoords };
      })
    );
  };

  const handleDeleteBook = (bookId: string) => {
    setBooks((prev) => prev.filter((b) => b.id !== bookId));
    setDeletedBookIds((prev) => (prev.includes(bookId) ? prev : [...prev, bookId]));
    setCompareQueue((queue) => queue.filter((b) => b.id !== bookId));
    setActiveBookDetail(null);
    pushToast({ title: t.toasts.volumeRemoved, description: t.toasts.volumeRemovedDetail, icon: 'delete' });
  };

  const handleCreateShelf = (name: string, color?: string, texture?: string) => {
    const newShelf: Shelf = {
      id: `shelf-${Date.now().toString(36)}`,
      name,
      volumeCount: 0,
      dominantColors: color ? [color, color, color, color] : ['#C9963F', '#304E2E', '#2C251D', '#8B2323'],
      themeColor: color,
      texture: texture || 'solid',
      sortOrder: shelves.length + 1,
    };
    setShelves((prev) => [...prev, newShelf]);
    haptic.mediumImpact();
  };

  const handleDeleteShelf = (shelfId: string) => {
    const orphanCount = books.filter((b) => b.shelfId === shelfId).length;
    const fallbackShelf = shelves.find((s) => s.id !== shelfId);

    if (!fallbackShelf && orphanCount > 0) {
      pushToast({
        title: t.toasts.cannotDeleteLastShelf,
        description: t.toasts.cannotDeleteLastShelfDetail,
        icon: 'error',
      });
      return;
    }

    if (orphanCount > 0 && fallbackShelf) {
      setBooks((prev) => prev.map((b) => (b.shelfId === shelfId ? { ...b, shelfId: fallbackShelf.id } : b)));
    }
    setShelves((prev) => prev.filter((s) => s.id !== shelfId));
    setDeletedShelfIds((prev) => (prev.includes(shelfId) ? prev : [...prev, shelfId]));
    if (selectedShelfId === shelfId) setSelectedShelfId('all');
    pushToast({
      title: t.toasts.shelfRemoved,
      description:
        orphanCount > 0 ? t.toasts.shelfRemovedMoved(orphanCount, fallbackShelf?.name ?? '') : t.toasts.emptyShelfDeleted,
      icon: 'delete',
    });
  };

  const handleAutoSortGenres = () => {
    const categories = Array.from(
      new Set(books.map((b) => b.category).filter((c): c is string => Boolean(c && c.trim())))
    );

    setShelves((prevShelves) => {
      const newShelves = [...prevShelves];
      categories.forEach((category, index) => {
        if (!newShelves.find((s) => s.name.toLowerCase() === category.toLowerCase())) {
          newShelves.push({
            id: `shelf-auto-${Date.now().toString(36)}-${index}`,
            name: category,
            volumeCount: 0,
            dominantColors: ['#C9963F', '#304E2E', '#2C251D', '#8B2323'],
            sortOrder: newShelves.length + 1,
          });
        }
      });

      setBooks((prevBooks) =>
        prevBooks.map((book) => {
          if (!book.category) return book;
          const targetShelf = newShelves.find((s) => s.name.toLowerCase() === book.category.toLowerCase());
          return targetShelf && book.shelfId !== targetShelf.id ? { ...book, shelfId: targetShelf.id } : book;
        })
      );

      return newShelves;
    });

    pushToast({ title: t.toasts.shelvesReorganized, description: t.toasts.shelvesReorganizedDetail, icon: 'auto_awesome' });
  };

  const handleUpdateShelfData = (shelfId: string, updates: Partial<Shelf>) => {
    setShelves((prev) => prev.map((s) => (s.id === shelfId ? { ...s, ...updates } : s)));
  };

  const handleUpdateNotes = (bookId: string, notes: string) => updateBook(bookId, () => ({ notes }));
  const handleUpdateQuotes = (bookId: string, quotes: string[]) => updateBook(bookId, () => ({ quotes }));
  const handleUpdateTags = (bookId: string, tags: string[]) => updateBook(bookId, () => ({ tags }));
  const handleUpdateRating = (bookId: string, rating: number | undefined) => updateBook(bookId, () => ({ rating }));

  const handleUpdateLending = (bookId: string, lentTo?: string, lentAt?: string, lentDueAt?: string) =>
    updateBook(bookId, () => ({ lentTo, lentAt, lentDueAt }));

  const handleAddReadingSession = (bookId: string, durationSeconds: number) => {
    const newSession = { date: new Date().toISOString(), durationSeconds };
    updateBook(bookId, (b) => ({ readingSessions: [...(b.readingSessions || []), newSession] }));
  };

  const handleReorderShelves = (newShelves: Shelf[]) => setShelves(newShelves);

  // Overdue lending reminders
  useEffect(() => {
    const overdue = books.filter(
      (b) => b.lentTo && b.lentDueAt && new Date(b.lentDueAt).getTime() < Date.now()
    );
    if (overdue.length === 0) return;
    pushToast({
      title: t.toasts.lentOverdue,
      description: overdue.map((b) => `${b.title} (${b.lentTo})`).join(', '),
      icon: 'handshake',
    });
    // Only fire once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Scan review screen
  if (scanResultsMode && pendingScanData) {
    return (
      <div className="min-h-screen bg-[#12100E] text-[#F4EFE6]">
        <NavigationHeader
          currentView="scan-results"
          discardMode
          onBack={() => {
            setScanResultsMode(false);
            setPendingScanData(null);
          }}
        />

        <ScanResultsView
          sourceImageUrl={pendingScanData.imageUrl}
          candidates={pendingScanData.candidates}
          onReviewCandidate={(cand) => setActiveReviewCandidate(cand)}
          onOpenManualSearch={(id) => setManualSearchCandidateId(id)}
          onSaveMatchedBooks={handleSaveMatchedBooks}
          onDiscard={() => {
            setScanResultsMode(false);
            setPendingScanData(null);
          }}
        />

        <ReviewMatchSheet
          candidate={activeReviewCandidate}
          isOpen={!!activeReviewCandidate}
          onClose={() => setActiveReviewCandidate(null)}
          onSelectEdition={handleSelectEdition}
          onOpenManualSearch={(id) => {
            setActiveReviewCandidate(null);
            setManualSearchCandidateId(id);
          }}
          onMarkNotBook={handleMarkNotBook}
        />

        <ManualSearchSheet
          isOpen={!!manualSearchCandidateId}
          onClose={() => setManualSearchCandidateId(null)}
          onSelectResult={handleSelectManualResult}
          initialQuery={
            pendingScanData.candidates.find((c) => c.id === manualSearchCandidateId)?.rawTextForward ?? ''
          }
        />

        <ToastContainer toasts={toasts} removeToast={removeToast} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#12100E] text-[#F4EFE6] flex flex-col antialiased selection:bg-[#C9963F] selection:text-[#12100E]">
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      <NavigationHeader
        currentView={activeTab}
        books={books}
        onOpenProfile={() => setIsShareModalOpen(true)}
        onOpenRecommendations={() => {
          if (blockAiWithLoginPrompt()) return;
          setIsRecommendationsModalOpen(true);
        }}
        onOpenSpikeDashboard={() => setIsSpikeDashboardOpen(true)}
        onOpenOnboarding={() => setIsOnboardingOpen(true)}
        isAuthenticated={!!currentUser}
        isCloudAvailable={isFirebaseConfigured}
        userName={currentUser?.displayName ?? currentUser?.email ?? undefined}
        userPhotoUrl={currentUser?.photoURL ?? undefined}
        onLogin={handleLogin}
        onLogout={handleLogout}
        onSync={handleSyncToCloud}
        isSyncing={isSyncing}
        hasUnsyncedChanges={hasUnsyncedChanges}
        lastSyncedAt={lastSyncedAt}
      />

      <div className="flex-1 pb-24 md:pb-12">
        {activeTab === 'shelves' ? (
          <YourShelvesView
            shelves={shelves}
            books={books}
            onSelectShelf={(shelfId) => {
              setSelectedShelfId(shelfId);
              setActiveTab('library');
            }}
            onCreateShelf={handleCreateShelf}
            onUpdateShelf={handleUpdateShelfData}
            onDeleteShelf={handleDeleteShelf}
            onReorderShelves={handleReorderShelves}
            onAutoSort={handleAutoSortGenres}
            onShareShelf={(shelf) => {
              setActiveShareShelf(shelf);
              setIsShareModalOpen(true);
            }}
          />
        ) : activeTab === 'shared' ? (
          <div className="p-4 sm:p-6 max-w-[1200px] mx-auto w-full">
            <SharedListsView books={books} currentUser={currentUser} onRequestLogin={handleLogin} />
          </div>
        ) : activeTab === 'eval' ? (
          <div className="p-4 sm:p-6 max-w-[1200px] mx-auto w-full">
            <SpikeAccuracyDashboard
              onClose={() => setActiveTab('library')}
              onTestSampleInScanner={(sample: SpikeSample) => {
                setActiveTab('library');
                void handleCapture({ imageUrl: sample.imageUrl, mode: 'shelf', sample });
              }}
            />
          </div>
        ) : (
          <main className="max-w-[1200px] mx-auto w-full px-4 sm:px-6 py-6 sm:py-8 space-y-7">
            <section className="space-y-2.5">
              <div className="flex justify-between items-end">
                <div>
                  <h2 className="font-serif-literata text-[22px] sm:text-[26px] text-[#F4EFE6] font-bold tracking-tight">
                    {t.library.title}
                  </h2>
                  <p className="font-mono-ibm text-[11px] text-[#A79C8C] mt-0.5">
                    {t.library.summary(books.length, shelves.length)}
                  </p>
                </div>

                <div className="hidden sm:flex items-center gap-2">
                  <button
                    onClick={() => {
                      haptic.lightImpact();
                      setIsManualAddOpen(true);
                    }}
                    className="px-3 py-1.5 bg-[#1C1916] hover:bg-[#262119] hairline-border text-[#A79C8C] hover:text-[#C9963F] rounded-lg font-mono-ibm text-[11px] flex items-center gap-1.5 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]">add</span>
                    <span>{t.library.addBySearch}</span>
                  </button>

                  <button
                    onClick={() => {
                      haptic.lightImpact();
                      setIsImportOpen(true);
                    }}
                    className="px-3 py-1.5 bg-[#1C1916] hover:bg-[#262119] hairline-border text-[#A79C8C] hover:text-[#C9963F] rounded-lg font-mono-ibm text-[11px] flex items-center gap-1.5 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]">upload_file</span>
                    <span>{t.library.import}</span>
                  </button>

                  <button
                    onClick={() => {
                      haptic.lightImpact();
                      setActiveShareShelf(null);
                      setIsShareModalOpen(true);
                    }}
                    className="px-3 py-1.5 bg-[#1C1916] hover:bg-[#262119] hairline-border text-[#A79C8C] hover:text-[#C9963F] rounded-lg font-mono-ibm text-[11px] flex items-center gap-1.5 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]">share</span>
                    <span>{t.library.shareCollection}</span>
                  </button>

                  <button
                    onClick={() => {
                      haptic.mediumImpact();
                      setIsScannerOpen(true);
                    }}
                    className="px-4 py-1.5 bg-[#C9963F] hover:bg-[#b58332] text-[#12100E] rounded-lg font-mono-ibm text-[11px] font-bold tracking-wider uppercase transition-all shadow-[0_2px_12px_rgba(201,150,63,0.3)] flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[17px] font-bold">photo_camera</span>
                    <span>{t.library.scanShelf}</span>
                  </button>
                </div>
              </div>

              <ShelfStrip
                colors={allSpineColors}
                variant="hero"
                height={76}
                onBarClick={(idx: number) => {
                  haptic.selectionClick();
                  if (books[idx]) setActiveBookDetail(books[idx]);
                }}
              />
            </section>

            <LibraryAnnualProgressBar books={books} goals={readingGoals} />

            <div className="space-y-4">
              <QueuedForReading books={books} onSelectBook={setActiveBookDetail} />

              <DailyQuoteDashboard />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ReadingCalendarWidget
                  books={books}
                  reminderEnabled={isReminderEnabled}
                  onToggleReminder={setIsReminderEnabled}
                />
                <LazyPanel label={t.panels.weeklyChart}>
                  <WeeklyReadingChart books={books} />
                </LazyPanel>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <MonthlyGoalDashboard books={books} monthlyGoal={monthlyGoal} onUpdateGoal={setMonthlyGoal} />
                <ReadingGoalsDashboard
                  books={books}
                  goals={readingGoals}
                  onEditGoals={() => setIsReadingGoalsModalOpen(true)}
                />
                <LazyPanel label={t.panels.growth}>
                  <LibraryGrowthDashboard books={books} />
                </LazyPanel>
                <LazyPanel label={t.panels.analytics}>
                  <ReadingAnalyticsDashboard books={books} />
                </LazyPanel>
              </div>

              <GamificationBadges books={books} />

              <RecommendedBooks
                books={books}
                onAddBook={(newBook) => {
                  const bookToAdd: Book = {
                    ...newBook,
                    id: `rec-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
                    shelfId: targetShelfId,
                    addedAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  };
                  addBook(bookToAdd);
                  haptic.success();
                }}
              />
            </div>

            {/* Filter, Search & Shelf Selector Toolbar */}
            <section className="bg-[#1C1916] p-4 rounded-2xl hairline-border space-y-3.5">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A79C8C] text-[19px]">
                    search
                  </span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t.library.searchPlaceholder}
                    className="w-full pl-10 pr-4 py-2 bg-[#12100E] hairline-border rounded-xl text-[13px] font-sans-inter text-[#F4EFE6] placeholder:text-[#9C8F7E] focus:outline-none focus:border-[#C9963F]"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => {
                        haptic.selectionClick();
                        setSearchQuery('');
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A79C8C] hover:text-[#F4EFE6]"
                      aria-label={t.manualSearch.clearLabel}
                    >
                      <span className="material-symbols-outlined text-[16px]">cancel</span>
                    </button>
                  )}
                </div>

                <select
                  value={selectedShelfId}
                  onChange={(e) => {
                    haptic.selectionClick();
                    setSelectedShelfId(e.target.value);
                  }}
                  aria-label={t.library.filterByShelf}
                  className="bg-[#12100E] text-[#F4EFE6] hairline-border text-[12px] font-mono-ibm rounded-xl px-3 py-2 focus:outline-none focus:border-[#C9963F]"
                >
                  <option value="all">{t.library.allShelves(books.length)}</option>
                  {shelves.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({books.filter((b) => b.shelfId === s.id).length})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar font-mono-ibm text-[11px] pt-1">
                <span className="text-[#A79C8C] text-[10px] uppercase tracking-wider mr-1 shrink-0">{t.library.statusLabel}</span>
                {(['all', 'unread', 'reading', 'read'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => {
                      haptic.selectionClick();
                      setReadingStatusFilter(st);
                    }}
                    className={`px-3 py-1 rounded-lg uppercase tracking-wider transition-all shrink-0 ${
                      readingStatusFilter === st
                        ? 'bg-[#C9963F] text-[#12100E] font-bold'
                        : 'bg-[#12100E] text-[#A79C8C] hairline-border hover:text-[#F4EFE6]'
                    }`}
                  >
                    {t.library.statusFilters[st]}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar font-mono-ibm text-[11px] pt-1 border-t border-[#3A332A]/50 mt-1">
                <span className="text-[#A79C8C] text-[10px] uppercase tracking-wider mr-1 shrink-0 mt-2">{t.library.smartLabel}</span>
                <div className="flex items-center gap-1.5 mt-2">
                  {(['none', 'recently_added', 'high_priority', 'abandoned'] as const).map((filterId) => (
                    <button
                      key={filterId}
                      onClick={() => {
                        haptic.selectionClick();
                        setSmartFilter(filterId);
                      }}
                      className={`px-3 py-1 rounded-lg uppercase tracking-wider transition-all shrink-0 ${
                        smartFilter === filterId
                          ? 'bg-[#85E07D] text-[#12100E] font-bold'
                          : 'bg-[#12100E] text-[#A79C8C] hairline-border hover:text-[#F4EFE6]'
                      }`}
                    >
                      {t.library.smartFilters[filterId]}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* Books Grid */}
            <section className="space-y-4">
              <div className="flex justify-between items-center font-mono-ibm text-[11px] text-[#A79C8C] uppercase tracking-wider">
                <span>{t.library.catalogedVolumes(filteredBooks.length)}</span>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => {
                      haptic.lightImpact();
                      if (isCompareMode) exitCompareMode();
                      else setIsCompareMode(true);
                    }}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded transition-colors ${
                      isCompareMode
                        ? 'bg-[#C9963F] text-[#12100E] font-bold'
                        : 'bg-[#12100E] text-[#A79C8C] hover:text-[#F4EFE6] border border-[#3A332A]'
                    }`}
                    title={t.library.compareBooks}
                  >
                    <span className="material-symbols-outlined text-[14px]">compare_arrows</span>
                    <span className="hidden sm:inline">
                      {isCompareMode
                        ? compareQueue.length > 0
                          ? t.library.selectSecond(compareQueue.length)
                          : t.library.selectTwo
                        : t.library.compare}
                    </span>
                  </button>

                  <div className="flex items-center bg-[#12100E] rounded-lg p-0.5 border border-[#3A332A]">
                    <button
                      onClick={() => {
                        haptic.selectionClick();
                        setViewMode('list');
                      }}
                      className={`p-1 rounded ${
                        viewMode === 'list' ? 'bg-[#2C251D] text-[#C9963F]' : 'text-[#A79C8C] hover:text-[#F4EFE6]'
                      } transition-colors`}
                      title={t.library.listView}
                    >
                      <span className="material-symbols-outlined text-[16px] block">view_list</span>
                    </button>
                    <button
                      onClick={() => {
                        haptic.selectionClick();
                        setViewMode('gallery');
                      }}
                      className={`p-1 rounded ${
                        viewMode === 'gallery' ? 'bg-[#2C251D] text-[#C9963F]' : 'text-[#A79C8C] hover:text-[#F4EFE6]'
                      } transition-colors`}
                      title={t.library.galleryView}
                    >
                      <span className="material-symbols-outlined text-[16px] block">grid_view</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <span>{t.library.sortLabel}</span>
                    <select
                      value={sortMode}
                      onChange={(e) => {
                        haptic.selectionClick();
                        setSortMode(e.target.value as typeof sortMode);
                      }}
                      aria-label={t.library.sortAria}
                      className="bg-transparent text-[#F4EFE6] focus:outline-none cursor-pointer"
                    >
                      <option value="physical" className="bg-[#1C1916]">{t.library.sortModes.physical}</option>
                      <option value="recent" className="bg-[#1C1916]">{t.library.sortModes.recent}</option>
                      <option value="author" className="bg-[#1C1916]">{t.library.sortModes.author}</option>
                      <option value="title" className="bg-[#1C1916]">{t.library.sortModes.title}</option>
                    </select>
                  </div>
                </div>
              </div>

              {filteredBooks.length === 0 ? (
                <div className="bg-[#1C1916] rounded-2xl p-12 text-center hairline-border flex flex-col items-center justify-center space-y-4">
                  <span className="material-symbols-outlined text-5xl text-[#3A332A]">shelves</span>
                  <div>
                    <h3 className="font-serif-literata text-[20px] text-[#F4EFE6] font-semibold">
                      {t.library.emptyTitle}
                    </h3>
                    <p className="font-sans-inter text-[13px] text-[#A79C8C] mt-1 max-w-sm">
                      {t.library.emptyBody}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center">
                    <button
                      onClick={() => setIsScannerOpen(true)}
                      className="px-5 py-2.5 bg-[#C9963F] text-[#12100E] font-mono-ibm text-[11px] font-bold rounded-xl uppercase tracking-wider shadow-lg flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-[18px]">photo_camera</span>
                      <span>{t.library.scanNewShelf}</span>
                    </button>
                    <button
                      onClick={() => setIsManualAddOpen(true)}
                      className="px-5 py-2.5 bg-[#262119] text-[#C9963F] hairline-border font-mono-ibm text-[11px] font-bold rounded-xl uppercase tracking-wider flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-[18px]">search</span>
                      <span>{t.library.addBySearchLong}</span>
                    </button>
                    <button
                      onClick={() => setIsImportOpen(true)}
                      className="px-5 py-2.5 bg-[#262119] text-[#C9963F] hairline-border font-mono-ibm text-[11px] font-bold rounded-xl uppercase tracking-wider flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-[18px]">upload_file</span>
                      <span>{t.library.importCsv}</span>
                    </button>
                  </div>
                </div>
              ) : viewMode === 'gallery' ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {visibleBooks.map((book, idx) => {
                    const isSelected = isCompareMode && compareQueue.some((b) => b.id === book.id);
                    return (
                      <motion.div
                        key={book.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(idx * 0.05, 0.5) }}
                        onClick={() => handleBookClick(book)}
                        className={`group relative cursor-pointer aspect-[2/3] rounded-xl overflow-hidden bg-[#1C1916] border shadow-md hover:shadow-xl transition-all ${
                          isSelected ? 'border-[#C9963F] ring-2 ring-[#C9963F]' : 'border-[#3A332A] hover:border-[#C9963F]'
                        }`}
                      >
                        <BookCover
                          coverUrl={book.coverUrl}
                          title={book.title}
                          author={book.author}
                          spineColor={book.spineColor}
                          showAuthor
                          fallbackTextSize={14}
                          className="w-full h-full transition-transform duration-500 group-hover:scale-105"
                        />
                        <div
                          className={`absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent transition-opacity flex items-end p-3 ${
                            isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                          }`}
                        >
                          <div className="w-full">
                            <h4 className="text-[#F4EFE6] font-serif-literata text-sm font-semibold line-clamp-1">
                              {book.title}
                            </h4>
                            <p className="text-[#A79C8C] font-mono-ibm text-[10px] line-clamp-1">{book.author}</p>
                          </div>
                        </div>
                        {isSelected && (
                          <div className="absolute top-2 right-2 bg-[#C9963F] text-[#12100E] rounded-full w-6 h-6 flex items-center justify-center shadow-lg">
                            <span className="material-symbols-outlined text-[16px] font-bold">check</span>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {visibleBooks.map((book, idx) => (
                    <div key={book.id} className="relative">
                      <BookCard
                        book={book}
                        index={idx}
                        onClick={() => handleBookClick(book)}
                        onResolve={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          setManualSearchCandidateId(null);
                          setActiveBookDetail(book);
                        }}
                      />
                      {isCompareMode && compareQueue.some((b) => b.id === book.id) && (
                        <>
                          <div className="absolute inset-0 rounded-2xl pointer-events-none border-2 border-[#C9963F]" />
                          <div className="absolute top-3 right-3 bg-[#C9963F] text-[#12100E] rounded-full w-6 h-6 flex items-center justify-center shadow-lg z-10 pointer-events-none">
                            <span className="material-symbols-outlined text-[16px] font-bold">check</span>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {hasMoreBooks && (
                <div ref={listSentinelRef} className="flex justify-center py-6">
                  <button
                    onClick={loadMoreBooks}
                    className="px-4 py-2 bg-[#1C1916] hairline-border rounded-xl font-mono-ibm text-[11px] text-[#A79C8C] hover:text-[#C9963F] uppercase tracking-wider transition-colors"
                  >
                    {t.library.loadMore(Math.min(60, remainingBooks), remainingBooks)}
                  </button>
                </div>
              )}
            </section>
          </main>
        )}
      </div>

      <BottomNavBar activeTab={activeTab} onTabChange={setActiveTab} onOpenScanner={() => setIsScannerOpen(true)} />

      <ScanModal isOpen={isScannerOpen} onClose={() => setIsScannerOpen(false)} onCapture={handleCapture} />

      {isProcessing && (
        <ProcessingView
          imageUrl={pendingScanData?.imageUrl ?? ''}
          candidates={pendingScanData?.candidates ?? []}
          label={processingLabel || t.processing.defaultLabel}
          onComplete={handleProcessingComplete}
        />
      )}

      <BookDetailModal
        book={activeBookDetail}
        shelves={shelves}
        isOpen={!!activeBookDetail}
        onClose={() => setActiveBookDetail(null)}
        onUpdateStatus={handleUpdateStatus}
        onUpdateProgress={handleUpdateProgress}
        onUpdateCurrentPage={handleUpdateCurrentPage}
        onUpdatePageCount={handleUpdatePageCount}
        onUpdateShelf={handleUpdateShelf}
        onUpdateCoordinate={handleUpdateCoordinate}
        onDeleteBook={handleDeleteBook}
        onUpdateNotes={handleUpdateNotes}
        onUpdateQuotes={handleUpdateQuotes}
        onUpdateLending={handleUpdateLending}
        onUpdateTags={handleUpdateTags}
        onUpdateRating={handleUpdateRating}
        onAddReadingSession={handleAddReadingSession}
      />

      <ReadingGoalsModal
        isOpen={isReadingGoalsModalOpen}
        onClose={() => setIsReadingGoalsModalOpen(false)}
        goals={readingGoals}
        onSave={(newGoals) => setReadingGoals(newGoals)}
      />

      <AIRecommendationsModal
        isOpen={isRecommendationsModalOpen}
        onClose={() => setIsRecommendationsModalOpen(false)}
        books={books}
        onAddBook={(recommendation) => {
          const book: Book = {
            id: `ai-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
            title: recommendation.title,
            author: recommendation.author,
            isbn: '',
            publisher: '',
            publishYear: recommendation.year ?? 0,
            pageCount: 0,
            description: recommendation.reason ?? '',
            coverUrl: '',
            spineCropUrl: '',
            spineColor: '#C9963F',
            shelfId: targetShelfId,
            status: 'unread',
            confidence: 'matched',
            score: 1,
            category: recommendation.category ?? 'Recommended',
            addedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          addBook(book);
          haptic.success();
          pushToast({ title: t.toasts.addedToLibrary, description: recommendation.title, icon: 'library_add' });
        }}
      />

      <BookComparisonModal
        isOpen={isCompareModalOpen}
        onClose={() => {
          setIsCompareModalOpen(false);
          setCompareQueue([]);
        }}
        books={compareQueue}
      />

      <ShareModal
        shelf={activeShareShelf || undefined}
        books={books}
        isOpen={isShareModalOpen}
        onClose={() => {
          setIsShareModalOpen(false);
          setActiveShareShelf(null);
        }}
      />

      <ImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        existingBooks={books}
        targetShelfId={targetShelfId}
        onImport={(imported) => {
          setBooks((prev) => [...imported, ...prev]);
          pushToast({
            title: t.toasts.importComplete,
            description: t.toasts.booksAddedDetail(imported.length),
            icon: 'library_add',
          });
        }}
      />

      {/* Manual "add by search" flow outside of a scan */}
      <ManualSearchSheet
        isOpen={isManualAddOpen}
        onClose={() => setIsManualAddOpen(false)}
        onSelectResult={handleSelectManualResult}
      />

      {isSpikeDashboardOpen && (
        <SpikeAccuracyDashboard
          onClose={() => setIsSpikeDashboardOpen(false)}
          onTestSampleInScanner={(sample: SpikeSample) => {
            setIsSpikeDashboardOpen(false);
            void handleCapture({ imageUrl: sample.imageUrl, mode: 'shelf', sample });
          }}
        />
      )}

      <OnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        onStartScanning={() => setIsScannerOpen(true)}
      />
    </div>
  );
}
