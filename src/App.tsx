import React, { useState, useMemo, useEffect } from 'react';
import { Book, Shelf, SpineCandidate, EditionOption, ReadingStatus, SpikeSample } from './types';
import { INITIAL_BOOKS, INITIAL_SHELVES } from './data/initialLibrary';
import { segmentAndMatchShelf } from './services/clusteringEngine';
import { ShelfStrip } from './components/ShelfStrip';
import { BookCard } from './components/BookCard';
import { NavigationHeader } from './components/NavigationHeader';
import { BottomNavBar } from './components/BottomNavBar';
import { ScanModal } from './components/ScanModal';
import { ProcessingView } from './components/ProcessingView';
import { ScanResultsView } from './components/ScanResultsView';
import { ReviewMatchSheet } from './components/ReviewMatchSheet';
import { ManualSearchSheet } from './components/ManualSearchSheet';
import { BookDetailModal } from './components/BookDetailModal';
import { ShareModal } from './components/ShareModal';
import { SpikeAccuracyDashboard } from './components/SpikeAccuracyDashboard';
import { OnboardingModal } from './components/OnboardingModal';
import { YourShelvesView } from './components/YourShelvesView';
import { LibraryGrowthDashboard } from './components/LibraryGrowthDashboard';
import { MonthlyGoalDashboard } from './components/MonthlyGoalDashboard';
import { DailyQuoteDashboard } from './components/DailyQuoteDashboard';
import { RecommendedBooks } from './components/RecommendedBooks';
import { ReadingCalendarWidget } from './components/ReadingCalendarWidget';
import { WeeklyReadingChart } from './components/WeeklyReadingChart';
import { ToastContainer, ToastMessage } from './components/Toast';
import { calculateReadingStreak } from './utils/streak';
import { haptic } from './services/haptics';

