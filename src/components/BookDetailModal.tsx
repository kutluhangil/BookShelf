import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Book, Shelf, ReadingStatus } from '../types';
import { ConfidenceBadge } from './ConfidenceBadge';
import { AmbientReadingMode } from './AmbientReadingMode';
import { QuoteScannerModal } from './QuoteScannerModal';
import { haptic } from '../services/haptics';
import { BookCover } from './BookCover';
import { ModalShell } from './ModalShell';
import { useI18n } from '../i18n/I18nProvider';

interface BookDetailModalProps {
  book: Book | null;
  shelves: Shelf[];
  isOpen: boolean;
  onClose: () => void;
  onUpdateStatus: (bookId: string, status: ReadingStatus) => void;
  onUpdateProgress?: (bookId: string, progress: number) => void;
  onUpdateCurrentPage?: (bookId: string, page: number) => void;
  onUpdatePageCount?: (bookId: string, pageCount: number) => void;
  onUpdateShelf: (bookId: string, shelfId: string) => void;
  onUpdateCoordinate?: (bookId: string, shelfId: string, x: number | undefined, y: number | undefined) => void;
  onDeleteBook: (bookId: string) => void;
  onUpdateNotes?: (bookId: string, notes: string) => void;
  onUpdateQuotes?: (bookId: string, quotes: string[]) => void;
  onUpdateLending?: (bookId: string, lentTo?: string, lentAt?: string, lentDueAt?: string) => void;
  onUpdateTags?: (bookId: string, tags: string[]) => void;
  onUpdateRating?: (bookId: string, rating: number | undefined) => void;
  onAddReadingSession?: (bookId: string, durationSeconds: number) => void;
}

