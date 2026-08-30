import React from 'react';
import { motion } from 'motion/react';
import { Book } from '../types';
import { ConfidenceBadge } from './ConfidenceBadge';
import { haptic } from '../services/haptics';

interface BookCardProps {
  book: Book;
  index?: number;
  onClick?: () => void;
  onResolve?: (e: React.MouseEvent) => void;
  onDelete?: (e: React.MouseEvent) => void;
}

export const BookCard: React.FC<BookCardProps> = ({
  book,
  index = 0,
  onClick,
  onResolve,
}) => {
  const isReview = book.confidence === 'review';
  const isUnknown = book.confidence === 'unknown';
  const hasProgress = typeof book.progress === 'number';
  const progressPercent = hasProgress
    ? Math.max(0, Math.min(100, Math.round(book.progress as number)))
    : null;

  // Cap staggered delay for responsive initial load feel (max 0.45s)
  const staggerDelay = Math.min(index * 0.045, 0.45);

  return (
    <motion.article
      initial={{ opacity: 0, y: 14, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.38,
        delay: staggerDelay,
        ease: [0.22, 1, 0.36, 1],
      }}
      onClick={() => {
        haptic.selectionClick();
        if (onClick) onClick();
      }}
      className={`bg-[#1C1916] rounded-[14px] flex overflow-hidden hairline-border paper-glow hover:bg-[#221F1D] transition-colors duration-300 cursor-pointer group relative ${
        isReview ? 'border-[#C9963F]/40' : isUnknown ? 'border-[#A9503F]/30' : 'border-[#3A332A]'
      }`}
    >
      {/* 3px indicator accent bar on the left */}
      <div
        className={`w-[3px] absolute left-0 top-0 bottom-0 z-10 ${
          book.confidence === 'matched'
            ? 'bg-[#6E8F6A]'
            : isReview
            ? 'bg-[#C9963F]'
            : 'bg-[#A9503F]'
        }`}
      />

      {/* Extracted Spine Crop Segment / Cover preview */}
      <div className="w-20 sm:w-24 shrink-0 bg-[#100E0C] border-r border-[#3A332A] relative overflow-hidden flex items-center justify-center">
        {book.spineCropUrl ? (
          <>
            <img
              src={book.coverUrl || book.spineCropUrl}
              alt={`${book.title} spine`}
              className="w-full h-full object-cover grayscale-[25%] group-hover:grayscale-0 group-hover:scale-105 transition-all duration-500"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-transparent pointer-events-none" />
          </>
        ) : (
          <div className="w-12 h-20 border border-dashed border-[#3A332A] rounded flex items-center justify-center bg-[#12100E]">
            <span className="material-symbols-outlined text-[#A79C8C] text-2xl">menu_book</span>
          </div>
        )}

        {/* Reader Completion Percentage Progress Bar Overlay */}
        {hasProgress && progressPercent !== null && (
          <div className="absolute bottom-0 inset-x-0 z-20 bg-[#100E0C]/90 backdrop-blur-[2px] px-1.5 py-1 flex flex-col gap-0.5 border-t border-[#3A332A]/80 shadow-md">
            <div className="flex justify-between items-center text-[9px] font-mono-ibm font-semibold leading-none">
              <span className="text-[#A79C8C] text-[8px] uppercase tracking-wider">
                {progressPercent === 100 ? 'READ' : 'PROGRESS'}
              </span>
              <span
                className={
                  progressPercent === 100
                    ? 'text-[#85E07D]'
                    : progressPercent > 0
                    ? 'text-[#F5BD62]'
                    : 'text-[#A79C8C]'
                }
              >
                {progressPercent}%
              </span>
            </div>
            <div className="w-full h-[3px] bg-[#262119] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  progressPercent === 100
                    ? 'bg-[#6E8F6A]'
                    : 'bg-gradient-to-r from-[#C9963F] to-[#F5BD62]'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Book Metadata & Title Stack */}
      <div className="p-3 sm:p-4 flex flex-col justify-between flex-1 min-w-0">
        <div>
          <div className="flex justify-between items-start mb-1 gap-2">
            <ConfidenceBadge level={book.confidence} />
            <div className="flex items-center gap-1.5">
              {hasProgress && progressPercent !== null && (
                <span
                  className={`text-[10px] font-mono-ibm px-1.5 py-0.5 rounded border ${
                    progressPercent === 100
                      ? 'bg-[#6E8F6A]/15 text-[#85E07D] border-[#6E8F6A]/30'
                      : progressPercent > 0
                      ? 'bg-[#C9963F]/15 text-[#F5BD62] border-[#C9963F]/30'
                      : 'bg-[#262119] text-[#A79C8C] border-[#3A332A]'
                  }`}
                >
                  {progressPercent === 100 ? '100% DONE' : `${progressPercent}% READ`}
                </span>
              )}
              <span className="material-symbols-outlined text-[#A79C8C] text-[18px] opacity-60 group-hover:opacity-100 transition-opacity">
                more_vert
              </span>
            </div>
          </div>

          <h3
            className={`font-serif-literata text-[17px] sm:text-[19px] leading-tight text-[#F4EFE6] mb-1 group-hover:text-[#C9963F] transition-colors truncate ${
              isReview || isUnknown ? 'italic opacity-90' : ''
            }`}
          >
            {book.title}
          </h3>

          <p className="font-sans-inter text-[13px] text-[#A79C8C] truncate">
            {book.author}
          </p>
        </div>

        {/* Bottom archival tags & action triggers */}
        <div className="mt-3 pt-2.5 border-t border-[#3A332A]/70 flex justify-between items-center text-[11px] font-mono-ibm text-[#9C8F7E]">
          <span className="truncate max-w-[140px] uppercase tracking-wider">
            {book.publishYear ? `${book.publishYear} ED.` : 'ARCHIVAL VOL.'} {book.publisher ? `• ${book.publisher}` : ''}
          </span>

          {isReview && onResolve ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                haptic.selectionClick();
                onResolve(e);
              }}
              className="text-[#C9963F] hover:underline font-semibold tracking-wider flex items-center gap-1"
            >
              <span>RESOLVE</span>
              <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            </button>
          ) : isUnknown ? (
            <span className="text-[#A9503F] font-semibold tracking-wider">
              MANUAL REQ.
            </span>
          ) : (
            <span className="font-mono-ibm text-[11px] text-[#A79C8C]">
              CONF: {book.score ? book.score.toFixed(2) : '0.98'}
            </span>
          )}
        </div>
      </div>

      {/* Full-width bottom progress line overlay on card */}
      {hasProgress && progressPercent !== null && (
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#262119] overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              progressPercent === 100
                ? 'bg-[#6E8F6A]'
                : 'bg-gradient-to-r from-[#C9963F] to-[#F5BD62]'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}
    </motion.article>
  );
};
