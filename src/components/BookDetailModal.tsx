import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Book, Shelf, ReadingStatus } from '../types';
import { ConfidenceBadge } from './ConfidenceBadge';
import { haptic } from '../services/haptics';

interface BookDetailModalProps {
  book: Book | null;
  shelves: Shelf[];
  isOpen: boolean;
  onClose: () => void;
  onUpdateStatus: (bookId: string, status: ReadingStatus) => void;
  onUpdateProgress?: (bookId: string, progress: number) => void;
  onUpdateShelf: (bookId: string, shelfId: string) => void;
  onUpdateCoordinate?: (bookId: string, shelfId: string, x: number | undefined, y: number | undefined) => void;
  onDeleteBook: (bookId: string) => void;
  onUpdateNotes?: (bookId: string, notes: string) => void;
  onUpdateTags?: (bookId: string, tags: string[]) => void;
  onAddReadingSession?: (bookId: string, durationSeconds: number) => void;
}

export const BookDetailModal: React.FC<BookDetailModalProps> = ({
  book,
  shelves,
  isOpen,
  onClose,
  onUpdateStatus,
  onUpdateProgress,
  onUpdateShelf,
  onUpdateCoordinate,
  onDeleteBook,
  onUpdateNotes,
  onUpdateTags,
  onAddReadingSession,
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [newTag, setNewTag] = useState('');
  
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Auto-save timer when modal closes
  useEffect(() => {
    if (!isOpen) {
      if (isTimerActive && elapsedSeconds > 60 && book) {
        onAddReadingSession?.(book.id, elapsedSeconds);
      }
      setIsTimerActive(false);
      setElapsedSeconds(0);
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
    if (h > 0) return `~${h}h ${m}m left`;
    return `~${m}m left`;
  };

  if (!isOpen || !book) return null;

  const currentShelf = shelves.find((s) => s.id === book.shelfId);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
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
                title="Remove Volume"
              >
                <span className="material-symbols-outlined text-[20px]">delete</span>
              </button>
              <button
                onClick={() => {
                  haptic.lightImpact();
                  onClose();
                }}
                className="text-[#A79C8C] hover:text-[#F4EFE6] p-1.5 rounded-lg hover:bg-[#262119] transition-colors"
                title="Close"
              >
                <span className="material-symbols-outlined text-[22px]">close</span>
              </button>
            </div>
          </div>

          {/* Delete confirmation banner */}
          {showDeleteConfirm && (
            <div className="bg-[#93000A]/30 border-b border-[#A9503F]/50 p-3 px-6 flex items-center justify-between">
              <span className="text-[12px] font-sans-inter text-[#FFB4AB]">
                Remove "{book.title}" from library?
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    haptic.heavyImpact();
                    onDeleteBook(book.id);
                  }}
                  className="px-2.5 py-1 bg-[#A9503F] text-white rounded text-[11px] font-mono-ibm font-semibold uppercase"
                >
                  Confirm Delete
                </button>
                <button
                  onClick={() => {
                    haptic.lightImpact();
                    setShowDeleteConfirm(false);
                  }}
                  className="px-2.5 py-1 text-[#A79C8C] text-[11px] font-mono-ibm"
                >
                  Cancel
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
                <img
                  src={book.coverUrl}
                  alt={book.title}
                  className="w-full h-full object-cover"
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
                  <span className="px-2 py-0.5 rounded bg-[#262119] hairline-border">
                    {book.pageCount} PAGES
                  </span>
                  <span className="px-2 py-0.5 rounded bg-[#262119] hairline-border truncate max-w-[150px]">
                    {book.publisher}
                  </span>
                </div>

                {/* Reading Status Selector & Progress Slider */}
                <div className="mt-4 pt-3 border-t border-[#3A332A]/70 flex flex-col gap-3">
                  <div className="flex items-center justify-center sm:justify-start gap-2">
                    <span className="font-mono-ibm text-[10px] text-[#9C8F7E] uppercase tracking-wider">
                      STATUS:
                    </span>
                    <select
                      value={book.status}
                      onChange={(e) => {
                        haptic.selectionClick();
                        onUpdateStatus(book.id, e.target.value as ReadingStatus);
                      }}
                      className="bg-[#262119] text-[#F4EFE6] hairline-border text-[12px] font-mono-ibm rounded px-2.5 py-1 focus:outline-none focus:border-[#C9963F]"
                    >
                      <option value="unread">Unread</option>
                      <option value="reading">Currently Reading</option>
                      <option value="read">Finished / Read</option>
                    </select>
                  </div>

                  {/* Completion Percentage Progress Bar & Control */}
                  {onUpdateProgress && (
                    <div className="bg-[#151311] p-3 rounded-lg border border-[#3A332A]/70 flex flex-col gap-2">
                      <div className="flex justify-between items-center text-[11px] font-mono-ibm">
                        <span className="text-[#A79C8C] uppercase tracking-wider text-[10px]">
                          COMPLETION PROGRESS
                        </span>
                        <div className="flex items-center gap-2">
                          {estimatedSecondsRemaining && (
                            <span className="text-[#9C8F7E] text-[10px] bg-[#262119] px-1.5 py-0.5 rounded border border-[#3A332A]" title="Estimated Time Remaining based on your reading pace">
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
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Proof of Capture Crop (Signature Feature from Image 1) */}
            <div className="bg-[#151311] rounded-xl p-3.5 hairline-border space-y-2">
              <div className="flex justify-between items-center text-[11px] font-mono-ibm text-[#A79C8C]">
                <span className="tracking-wider flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[15px] text-[#C9963F]">camera_alt</span>
                  <span>PROOF OF CAPTURE (SHELF CROP)</span>
                </span>
                <span className="text-[#9C8F7E]">LOCAL RAW</span>
              </div>

              <div className="w-full h-24 rounded-lg overflow-hidden relative bg-[#100E0C] border border-[#3A332A]">
                <img
                  src={book.proofOfCaptureUrl || book.spineCropUrl}
                  alt="Proof of capture"
                  className="w-full h-full object-cover grayscale-[30%]"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-black/30 pointer-events-none" />
                <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/70 backdrop-blur-sm rounded text-[9px] font-mono-ibm text-[#C9963F] border border-[#C9963F]/40">
                  ORIGINAL PHYSICAL BBOX
                </div>
              </div>
            </div>

            {/* Shelf Assignment */}
            <div className="flex flex-col gap-1.5">
              <label className="font-mono-ibm text-[11px] text-[#A79C8C] uppercase tracking-wider">
                ASSIGNED SHELF
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
                    {s.name} ({s.volumeCount} vols)
                  </option>
                ))}
              </select>
            </div>

            {currentShelf?.layout === 'coordinate' && (
              <div className="flex flex-col gap-1.5">
                <label className="font-mono-ibm text-[11px] text-[#A79C8C] uppercase tracking-wider">
                  BIN COORDINATES (X, Y)
                </label>
                <div className="flex gap-3">
                  <div className="flex-1 flex items-center gap-2 bg-[#262119] hairline-border rounded-lg p-1.5 px-3">
                    <span className="font-mono-ibm text-[11px] text-[#A79C8C]">X (COL)</span>
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
                      placeholder="e.g. 1"
                    />
                  </div>
                  <div className="flex-1 flex items-center gap-2 bg-[#262119] hairline-border rounded-lg p-1.5 px-3">
                    <span className="font-mono-ibm text-[11px] text-[#A79C8C]">Y (ROW)</span>
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
                      placeholder="e.g. 1"
                    />
                  </div>
                </div>
                <p className="text-[#A79C8C] text-[11px] mt-1 leading-snug">
                  Map this book to a specific physical coordinate bin (e.g. X:1, Y:1).
                </p>
              </div>
            )}

            {/* Reading Timeline */}
            {(book.readHistory?.length || book.readingSessions?.length) ? (
              <div className="space-y-2">
                <h3 className="font-mono-ibm text-[11px] text-[#A79C8C] uppercase tracking-wider">
                  Reading History & Sessions
                </h3>
                <div className="bg-[#151311] rounded-xl p-3.5 hairline-border">
                  <div className="relative pl-3 space-y-4 before:absolute before:inset-y-0 before:left-[5px] before:w-[2px] before:bg-[#3A332A]">
                    {book.readHistory && book.readHistory.map((dateStr, idx) => (
                      <div key={`hist-${idx}`} className="relative flex items-center gap-3">
                        <div className="absolute -left-[14px] w-2.5 h-2.5 rounded-full bg-[#C9963F] border-2 border-[#151311]" />
                        <span className="font-mono-ibm text-[12px] text-[#D4CDA8]">
                          Completed on {new Date(dateStr).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    ))}
                    {book.readingSessions && book.readingSessions.map((session, idx) => (
                      <div key={`sess-${idx}`} className="relative flex items-center gap-3">
                        <div className="absolute -left-[14px] w-2.5 h-2.5 rounded-full bg-[#6B8E23] border-2 border-[#151311]" />
                        <span className="font-mono-ibm text-[12px] text-[#D4CDA8]">
                          Read for {Math.round(session.durationSeconds / 60)} mins on {new Date(session.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
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
                    <span className="material-symbols-outlined text-[14px] text-[#C9963F]">timer</span>
                    CURRENT SITTING
                  </h3>
                  <div className={`font-mono-ibm text-[16px] font-bold ${isTimerActive ? 'text-[#C9963F] animate-pulse' : 'text-[#F4EFE6]'}`}>
                    {formatTime(elapsedSeconds)}
                  </div>
                </div>
                
                <button
                  onClick={handleToggleTimer}
                  className={`w-full py-2.5 rounded-lg font-mono-ibm text-[12px] font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 ${
                    isTimerActive 
                      ? 'bg-[#3A1D1D] text-[#FF6B6B] hover:bg-[#4A2525]' 
                      : 'bg-[#262119] text-[#C9963F] hover:bg-[#3A332A]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {isTimerActive ? 'stop_circle' : 'play_circle'}
                  </span>
                  {isTimerActive ? 'Stop & Save Session' : 'Start Reading Session'}
                </button>
              </div>
            )}

            {/* Description / Synopsis in Literata */}
            <div className="space-y-1.5">
              <h3 className="font-mono-ibm text-[11px] text-[#A79C8C] uppercase tracking-wider">
                SYNOPSIS & ARCHIVAL NOTES
              </h3>
              <div className="font-serif-literata text-[14px] leading-relaxed text-[#D4CDA8] bg-[#151311] p-4 rounded-xl hairline-border">
                {book.description || 'No description available for this volume.'}
              </div>
            </div>

            {/* Custom Tags */}
            {onUpdateTags && (
              <div className="space-y-1.5">
                <h3 className="font-mono-ibm text-[11px] text-[#A79C8C] uppercase tracking-wider flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[14px] text-[#C9963F]">sell</span>
                  CUSTOM TAGS
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
                            className="text-[#A79C8C] hover:text-[#C9963F] focus:outline-none transition-colors"
                          >
                            <span className="material-symbols-outlined text-[14px]">close</span>
                          </button>
                        </span>
                      ))
                    ) : (
                      <span className="text-[12px] font-sans-inter text-[#A79C8C] italic">No tags assigned.</span>
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
                      placeholder="Add new tag..."
                      className="flex-1 bg-[#12100E] text-[#F4EFE6] text-[13px] font-sans-inter rounded-lg px-3 py-1.5 border border-[#3A332A] focus:border-[#C9963F] focus:outline-none placeholder:text-[#A79C8C]/50"
                    />
                    <button
                      type="submit"
                      disabled={!newTag.trim()}
                      className="bg-[#262119] hover:bg-[#3A332A] text-[#C9963F] px-3 py-1.5 rounded-lg text-[11px] font-mono-ibm font-bold uppercase tracking-wider disabled:opacity-50 transition-colors"
                    >
                      Add
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* Personal Notes */}
            {onUpdateNotes && (
              <div className="space-y-1.5">
                <h3 className="font-mono-ibm text-[11px] text-[#A79C8C] uppercase tracking-wider flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[14px] text-[#C9963F]">edit_note</span>
                  PERSONAL NOTES
                </h3>
                <textarea
                  value={book.notes || ''}
                  onChange={(e) => onUpdateNotes(book.id, e.target.value)}
                  placeholder="Add your thoughts, favorite quotes, or reading notes here..."
                  className="w-full bg-[#151311] text-[#F4EFE6] font-sans-inter text-[13px] leading-relaxed rounded-xl p-4 hairline-border focus:outline-none focus:border-[#C9963F] min-h-[120px] resize-y placeholder:text-[#A79C8C]/50"
                />
              </div>
            )}

            {/* Archival Identifier Footer */}
            <div className="pt-2 border-t border-[#3A332A] flex justify-between items-center text-[10px] font-mono-ibm text-[#9C8F7E]">
              <span>ISBN: {book.isbn || 'N/A'}</span>
              <span>ADDED: {new Date(book.addedAt).toLocaleDateString()}</span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