export const BookDetailModal: React.FC<BookDetailModalProps> = ({
  book,
  shelves,
  isOpen,
  onClose,
  onUpdateStatus,
  onUpdateProgress,
  onUpdateCurrentPage,
  onUpdatePageCount,
  onUpdateShelf,
  onUpdateCoordinate,
  onDeleteBook,
  onUpdateNotes,
  onUpdateQuotes,
  onUpdateLending,
  onUpdateTags,
  onUpdateRating,
  onAddReadingSession,
}) => {
  const { t, locale } = useI18n();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [newTag, setNewTag] = useState('');
  
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isAmbientMode, setIsAmbientMode] = useState(false);
  const [isQuoteScannerOpen, setIsQuoteScannerOpen] = useState(false);
  const [lentToInput, setLentToInput] = useState('');
  const [lentDueInput, setLentDueInput] = useState('');
  const [pageCountDraft, setPageCountDraft] = useState('');

  // Sync lentToInput when book changes
  useEffect(() => {
    if (book) {
      setLentToInput(book.lentTo || '');
      setLentDueInput(book.lentDueAt ? book.lentDueAt.slice(0, 10) : '');
      setPageCountDraft(book.pageCount ? String(book.pageCount) : '');
    }
  }, [book]);

  // Auto-save timer when modal closes
  useEffect(() => {
    if (!isOpen) {
      if (isTimerActive && elapsedSeconds > 60 && book) {
        onAddReadingSession?.(book.id, elapsedSeconds);
      }
      setIsTimerActive(false);
      setElapsedSeconds(0);
      setIsAmbientMode(false);
      setShowDeleteConfirm(false);
    }
  }, [isOpen, isTimerActive, elapsedSeconds, book, onAddReadingSession]);

  // Timer interval
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerActive) {
      interval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerActive]);

  const formatTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleToggleTimer = () => {
    haptic.selectionClick();
    if (isTimerActive) {
      setIsTimerActive(false);
      if (elapsedSeconds > 0 && book) {
        onAddReadingSession?.(book.id, elapsedSeconds);
      }
      setElapsedSeconds(0);
    } else {
      setIsTimerActive(true);
      setElapsedSeconds(0);
    }
  };

  const estimatedSecondsRemaining = useMemo(() => {
    if (!book || !book.readingSessions || book.readingSessions.length === 0) return null;
    const progress = book.progress ?? 0;
    if (progress === 0 || progress >= 100) return null;
    
    const totalSessionSeconds = book.readingSessions.reduce((acc, s) => acc + s.durationSeconds, 0);
    if (totalSessionSeconds === 0) return null;
    
    const secondsPerPercent = totalSessionSeconds / progress;
    const remainingPercent = 100 - progress;
    return Math.round(secondsPerPercent * remainingPercent);
  }, [book]);

  const formatEstimatedTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    return h > 0 ? t.bookDetail.timeLeftHours(h, m) : t.bookDetail.timeLeftMinutes(m);
  };

  if (!isOpen || !book) return null;

  const currentShelf = shelves.find((s) => s.id === book.shelfId);

  return (
    <>
      <AnimatePresence>
      <ModalShell isOpen={isOpen} onClose={onClose} label={t.bookDetail.dialogLabel(book.title)} closeOnBackdrop={false} className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/85 backdrop-blur-md"
        />

        {/* Modal Window (Image 1 archetype) */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative z-10 w-full max-w-[560px] max-h-[92vh] bg-[#1C1916] rounded-2xl hairline-border flex flex-col shadow-[0_16px_48px_rgba(0,0,0,0.9)] overflow-hidden"
        >
          {/* Header Bar */}
          <div className="p-4 sm:px-6 border-b border-[#3A332A] flex justify-between items-center bg-[#181512]">
            <div className="flex items-center gap-2">
              <ConfidenceBadge level={book.confidence} score={book.score} showScore />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  haptic.lightImpact();
                  setShowDeleteConfirm(!showDeleteConfirm);
                }}
                className="text-[#A79C8C] hover:text-[#FFB4AB] p-1.5 rounded-lg hover:bg-[#93000A]/20 transition-colors"
                title={t.bookDetail.removeVolume}
               aria-label={t.bookDetail.removeVolume}>
                <span className="material-symbols-outlined text-[20px]" aria-hidden="true">delete</span>
              </button>
              <button
                onClick={() => {
                  haptic.lightImpact();
                  onClose();
                }}
                className="text-[#A79C8C] hover:text-[#F4EFE6] p-1.5 rounded-lg hover:bg-[#262119] transition-colors"
                title={t.common.close}
               aria-label={t.common.close}>
                <span className="material-symbols-outlined text-[22px]" aria-hidden="true">close</span>
              </button>
            </div>
          </div>

          {/* Delete confirmation banner */}
          {showDeleteConfirm && (
            <div className="bg-[#93000A]/30 border-b border-[#A9503F]/50 p-3 px-6 flex items-center justify-between">
              <span className="text-[12px] font-sans-inter text-[#FFB4AB]">
                {t.bookDetail.removeConfirm(book.title)}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    haptic.heavyImpact();
                    onDeleteBook(book.id);
                  }}
                  className="px-2.5 py-1 bg-[#A9503F] text-white rounded text-[11px] font-mono-ibm font-semibold uppercase"
                >
                  {t.bookDetail.confirmDelete}
                </button>
                <button
                  onClick={() => {
                    haptic.lightImpact();
                    setShowDeleteConfirm(false);
                  }}
                  className="px-2.5 py-1 text-[#A79C8C] text-[11px] font-mono-ibm"
                >
                  {t.common.cancel}
                </button>
              </div>
            </div>
          )}

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto no-scrollbar p-5 sm:p-7 space-y-6">
            {/* Book Presentation Banner (Image 1) */}
            <div className="flex flex-col sm:flex-row gap-5 items-center sm:items-start">
              {/* Cover Art with subtle brass edge glow */}
              <div className="w-36 sm:w-40 aspect-[2/3] rounded-lg overflow-hidden shrink-0 hairline-border shadow-[0_8px_24px_rgba(0,0,0,0.7)] brass-glow bg-[#12100E] relative">
                <BookCover
                  coverUrl={book.coverUrl}
                  title={book.title}
                  author={book.author}
                  spineColor={book.spineColor}
                  className="w-full h-full"
                  fallbackTextSize={13}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
              </div>

              {/* Core Metadata */}
              <div className="flex-1 text-center sm:text-left min-w-0">
                <h2 className="font-serif-literata text-[22px] sm:text-[26px] text-[#F4EFE6] font-semibold leading-snug mb-1">
                  {book.title}
                </h2>
                <p className="font-sans-inter text-[15px] text-[#C9963F] font-medium mb-3">
                  {book.author}
                </p>

                {/* Metadata Pills */}
                <div className="flex flex-wrap justify-center sm:justify-start gap-1.5 font-mono-ibm text-[11px] text-[#A79C8C]">
                  <span className="px-2 py-0.5 rounded bg-[#262119] hairline-border">
                    {book.publishYear}
                  </span>
                  {onUpdatePageCount ? (
                    <label className="px-2 py-0.5 rounded bg-[#262119] hairline-border flex items-center gap-1">
                      <input
                        type="number"
                        min={0}
                        value={pageCountDraft}
                        onChange={(event) => setPageCountDraft(event.target.value)}
                        onBlur={() => {
                          const parsed = Number(pageCountDraft);
                          if (Number.isFinite(parsed) && parsed >= 0 && parsed !== book.pageCount) {
                            onUpdatePageCount(book.id, parsed);
                          }
                        }}
                        className="w-12 bg-transparent text-[#F4EFE6] focus:outline-none text-right"
                        aria-label={t.bookDetail.totalPageCount}
                      />
                      <span>{t.bookDetail.pages}</span>
                    </label>
                  ) : (
                    <span className="px-2 py-0.5 rounded bg-[#262119] hairline-border">{t.bookDetail.pageCount(book.pageCount)}</span>
                  )}
                  <span className="px-2 py-0.5 rounded bg-[#262119] hairline-border truncate max-w-[150px]">
                    {book.publisher}
                  </span>
                </div>

                {/* Reading Status Selector & Progress Slider */}
                <div className="mt-4 pt-3 border-t border-[#3A332A]/70 flex flex-col gap-3">
                  <div className="flex items-center justify-center sm:justify-start gap-2">
                    <span className="font-mono-ibm text-[10px] text-[#9C8F7E] uppercase tracking-wider">
                      {t.bookDetail.statusLabel}
                    </span>
                    <select
                      value={book.status}
                      onChange={(e) => {
                        haptic.selectionClick();
                        onUpdateStatus(book.id, e.target.value as ReadingStatus);
                      }}
                      className="bg-[#262119] text-[#F4EFE6] hairline-border text-[12px] font-mono-ibm rounded px-2.5 py-1 focus:outline-none focus:border-[#C9963F]"
                    >
                      <option value="unread">{t.bookDetail.statusOptions.unread}</option>
                      <option value="reading">{t.bookDetail.statusOptions.reading}</option>
                      <option value="read">{t.bookDetail.statusOptions.read}</option>
                    </select>
                  </div>

                  {/* Completion Percentage Progress Bar & Control */}
                  {onUpdateProgress && (
                    <div className="bg-[#151311] p-3 rounded-lg border border-[#3A332A]/70 flex flex-col gap-2">
                      <div className="flex justify-between items-center text-[11px] font-mono-ibm">
                        <span className="text-[#A79C8C] uppercase tracking-wider text-[10px]">
                          {t.bookDetail.completionProgress}
                        </span>
                        <div className="flex items-center gap-2">
                          {estimatedSecondsRemaining && (
                            <span className="text-[#9C8F7E] text-[10px] bg-[#262119] px-1.5 py-0.5 rounded border border-[#3A332A]" title={t.bookDetail.estimateTooltip}>
                              {formatEstimatedTime(estimatedSecondsRemaining)}
                            </span>
                          )}
                          <span className="font-bold text-[#F5BD62]">
                            {typeof book.progress === 'number' ? `${book.progress}%` : '0%'}
                          </span>
                        </div>
                      </div>
                      <div className="w-full h-2 bg-[#262119] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            (book.progress ?? 0) >= 100
                              ? 'bg-[#6E8F6A]'
                              : 'bg-gradient-to-r from-[#C9963F] to-[#F5BD62]'
                          }`}
                          style={{ width: `${book.progress ?? 0}%` }}
                        />
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="1"
                        value={book.progress ?? 0}
                        onChange={(e) => {
                          onUpdateProgress(book.id, parseInt(e.target.value, 10));
                        }}
                        className="w-full accent-[#C9963F] cursor-pointer h-1.5"
                        aria-label={t.bookDetail.progressAria}
                      />

                      {onUpdateCurrentPage && book.pageCount > 0 && (
                        <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#3A332A]/70">
                          <span className="font-mono-ibm text-[10px] text-[#A79C8C] uppercase tracking-wider">
                            {t.bookDetail.currentPage}
                          </span>
                          <div className="flex items-center gap-1 font-mono-ibm text-[12px] text-[#F4EFE6]">
                            <input
                              type="number"
                              min={0}
                              max={book.pageCount}
                              value={book.currentPage ?? Math.round((book.pageCount * (book.progress ?? 0)) / 100)}
                              onChange={(event) => onUpdateCurrentPage(book.id, Number(event.target.value))}
                              className="w-16 bg-[#12100E] border border-[#3A332A] rounded px-2 py-1 text-right focus:outline-none focus:border-[#C9963F]"
                              aria-label={t.bookDetail.currentPage}
                            />
                            <span className="text-[#A79C8C]">/ {book.pageCount}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Proof of Capture Crop — only meaningful for scanned volumes */}
            {(book.proofOfCaptureUrl || book.spineCropUrl) && (
            <div className="bg-[#151311] rounded-xl p-3.5 hairline-border space-y-2">
              <div className="flex justify-between items-center text-[11px] font-mono-ibm text-[#A79C8C]">
                <span className="tracking-wider flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[15px] text-[#C9963F]" aria-hidden="true">camera_alt</span>
                  <span>{t.bookDetail.proofOfCapture}</span>
                </span>
                <span className="text-[#9C8F7E]">{t.bookDetail.localRaw}</span>
              </div>

              <div className="w-full h-24 rounded-lg overflow-hidden relative bg-[#100E0C] border border-[#3A332A]">
                <img
                  src={book.proofOfCaptureUrl || book.spineCropUrl}
                  alt={t.bookDetail.proofAlt}
                  className="w-full h-full object-cover grayscale-[30%]"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-black/30 pointer-events-none" />
                <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/70 backdrop-blur-sm rounded text-[9px] font-mono-ibm text-[#C9963F] border border-[#C9963F]/40">
                  {t.bookDetail.originalBbox}
                </div>
              </div>
            </div>
            )}

            {/* Shelf Assignment */}
            <div className="flex flex-col gap-1.5">
              <label className="font-mono-ibm text-[11px] text-[#A79C8C] uppercase tracking-wider">
                {t.bookDetail.assignedShelf}
              </label>
              <select
                value={book.shelfId}
                onChange={(e) => {
                  haptic.selectionClick();
                  onUpdateShelf(book.id, e.target.value);
                }}
                className="w-full bg-[#262119] text-[#F4EFE6] hairline-border text-[13px] font-sans-inter rounded-lg p-2.5 focus:outline-none focus:border-[#C9963F]"
              >
                {shelves.map((s) => (
                  <option key={s.id} value={s.id}>
                    {t.bookDetail.shelfOption(s.name, s.volumeCount)}
                  </option>
                ))}
              </select>
            </div>

            {currentShelf?.layout === 'coordinate' && (
              <div className="flex flex-col gap-1.5">
                <label className="font-mono-ibm text-[11px] text-[#A79C8C] uppercase tracking-wider">
                  {t.bookDetail.binCoordinates}
                </label>
                <div className="flex gap-3">
                  <div className="flex-1 flex items-center gap-2 bg-[#262119] hairline-border rounded-lg p-1.5 px-3">
                    <span className="font-mono-ibm text-[11px] text-[#A79C8C]">{t.bookDetail.colLabel}</span>
                    <input
                      type="number"
                      min={1}
                      max={currentShelf.gridDimensions?.cols || 10}
                      value={currentShelf.coordinates?.[book.id]?.x || ''}
                      onChange={(e) => {
                        if (onUpdateCoordinate) {
                          const val = e.target.value;
                          if (val === '') {
                            onUpdateCoordinate(book.id, currentShelf.id, undefined, undefined);
                          } else {
                            const x = parseInt(val);
                            const currentY = currentShelf.coordinates?.[book.id]?.y || 1;
                            onUpdateCoordinate(book.id, currentShelf.id, x, currentY);
                          }
                        }
                      }}
                      className="w-full bg-transparent text-[#F4EFE6] text-[13px] font-sans-inter focus:outline-none text-right"
                      placeholder={t.bookDetail.coordinatePlaceholder}
                    />
                  </div>
                  <div className="flex-1 flex items-center gap-2 bg-[#262119] hairline-border rounded-lg p-1.5 px-3">
                    <span className="font-mono-ibm text-[11px] text-[#A79C8C]">{t.bookDetail.rowLabel}</span>
                    <input
                      type="number"
                      min={1}
                      max={currentShelf.gridDimensions?.rows || 10}
                      value={currentShelf.coordinates?.[book.id]?.y || ''}
                      onChange={(e) => {
                        if (onUpdateCoordinate) {
                          const val = e.target.value;
                          if (val === '') {
                            onUpdateCoordinate(book.id, currentShelf.id, undefined, undefined);
                          } else {
                            const y = parseInt(val);
                            const currentX = currentShelf.coordinates?.[book.id]?.x || 1;
                            onUpdateCoordinate(book.id, currentShelf.id, currentX, y);
                          }
                        }
                      }}
                      className="w-full bg-transparent text-[#F4EFE6] text-[13px] font-sans-inter focus:outline-none text-right"
                      placeholder={t.bookDetail.coordinatePlaceholder}
                    />
                  </div>
                </div>
                <p className="text-[#A79C8C] text-[11px] mt-1 leading-snug">
                  {t.bookDetail.coordinateHint}
                </p>
              </div>
            )}

            {/* Reading Timeline */}
            {(book.readHistory?.length || book.readingSessions?.length) ? (
              <div className="space-y-2">
                <h3 className="font-mono-ibm text-[11px] text-[#A79C8C] uppercase tracking-wider">
                  {t.bookDetail.readingHistory}
                </h3>
                <div className="bg-[#151311] rounded-xl p-3.5 hairline-border">
                  <div className="relative pl-3 space-y-4 before:absolute before:inset-y-0 before:left-[5px] before:w-[2px] before:bg-[#3A332A]">
                    {book.readHistory && book.readHistory.map((dateStr, idx) => (
                      <div key={`hist-${idx}`} className="relative flex items-center gap-3">
                        <div className="absolute -left-[14px] w-2.5 h-2.5 rounded-full bg-[#C9963F] border-2 border-[#151311]" />
                        <span className="font-mono-ibm text-[12px] text-[#D4CDA8]">
                          {t.bookDetail.completedOn(new Date(dateStr).toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' }))}
                        </span>
                      </div>
                    ))}
                    {book.readingSessions && book.readingSessions.map((session, idx) => (
                      <div key={`sess-${idx}`} className="relative flex items-center gap-3">
                        <div className="absolute -left-[14px] w-2.5 h-2.5 rounded-full bg-[#6B8E23] border-2 border-[#151311]" />
                        <span className="font-mono-ibm text-[12px] text-[#D4CDA8]">
                          {t.bookDetail.readSession(
                            Math.round(session.durationSeconds / 60),
                            new Date(session.date).toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' })
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            {/* Reading Session Timer */}
            {onAddReadingSession && (
              <div className="bg-[#151311] rounded-xl p-4 hairline-border border-[#C9963F]/20 space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="font-mono-ibm text-[11px] text-[#A79C8C] uppercase tracking-wider flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[14px] text-[#C9963F]" aria-hidden="true">timer</span>
                    {t.bookDetail.currentSitting}
                  </h3>
                  <div className={`font-mono-ibm text-[16px] font-bold ${isTimerActive ? 'text-[#C9963F] animate-pulse' : 'text-[#F4EFE6]'}`}>
                    {formatTime(elapsedSeconds)}
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={handleToggleTimer}
                    className={`flex-1 py-2.5 rounded-lg font-mono-ibm text-[12px] font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 ${
                      isTimerActive 
                        ? 'bg-[#3A1D1D] text-[#FF6B6B] hover:bg-[#4A2525]' 
                        : 'bg-[#262119] text-[#C9963F] hover:bg-[#3A332A]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                      {isTimerActive ? 'stop_circle' : 'play_circle'}
                    </span>
                    {isTimerActive ? t.bookDetail.stopSession : t.bookDetail.startSession}
                  </button>
                  {isTimerActive && (
                    <button
                      onClick={() => {
                        haptic.selectionClick();
                        setIsAmbientMode(true);
                      }}
                      className="px-3 py-2.5 bg-[#262119] text-[#A79C8C] hover:text-[#C9963F] hover:bg-[#3A332A] rounded-lg transition-colors flex items-center justify-center"
                      title={t.bookDetail.enterAmbient}
                     aria-label={t.bookDetail.enterAmbient}>
                      <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                        dark_mode
                      </span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Ambient Reading Mode Overlay */}
            {book && (
              <AmbientReadingMode
                book={book}
                elapsedSeconds={elapsedSeconds}
                isActive={isAmbientMode}
                onStop={() => setIsAmbientMode(false)}
              />
            )}

            {/* Description / Synopsis in Literata */}
            <div className="space-y-1.5">
              <h3 className="font-mono-ibm text-[11px] text-[#A79C8C] uppercase tracking-wider">
                {t.bookDetail.synopsis}
              </h3>
              <div className="font-serif-literata text-[14px] leading-relaxed text-[#D4CDA8] bg-[#151311] p-4 rounded-xl hairline-border">
                {book.description || t.bookDetail.noDescription}
              </div>
            </div>

            {/* Reader Rating */}
            {onUpdateRating && (
              <div className="space-y-1.5">
                <h3 className="font-mono-ibm text-[11px] text-[#A79C8C] uppercase tracking-wider flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[14px] text-[#C9963F]" aria-hidden="true">star</span>
                  {t.bookDetail.yourRating}
                </h3>
                <div className="bg-[#151311] p-3 rounded-xl hairline-border flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      onClick={() => {
                        haptic.selectionClick();
                        onUpdateRating(book.id, book.rating === value ? undefined : value);
                      }}
                      className="text-[26px] leading-none transition-transform hover:scale-110"
                      title={t.bookDetail.starTitle(value)}
                      aria-label={t.bookDetail.rateAria(value)}
                    >
                      <span className={(book.rating ?? 0) >= value ? 'text-[#C9963F]' : 'text-[#3A332A]'}>★</span>
                    </button>
                  ))}
                  <span className="ml-2 font-mono-ibm text-[11px] text-[#A79C8C]">
                    {book.rating ? t.bookDetail.ratingValue(book.rating) : t.bookDetail.notRated}
                  </span>
                </div>
              </div>
            )}

            {/* Custom Tags */}
            {onUpdateTags && (
              <div className="space-y-1.5">
                <h3 className="font-mono-ibm text-[11px] text-[#A79C8C] uppercase tracking-wider flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[14px] text-[#C9963F]" aria-hidden="true">sell</span>
                  {t.bookDetail.customTags}
                </h3>
                <div className="bg-[#151311] p-3 rounded-xl hairline-border space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {book.tags && book.tags.length > 0 ? (
                      book.tags.map((tag, idx) => (
                        <span key={idx} className="inline-flex items-center gap-1 bg-[#262119] text-[#F4EFE6] px-2.5 py-1 rounded-md text-[12px] font-sans-inter">
                          {tag}
                          <button
                            onClick={() => {
                              const newTags = book.tags!.filter((_, i) => i !== idx);
                              onUpdateTags(book.id, newTags);
                            }}
                            aria-label={t.bookDetail.removeTag(tag)}
                            className="text-[#A79C8C] hover:text-[#C9963F] focus:outline-none transition-colors"
                          >
                            <span className="material-symbols-outlined text-[14px]" aria-hidden="true">close</span>
                          </button>
                        </span>
                      ))
                    ) : (
                      <span className="text-[12px] font-sans-inter text-[#A79C8C] italic">{t.bookDetail.noTags}</span>
                    )}
                  </div>
                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (newTag.trim()) {
                        const trimmed = newTag.trim();
                        const currentTags = book.tags || [];
                        if (!currentTags.includes(trimmed)) {
                          onUpdateTags(book.id, [...currentTags, trimmed]);
                        }
                        setNewTag('');
                      }
                    }}
                    className="flex gap-2"
                  >
                    <input
                      type="text"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      placeholder={t.bookDetail.addTagPlaceholder}
                      className="flex-1 bg-[#12100E] text-[#F4EFE6] text-[13px] font-sans-inter rounded-lg px-3 py-1.5 border border-[#3A332A] focus:border-[#C9963F] focus:outline-none placeholder:text-[#A79C8C]/50"
                    />
                    <button
                      type="submit"
                      disabled={!newTag.trim()}
                      className="bg-[#262119] hover:bg-[#3A332A] text-[#C9963F] px-3 py-1.5 rounded-lg text-[11px] font-mono-ibm font-bold uppercase tracking-wider disabled:opacity-50 transition-colors"
                    >
                      {t.bookDetail.add}
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* Lending Tracker */}
            {onUpdateLending && (
              <div className="space-y-1.5">
                <h3 className="font-mono-ibm text-[11px] text-[#A79C8C] uppercase tracking-wider flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[14px] text-[#C9963F]" aria-hidden="true">handshake</span>
                  {t.bookDetail.lendingTracker}
                </h3>
                <div className="bg-[#151311] p-4 rounded-xl hairline-border space-y-3">
                  {book.lentTo ? (
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[13px] text-[#F4EFE6] font-sans-inter">
                          {t.bookDetail.lentTo} <span className="font-bold text-[#C9963F]">{book.lentTo}</span>
                        </p>
                        {book.lentAt && (
                          <p className="text-[11px] text-[#A79C8C] font-mono-ibm mt-0.5">
                            {t.bookDetail.lentOn(new Date(book.lentAt).toLocaleDateString(locale))}
                          </p>
                        )}
                        {book.lentDueAt && (
                          <p
                            className={`text-[11px] font-mono-ibm mt-0.5 ${
                              new Date(book.lentDueAt).getTime() < Date.now() ? 'text-[#FF6B6B]' : 'text-[#A79C8C]'
                            }`}
                          >
                            {t.bookDetail.dueOn(new Date(book.lentDueAt).toLocaleDateString(locale))}
                            {new Date(book.lentDueAt).getTime() < Date.now() ? t.bookDetail.overdueSuffix : ''}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => onUpdateLending(book.id, undefined, undefined, undefined)}
                        className="px-3 py-1.5 bg-[#3A1D1D] text-[#FF6B6B] hover:bg-[#4A2525] rounded-lg text-[11px] font-mono-ibm font-bold uppercase tracking-wider transition-colors shrink-0"
                      >
                        {t.bookDetail.returned}
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <input
                        type="text"
                        value={lentToInput}
                        onChange={(e) => setLentToInput(e.target.value)}
                        placeholder={t.bookDetail.friendPlaceholder}
                        className="bg-[#12100E] text-[#F4EFE6] text-[13px] font-sans-inter rounded-lg px-3 py-1.5 border border-[#3A332A] focus:border-[#C9963F] focus:outline-none placeholder:text-[#A79C8C]/50"
                      />
                      <div className="flex gap-2 items-center">
                        <label className="flex-1 flex items-center gap-2 bg-[#12100E] border border-[#3A332A] rounded-lg px-3 py-1.5">
                          <span className="font-mono-ibm text-[10px] text-[#A79C8C] uppercase tracking-wider">{t.bookDetail.due}</span>
                          <input
                            type="date"
                            value={lentDueInput}
                            onChange={(e) => setLentDueInput(e.target.value)}
                            className="flex-1 bg-transparent text-[#F4EFE6] text-[12px] font-mono-ibm focus:outline-none"
                            aria-label={t.bookDetail.dueDateAria}
                          />
                        </label>
                        <button
                          onClick={() => {
                            if (!lentToInput.trim()) return;
                            onUpdateLending(
                              book.id,
                              lentToInput.trim(),
                              new Date().toISOString(),
                              lentDueInput ? new Date(lentDueInput).toISOString() : undefined
                            );
                          }}
                          disabled={!lentToInput.trim()}
                          className="bg-[#262119] hover:bg-[#3A332A] text-[#C9963F] px-3 py-1.5 rounded-lg text-[11px] font-mono-ibm font-bold uppercase tracking-wider disabled:opacity-50 transition-colors"
                        >
                          {t.bookDetail.lend}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* AI Scanned Quotes */}
            {onUpdateQuotes && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <h3 className="font-mono-ibm text-[11px] text-[#A79C8C] uppercase tracking-wider flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[14px] text-[#C9963F]" aria-hidden="true">format_quote</span>
                    {t.bookDetail.scannedQuotes}
                  </h3>
                  <button
                    onClick={() => {
                      haptic.lightImpact();
                      setIsQuoteScannerOpen(true);
                    }}
                    className="flex items-center gap-1 text-[11px] text-[#C9963F] hover:text-[#F4EFE6] transition-colors"
                  >
                    <span className="material-symbols-outlined text-[14px]" aria-hidden="true">document_scanner</span>
                    {t.bookDetail.scanNew}
                  </button>
                </div>
                
                {book.quotes && book.quotes.length > 0 ? (
                  <div className="space-y-2">
                    {book.quotes.map((quote, idx) => (
                      <div key={idx} className="bg-[#151311] p-4 rounded-xl hairline-border relative group">
                        <p className="font-serif-literata text-[13px] leading-relaxed text-[#D4CDA8] italic">"{quote}"</p>
                        <button
                          onClick={() => {
                            const newQuotes = book.quotes!.filter((_, i) => i !== idx);
                            onUpdateQuotes(book.id, newQuotes);
                          }}
                          aria-label={t.bookDetail.removeQuote}
                          className="absolute top-2 right-2 w-6 h-6 bg-[#2C251D] text-[#A79C8C] hover:text-[#FF6B6B] rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <span className="material-symbols-outlined text-[14px]" aria-hidden="true">delete</span>
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-[#151311] p-4 rounded-xl hairline-border text-center">
                    <p className="text-[12px] text-[#A79C8C] font-sans-inter">{t.bookDetail.noQuotes}</p>
                  </div>
                )}
              </div>
            )}

            {/* Personal Notes */}
            {onUpdateNotes && (
              <div className="space-y-1.5">
                <h3 className="font-mono-ibm text-[11px] text-[#A79C8C] uppercase tracking-wider flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[14px] text-[#C9963F]" aria-hidden="true">edit_note</span>
                  {t.bookDetail.personalNotes}
                </h3>
                <textarea
                  value={book.notes || ''}
                  onChange={(e) => onUpdateNotes(book.id, e.target.value)}
                  placeholder={t.bookDetail.notesPlaceholder}
                  className="w-full bg-[#151311] text-[#F4EFE6] font-sans-inter text-[13px] leading-relaxed rounded-xl p-4 hairline-border focus:outline-none focus:border-[#C9963F] min-h-[120px] resize-y placeholder:text-[#A79C8C]/50"
                />
              </div>
            )}

            {/* Archival Identifier Footer */}
            <div className="pt-2 border-t border-[#3A332A] flex justify-between items-center text-[10px] font-mono-ibm text-[#9C8F7E]">
              <span>{t.bookDetail.isbn(book.isbn || t.common.notAvailable)}</span>
              <span>{t.bookDetail.added(new Date(book.addedAt).toLocaleDateString(locale))}</span>
            </div>
          </div>
        </motion.div>
      </ModalShell>
      </AnimatePresence>

      {/* The quote scanner brings its own AnimatePresence; keeping it inside the
          modal's one gave that presence two unkeyed children, which React reports
          as a duplicate key. */}
      <QuoteScannerModal
        isOpen={isQuoteScannerOpen}
        onClose={() => setIsQuoteScannerOpen(false)}
        onScanComplete={(text) => {
          if (onUpdateQuotes) {
            const currentQuotes = book.quotes || [];
            onUpdateQuotes(book.id, [...currentQuotes, text]);
          }
        }}
      />
    </>
  );
};