export default function App() {
  // Primary Store State
  const [books, setBooks] = useState<Book[]>(INITIAL_BOOKS);
  const [shelves, setShelves] = useState<Shelf[]>(INITIAL_SHELVES);
  const [monthlyGoal, setMonthlyGoal] = useState<number>(5);

  // Active View Tabs: 'library' | 'shelves' | 'eval'
  const [activeTab, setActiveTab] = useState<'library' | 'shelves' | 'eval'>('library');

  // Filter & Search States
  const [selectedShelfId, setSelectedShelfId] = useState<string>('all');
  const [readingStatusFilter, setReadingStatusFilter] = useState<'all' | ReadingStatus>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortMode, setSortMode] = useState<'physical' | 'recent' | 'author' | 'title'>('physical');

  // Scanning Lifecycle States
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingScanData, setPendingScanData] = useState<{
    imageUrl: string;
    candidates: SpineCandidate[];
  } | null>(null);
  const [scanResultsMode, setScanResultsMode] = useState(false);

  // Modals & Sheets
  const [activeReviewCandidate, setActiveReviewCandidate] = useState<SpineCandidate | null>(null);
  const [manualSearchCandidateId, setManualSearchCandidateId] = useState<string | null>(null);
  const [activeBookDetail, setActiveBookDetail] = useState<Book | null>(null);
  const [activeShareShelf, setActiveShareShelf] = useState<Shelf | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isSpikeDashboardOpen, setIsSpikeDashboardOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);

  // Toast & Milestone States
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [lastNotifiedCompletedCount, setLastNotifiedCompletedCount] = useState<number>(() => INITIAL_BOOKS.filter(b => b.status === 'read').length);
  const [lastNotifiedStreak, setLastNotifiedStreak] = useState<number>(() => calculateReadingStreak(INITIAL_BOOKS));

  useEffect(() => {
    const currentCompletedCount = books.filter(b => b.status === 'read').length;
    if (currentCompletedCount > lastNotifiedCompletedCount) {
      if (currentCompletedCount % 5 === 0 && currentCompletedCount > 0) {
        const id = `books-${currentCompletedCount}-${Date.now()}`;
        setToasts(prev => [...prev, { 
          id, 
          title: 'Milestone Reached!', 
          description: `You have read ${currentCompletedCount} books. Incredible progress!`, 
          icon: 'emoji_events' 
        }]);
        haptic.success();
        
        setTimeout(() => {
          setToasts(prev => prev.filter(t => t.id !== id));
        }, 5000);
      }
      setLastNotifiedCompletedCount(currentCompletedCount);
    }
  }, [books, lastNotifiedCompletedCount]);

  useEffect(() => {
    const streak = calculateReadingStreak(books);
    if (streak > lastNotifiedStreak) {
      if (streak % 7 === 0 && streak > 0) {
        const id = `streak-${streak}-${Date.now()}`;
        setToasts(prev => [...prev, { 
          id, 
          title: 'Reading Streak!', 
          description: `You have reached a ${streak}-day reading streak! Keep the momentum going.`, 
          icon: 'local_fire_department' 
        }]);
        haptic.success();
        
        setTimeout(() => {
          setToasts(prev => prev.filter(t => t.id !== id));
        }, 5000);
      }
      setLastNotifiedStreak(streak);
    }
  }, [books, lastNotifiedStreak]);

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Filtered books in the current view
  const filteredBooks = useMemo(() => {
    let result = books.filter((book) => {
      // Shelf filter
      if (selectedShelfId !== 'all' && book.shelfId !== selectedShelfId) {
        return false;
      }
      // Status filter
      if (readingStatusFilter !== 'all' && book.status !== readingStatusFilter) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = book.title.toLowerCase().includes(q);
        const authorMatch = book.author.toLowerCase().includes(q);
        const publisherMatch = book.publisher?.toLowerCase().includes(q);
        const isbnMatch = book.isbn?.includes(q);
        if (!titleMatch && !authorMatch && !publisherMatch && !isbnMatch) {
          return false;
        }
      }
      return true;
    });

    if (sortMode === 'recent') {
      result = [...result].sort((a, b) => {
        const lastReadA = a.readHistory?.length ? new Date(a.readHistory[a.readHistory.length - 1]).getTime() : (a.readAt ? new Date(a.readAt).getTime() : 0);
        const lastReadB = b.readHistory?.length ? new Date(b.readHistory[b.readHistory.length - 1]).getTime() : (b.readAt ? new Date(b.readAt).getTime() : 0);
        return lastReadB - lastReadA;
      });
    } else if (sortMode === 'author') {
      result = [...result].sort((a, b) => a.author.localeCompare(b.author));
    } else if (sortMode === 'title') {
      result = [...result].sort((a, b) => a.title.localeCompare(b.title));
    }

    return result;
  }, [books, selectedShelfId, readingStatusFilter, searchQuery, sortMode]);

  // Overall Spine Colors Palette for the Hero Strip
  const allSpineColors = useMemo(() => {
    return books.map((b) => b.spineColor || '#C9963F');
  }, [books]);

  // Handle Capture from Camera or Sample
  const handleCapture = (imageUrl: string, sampleData?: SpikeSample, scanMode?: 'shelf' | 'isbn') => {
    setIsScannerOpen(false);

    if (scanMode === 'isbn') {
      const ed = sampleData?.groundTruth?.[0]?.editions?.[0] || {
        title: "The Book of Disquiet",
        author: "Fernando Pessoa",
        isbn: "978-0141183046",
        publisher: "Penguin Classics",
        year: 2002,
        coverUrl: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=300"
      };

      const isbnBook: Book = {
        id: `isbn-${Date.now()}`,
        title: ed.title,
        author: ed.author,
        isbn: ed.isbn,
        publisher: ed.publisher,
        publishYear: ed.year,
        pageCount: 320,
        description: `Rapid ISBN scan of ${ed.title} by ${ed.author}.`,
        coverUrl: ed.coverUrl,
        spineColor: "#3A2412",
        shelfId: selectedShelfId !== 'all' ? selectedShelfId : 'shelf-fiction',
        status: 'unread',
        confidence: 'matched',
        score: 0.99,
        category: 'ISBN Scan',
        addedAt: new Date().toISOString(),
      };

      setBooks((prev) => [isbnBook, ...prev]);
      haptic.success();
      setActiveBookDetail(isbnBook);
      return;
    }

    const candidates = segmentAndMatchShelf(imageUrl, sampleData?.groundTruth);
    setPendingScanData({
      imageUrl,
      candidates,
    });
    setIsProcessing(true);
  };

  // Complete Processing View and Transition to Review Screen
  const handleProcessingComplete = () => {
    setIsProcessing(false);
    setScanResultsMode(true);
  };

  // Save All Selected Matched Books into Library
  const handleSaveMatchedBooks = (candidatesToSave: SpineCandidate[]) => {
    const newBooks: Book[] = candidatesToSave
      .filter((c) => c.matchedBook || c.editions[0])
      .map((c) => {
        if (c.matchedBook) {
          return {
            ...c.matchedBook,
            shelfId: selectedShelfId !== 'all' ? selectedShelfId : 'shelf-fiction',
          };
        }
        const ed = c.editions[0];
        return {
          id: `scan-${Date.now()}-${c.orderIndex}`,
          title: ed.title,
          author: ed.author,
          isbn: ed.isbn,
          publisher: ed.publisher,
          publishYear: ed.year,
          pageCount: 320,
          description: `Archival physical print of ${ed.title} by ${ed.author}, published by ${ed.publisher}.`,
          coverUrl: ed.coverUrl,
          spineCropUrl: c.cropUrl,
          spineColor: c.dominantColor,
          shelfId: selectedShelfId !== 'all' ? selectedShelfId : 'shelf-fiction',
          status: 'unread',
          confidence: c.confidence,
          score: c.score,
          category: 'Physical Scan',
          addedAt: new Date().toISOString(),
          proofOfCaptureUrl: c.cropUrl,
        };
      });

    setBooks((prev) => [...newBooks, ...prev]);
    setPendingScanData(null);
    setScanResultsMode(false);
    setActiveTab('library');
  };

  // Handle Edition Selection in Review Sheet
  const handleSelectEdition = (candidateId: string, edition: EditionOption) => {
    if (!pendingScanData) return;
    const updated = pendingScanData.candidates.map((c) => {
      if (c.id === candidateId) {
        return {
          ...c,
          confidence: 'matched' as const,
          score: 0.96,
          matchedBook: {
            id: `resolved-${Date.now()}-${c.orderIndex}`,
            title: edition.title,
            author: edition.author,
            isbn: edition.isbn,
            publisher: edition.publisher,
            publishYear: edition.year,
            pageCount: 300,
            description: edition.description || `Resolved physical edition of ${edition.title} by ${edition.author}.`,
            coverUrl: edition.coverUrl,
            spineCropUrl: c.cropUrl,
            spineColor: c.dominantColor,
            shelfId: 'shelf-fiction',
            status: 'unread' as const,
            confidence: 'matched' as const,
            score: 0.96,
            category: 'Resolved Volume',
            addedAt: new Date().toISOString(),
            proofOfCaptureUrl: c.cropUrl,
          },
        };
      }
      return c;
    });

    setPendingScanData({
      ...pendingScanData,
      candidates: updated,
    });
    setActiveReviewCandidate(null);
  };

  // Handle Manual Book Resolution
  const handleSelectManualResult = (result: {
    title: string;
    author: string;
    isbn: string;
    publisher: string;
    publishYear: number;
    coverUrl: string;
  }) => {
    if (!manualSearchCandidateId || !pendingScanData) return;

    const updated = pendingScanData.candidates.map((c) => {
      if (c.id === manualSearchCandidateId) {
        return {
          ...c,
          confidence: 'matched' as const,
          score: 0.99,
          matchedBook: {
            id: `manual-${Date.now()}-${c.orderIndex}`,
            title: result.title,
            author: result.author,
            isbn: result.isbn,
            publisher: result.publisher,
            publishYear: result.publishYear,
            pageCount: 320,
            description: `Manual catalog match for ${result.title} by ${result.author}.`,
            coverUrl: result.coverUrl,
            spineCropUrl: c.cropUrl,
            spineColor: c.dominantColor,
            shelfId: 'shelf-fiction',
            status: 'unread' as const,
            confidence: 'matched' as const,
            score: 0.99,
            category: 'Manual Identifier',
            addedAt: new Date().toISOString(),
            proofOfCaptureUrl: c.cropUrl,
          },
        };
      }
      return c;
    });

    setPendingScanData({
      ...pendingScanData,
      candidates: updated,
    });
    setManualSearchCandidateId(null);
  };

  // Mark Candidate as Not a Book / Dismiss Noise
  const handleMarkNotBook = (candidateId: string) => {
    if (!pendingScanData) return;
    const updated = pendingScanData.candidates.map((c) => {
      if (c.id === candidateId) {
        return { ...c, isDismissed: true };
      }
      return c;
    });
    setPendingScanData({
      ...pendingScanData,
      candidates: updated,
    });
    setActiveReviewCandidate(null);
  };

  // Update Status, Progress & Shelf
  const handleUpdateStatus = (bookId: string, status: ReadingStatus) => {
    const now = new Date().toISOString();
    setBooks((prev) =>
      prev.map((b) => {
        if (b.id === bookId) {
          const autoProgress =
            status === 'read' ? 100 : status === 'unread' ? 0 : b.progress ?? 25;
          const isNewlyRead = status === 'read' && b.status !== 'read';
          const readAt = status === 'read' ? (isNewlyRead ? now : (b.readAt || now)) : undefined;
          const readHistory = isNewlyRead ? [...(b.readHistory || []), now] : b.readHistory;
          return { ...b, status, progress: autoProgress, readAt, readHistory };
        }
        return b;
      })
    );
    if (activeBookDetail && activeBookDetail.id === bookId) {
      const autoProgress =
        status === 'read' ? 100 : status === 'unread' ? 0 : activeBookDetail.progress ?? 25;
      const isNewlyRead = status === 'read' && activeBookDetail.status !== 'read';
      const readAt = status === 'read' ? (isNewlyRead ? now : (activeBookDetail.readAt || now)) : undefined;
      const readHistory = isNewlyRead ? [...(activeBookDetail.readHistory || []), now] : activeBookDetail.readHistory;
      setActiveBookDetail({ ...activeBookDetail, status, progress: autoProgress, readAt, readHistory });
    }
  };

  const handleUpdateProgress = (bookId: string, progress: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(progress)));
    const derivedStatus: ReadingStatus =
      clamped === 100 ? 'read' : clamped > 0 ? 'reading' : 'unread';
    const now = new Date().toISOString();

    setBooks((prev) =>
      prev.map((b) => {
        if (b.id === bookId) {
          const isNewlyRead = derivedStatus === 'read' && b.status !== 'read';
          return {
            ...b,
            progress: clamped,
            status: derivedStatus,
            readAt: derivedStatus === 'read' ? (isNewlyRead ? now : (b.readAt || now)) : undefined,
            readHistory: isNewlyRead ? [...(b.readHistory || []), now] : b.readHistory,
          };
        }
        return b;
      })
    );
    if (activeBookDetail && activeBookDetail.id === bookId) {
      const isNewlyRead = derivedStatus === 'read' && activeBookDetail.status !== 'read';
      setActiveBookDetail({
        ...activeBookDetail,
        progress: clamped,
        status: derivedStatus,
        readAt: derivedStatus === 'read' ? (isNewlyRead ? now : (activeBookDetail.readAt || now)) : undefined,
        readHistory: isNewlyRead ? [...(activeBookDetail.readHistory || []), now] : activeBookDetail.readHistory,
      });
    }
  };

  const handleUpdateShelf = (bookId: string, shelfId: string) => {
    setBooks((prev) =>
      prev.map((b) => (b.id === bookId ? { ...b, shelfId } : b))
    );
    if (activeBookDetail && activeBookDetail.id === bookId) {
      setActiveBookDetail({ ...activeBookDetail, shelfId });
    }
  };

  const handleDeleteBook = (bookId: string) => {
    setBooks((prev) => prev.filter((b) => b.id !== bookId));
    setActiveBookDetail(null);
  };

  const handleCreateShelf = (name: string, color?: string) => {
    const newShelf: Shelf = {
      id: `shelf-${Date.now()}`,
      name,
      volumeCount: 0,
      dominantColors: color ? [color, color, color, color] : ['#C9963F', '#304E2E', '#2C251D', '#8B2323'],
      themeColor: color,
      sortOrder: shelves.length + 1,
    };
    setShelves((prev) => [...prev, newShelf]);
  };

  const handleUpdateShelfData = (shelfId: string, updates: Partial<Shelf>) => {
    setShelves((prev) => prev.map((s) => (s.id === shelfId ? { ...s, ...updates } : s)));
  };

  const handleUpdateNotes = (bookId: string, notes: string) => {
    setBooks((prev) => prev.map((b) => (b.id === bookId ? { ...b, notes } : b)));
    if (activeBookDetail && activeBookDetail.id === bookId) {
      setActiveBookDetail({ ...activeBookDetail, notes });
    }
  };

  const handleUpdateTags = (bookId: string, tags: string[]) => {
    setBooks((prev) => prev.map((b) => (b.id === bookId ? { ...b, tags } : b)));
    if (activeBookDetail && activeBookDetail.id === bookId) {
      setActiveBookDetail({ ...activeBookDetail, tags });
    }
  };

  const handleAddReadingSession = (bookId: string, durationSeconds: number) => {
    const newSession = { date: new Date().toISOString(), durationSeconds };
    setBooks((prev) => prev.map((b) => (b.id === bookId ? { ...b, readingSessions: [...(b.readingSessions || []), newSession] } : b)));
    if (activeBookDetail && activeBookDetail.id === bookId) {
      setActiveBookDetail({ ...activeBookDetail, readingSessions: [...(activeBookDetail.readingSessions || []), newSession] });
    }
  };

  const handleReorderShelves = (newShelves: Shelf[]) => {
    setShelves(newShelves);
  };

  // If in Scan Review Mode (Image 12), show the full results review interface
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

        {/* Review Bottom Sheet (Image 10) */}
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
          onEnhanceWithAI={async () => {
            await new Promise((r) => setTimeout(r, 1200));
          }}
        />

        {/* Manual Search Sheet (Image 5) */}
        <ManualSearchSheet
          isOpen={!!manualSearchCandidateId}
          onClose={() => setManualSearchCandidateId(null)}
          onSelectResult={handleSelectManualResult}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#12100E] text-[#F4EFE6] flex flex-col antialiased selection:bg-[#C9963F] selection:text-[#12100E]">
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      
      {/* Top Header */}
      <NavigationHeader
        currentView={activeTab}
        books={books}
        onOpenProfile={() => setIsShareModalOpen(true)}
        onOpenSpikeDashboard={() => setIsSpikeDashboardOpen(true)}
        onOpenOnboarding={() => setIsOnboardingOpen(true)}
      />

      {/* Main Content Router */}
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
            onReorderShelves={handleReorderShelves}
            onShareShelf={(shelf) => {
              setActiveShareShelf(shelf);
              setIsShareModalOpen(true);
            }}
          />
        ) : activeTab === 'eval' ? (
          <div className="p-4 sm:p-6 max-w-[1200px] mx-auto w-full">
            <SpikeAccuracyDashboard
              onClose={() => setActiveTab('library')}
              onTestSampleInScanner={(sample) => {
                setActiveTab('library');
                handleCapture(sample.imageUrl, sample);
              }}
            />
          </div>
        ) : (
          /* Primary Library View */
          <main className="max-w-[1200px] mx-auto w-full px-4 sm:px-6 py-6 sm:py-8 space-y-7">
            {/* Signature Hero Multicolored ShelfStrip (Image 3 / Design System) */}
            <section className="space-y-2.5">
              <div className="flex justify-between items-end">
                <div>
                  <h2 className="font-serif-literata text-[22px] sm:text-[26px] text-[#F4EFE6] font-bold tracking-tight">
                    Physical Library Archive
                  </h2>
                  <p className="font-mono-ibm text-[11px] text-[#A79C8C] mt-0.5">
                    {books.length} CATALOGED VOLUMES • {shelves.length} PHYSICAL SHELVES
                  </p>
                </div>

                <div className="hidden sm:flex items-center gap-2">
                  <button
                    onClick={() => {
                      haptic.lightImpact();
                      setActiveShareShelf(null);
                      setIsShareModalOpen(true);
                    }}
                    className="px-3 py-1.5 bg-[#1C1916] hover:bg-[#262119] hairline-border text-[#A79C8C] hover:text-[#C9963F] rounded-lg font-mono-ibm text-[11px] flex items-center gap-1.5 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]">share</span>
                    <span>SHARE COLLECTION</span>
                  </button>

                  <button
                    onClick={() => {
                      haptic.mediumImpact();
                      setIsScannerOpen(true);
                    }}
                    className="px-4 py-1.5 bg-[#C9963F] hover:bg-[#b58332] text-[#12100E] rounded-lg font-mono-ibm text-[11px] font-bold tracking-wider uppercase transition-all shadow-[0_2px_12px_rgba(201,150,63,0.3)] flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[17px] font-bold">photo_camera</span>
                    <span>SCAN SHELF</span>
                  </button>
                </div>
              </div>

              {/* ShelfStrip Component */}
              <ShelfStrip
                colors={allSpineColors}
                variant="hero"
                height={76}
                onBarClick={(idx) => {
                  haptic.selectionClick();
                  if (books[idx]) {
                    setActiveBookDetail(books[idx]);
                  }
                }}
              />
            </section>

            {/* Dashboards */}
            <div className="space-y-4">
              <DailyQuoteDashboard />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ReadingCalendarWidget books={books} />
                <WeeklyReadingChart books={books} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <MonthlyGoalDashboard
                  books={books}
                  monthlyGoal={monthlyGoal}
                  onUpdateGoal={setMonthlyGoal}
                />
                <LibraryGrowthDashboard books={books} />
              </div>

              <RecommendedBooks 
                books={books} 
                onAddBook={(newBook) => {
                  const bookToAdd: Book = {
                    ...newBook,
                    id: `rec-${Date.now()}`,
                    addedAt: new Date().toISOString(),
                  } as Book;
                  setBooks(prev => [bookToAdd, ...prev]);
                  haptic.success();
                }}
              />
            </div>

            {/* Filter, Search & Shelf Strip Selector Toolbar */}
            <section className="bg-[#1C1916] p-4 rounded-2xl hairline-border space-y-3.5">
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Search Bar */}
                <div className="relative flex-1">
                  <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A79C8C] text-[19px]">
                    search
                  </span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by title, author, publisher, ISBN..."
                    className="w-full pl-10 pr-4 py-2 bg-[#12100E] hairline-border rounded-xl text-[13px] font-sans-inter text-[#F4EFE6] placeholder:text-[#9C8F7E] focus:outline-none focus:border-[#C9963F]"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => {
                        haptic.selectionClick();
                        setSearchQuery('');
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A79C8C] hover:text-[#F4EFE6]"
                    >
                      <span className="material-symbols-outlined text-[16px]">cancel</span>
                    </button>
                  )}
                </div>

                {/* Shelves Selector */}
                <select
                  value={selectedShelfId}
                  onChange={(e) => {
                    haptic.selectionClick();
                    setSelectedShelfId(e.target.value);
                  }}
                  className="bg-[#12100E] text-[#F4EFE6] hairline-border text-[12px] font-mono-ibm rounded-xl px-3 py-2 focus:outline-none focus:border-[#C9963F]"
                >
                  <option value="all">All Shelves ({books.length})</option>
                  {shelves.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({books.filter((b) => b.shelfId === s.id).length})
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Chips Filter */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar font-mono-ibm text-[11px] pt-1">
                <span className="text-[#A79C8C] text-[10px] uppercase tracking-wider mr-1 shrink-0">
                  STATUS:
                </span>
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
                    {st}
                  </button>
                ))}
              </div>
            </section>

            {/* Books Grid */}
            <section className="space-y-4">
              <div className="flex justify-between items-center font-mono-ibm text-[11px] text-[#A79C8C] uppercase tracking-wider">
                <span>CATALOGED VOLUMES ({filteredBooks.length})</span>
                <div className="flex items-center gap-2">
                  <span>SORT:</span>
                  <select
                    value={sortMode}
                    onChange={(e) => {
                      haptic.selectionClick();
                      setSortMode(e.target.value as any);
                    }}
                    className="bg-transparent text-[#F4EFE6] focus:outline-none cursor-pointer"
                  >
                    <option value="physical" className="bg-[#1C1916]">PHYSICAL ORDER</option>
                    <option value="recent" className="bg-[#1C1916]">MOST RECENTLY READ</option>
                    <option value="author" className="bg-[#1C1916]">AUTHOR (A-Z)</option>
                    <option value="title" className="bg-[#1C1916]">TITLE (A-Z)</option>
                  </select>
                </div>
              </div>

              {filteredBooks.length === 0 ? (
                <div className="bg-[#1C1916] rounded-2xl p-12 text-center hairline-border flex flex-col items-center justify-center space-y-4">
                  <span className="material-symbols-outlined text-5xl text-[#3A332A]">
                    shelves
                  </span>
                  <div>
                    <h3 className="font-serif-literata text-[20px] text-[#F4EFE6] font-semibold">
                      No volumes found matching filter
                    </h3>
                    <p className="font-sans-inter text-[13px] text-[#A79C8C] mt-1 max-w-sm">
                      Try clearing search parameters or point your camera at a new bookshelf.
                    </p>
                  </div>
                  <button
                    onClick={() => setIsScannerOpen(true)}
                    className="px-5 py-2.5 bg-[#C9963F] text-[#12100E] font-mono-ibm text-[11px] font-bold rounded-xl uppercase tracking-wider shadow-lg flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px]">photo_camera</span>
                    <span>Scan New Shelf</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredBooks.map((book, idx) => (
                    <BookCard
                      key={book.id}
                      book={book}
                      index={idx}
                      onClick={() => setActiveBookDetail(book)}
                      onResolve={(e) => {
                        e.stopPropagation();
                        // Open review match for this book
                        setActiveReviewCandidate({
                          id: `book-res-${book.id}`,
                          orderIndex: 0,
                          bbox: { x: 10, y: 10, width: 20, height: 80 },
                          rawTextForward: `${book.title} ${book.author}`,
                          rawTextReverse: `${book.author} ${book.title}`,
                          dominantColor: book.spineColor,
                          confidence: 'review',
                          score: book.score,
                          cropUrl: book.spineCropUrl,
                          matchedBook: book,
                          editions: [
                            {
                              id: `ed-r-1`,
                              title: book.title,
                              author: book.author,
                              year: book.publishYear,
                              publisher: book.publisher,
                              coverUrl: book.coverUrl,
                              score: book.score,
                              isbn: book.isbn,
                            },
                            {
                              id: `ed-r-2`,
                              title: `${book.title} (Revised Edition)`,
                              author: book.author,
                              year: book.publishYear + 5,
                              publisher: 'Penguin Classics',
                              coverUrl: book.coverUrl,
                              score: 0.72,
                              isbn: '9780140449136',
                            },
                          ],
                        });
                      }}
                    />
                  ))}
                </div>
              )}
            </section>
          </main>
        )}
      </div>

      {/* Floating Bottom Navigation for Mobile */}
      <BottomNavBar
        activeTab={activeTab}
        onTabChange={(tab) => {
          if (tab === 'eval') {
            setIsSpikeDashboardOpen(true);
          } else {
            setActiveTab(tab);
          }
        }}
        onOpenScanner={() => setIsScannerOpen(true)}
      />

      {/* Scanner Viewport Modal */}
      <ScanModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onCapture={handleCapture}
      />

      {/* Processing Animation View (Image 9) */}
      {isProcessing && pendingScanData && (
        <ProcessingView
          imageUrl={pendingScanData.imageUrl}
          candidates={pendingScanData.candidates}
          onComplete={handleProcessingComplete}
        />
      )}

      {/* Book Detail Modal (Image 1) */}
      <BookDetailModal
        book={activeBookDetail}
        shelves={shelves}
        isOpen={!!activeBookDetail}
        onClose={() => setActiveBookDetail(null)}
        onUpdateStatus={handleUpdateStatus}
        onUpdateProgress={handleUpdateProgress}
        onUpdateShelf={handleUpdateShelf}
        onDeleteBook={handleDeleteBook}
        onUpdateNotes={handleUpdateNotes}
        onUpdateTags={handleUpdateTags}
        onAddReadingSession={handleAddReadingSession}
      />

      {/* Share Export Modal (Image 13) */}
      <ShareModal
        shelf={activeShareShelf || undefined}
        books={books}
        isOpen={isShareModalOpen}
        onClose={() => {
          setIsShareModalOpen(false);
          setActiveShareShelf(null);
        }}
      />

      {/* Phase 0 Spike Accuracy Benchmark Dashboard */}
      {isSpikeDashboardOpen && (
        <SpikeAccuracyDashboard
          onClose={() => setIsSpikeDashboardOpen(false)}
          onTestSampleInScanner={(sample) => {
            setIsSpikeDashboardOpen(false);
            handleCapture(sample.imageUrl, sample);
          }}
        />
      )}

      {/* Onboarding & Guide Modal (Images 7, 15, 21, 19) */}
      <OnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        onStartScanning={() => setIsScannerOpen(true)}
      />
    </div>
  );
}
