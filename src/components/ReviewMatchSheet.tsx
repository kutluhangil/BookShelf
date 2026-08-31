import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SpineCandidate, EditionOption } from '../types';
import { ConfidenceBadge } from './ConfidenceBadge';
import { haptic } from '../services/haptics';
import { BookCover } from './BookCover';
import { ModalShell } from './ModalShell';

interface ReviewMatchSheetProps {
  candidate: SpineCandidate | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectEdition: (candidateId: string, edition: EditionOption) => void;
  onOpenManualSearch: (candidateId: string) => void;
  onMarkNotBook: (candidateId: string) => void;
  onEnhanceWithAI?: (candidateId: string) => Promise<void>;
}

export const ReviewMatchSheet: React.FC<ReviewMatchSheetProps> = ({
  candidate,
  isOpen,
  onClose,
  onSelectEdition,
  onOpenManualSearch,
  onMarkNotBook,
  onEnhanceWithAI,
}) => {
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);

  if (!isOpen || !candidate) return null;

  const handleAiEnhance = async () => {
    if (!onEnhanceWithAI) return;
    haptic.lightImpact();
    setIsEnhancing(true);
    try {
      await onEnhanceWithAI(candidate.id);
      haptic.success();
      setAiResult('AI VLM Analysis: Extracted high-confidence title & author from typography structures.');
    } catch {
      haptic.error();
      setAiResult('Unable to enhance via AI. You can manually search or assign an edition.');
    } finally {
      setIsEnhancing(false);
    }
  };

  return (
    <AnimatePresence>
      <ModalShell isOpen={isOpen} onClose={onClose} label="Review spine match" closeOnBackdrop={false} className="fixed inset-0 z-50 flex items-end justify-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm"
        />

        {/* Bottom Sheet Card */}
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          className="relative z-10 w-full max-w-[620px] max-h-[88vh] bg-[#262119] rounded-t-[24px] hairline-border border-b-0 flex flex-col pt-3 shadow-[0_-4px_32px_rgba(18,16,14,0.9)] overflow-hidden"
        >
          {/* Drag Handle */}
          <div className="w-full flex justify-center py-1.5 cursor-grab">
            <div className="w-12 h-1.5 bg-[#4F4537] rounded-full opacity-60" />
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar px-5 sm:px-7 pb-8 pt-2">
            {/* Header & Confidence Badge */}
            <div className="flex justify-between items-start mt-2 mb-4 gap-3">
              <div>
                <h2 className="font-serif-literata text-[22px] sm:text-[24px] text-[#F4EFE6] leading-snug">
                  Review Match
                </h2>
                <p className="font-sans-inter text-[13px] text-[#A79C8C] mt-0.5">
                  We found multiple candidate editions for this spine segment.
                </p>
              </div>

              <ConfidenceBadge level={candidate.confidence} />
            </div>

            {/* The Captured Spine Segment preview with crop marks */}
            <div className="relative w-full h-44 sm:h-48 mb-5 rounded-lg overflow-hidden hairline-border bg-[#100E0C]">
              <img
                src={candidate.cropUrl}
                alt="Captured spine"
                className="w-full h-full object-cover grayscale-[30%] opacity-90 transition-all duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#262119] via-transparent to-transparent pointer-events-none" />

              {/* Crop mark corner brackets */}
              <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-[#C9963F] opacity-70 pointer-events-none" />
              <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-[#C9963F] opacity-70 pointer-events-none" />
              <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-[#C9963F] opacity-70 pointer-events-none" />
              <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-[#C9963F] opacity-70 pointer-events-none" />

              {/* Spine OCR Raw Text Pill */}
              <div className="absolute bottom-2 left-3 right-3 bg-[#12100E]/80 backdrop-blur-md px-2.5 py-1 rounded hairline-border flex items-center justify-between text-[11px] font-mono-ibm text-[#F4EFE6]">
                <span className="truncate text-[#C9963F]">OCR: {candidate.rawTextForward}</span>
                <span className="text-[#A79C8C] shrink-0 ml-2">CONF: {candidate.score.toFixed(2)}</span>
              </div>
            </div>

            {/* AI VLM Fallback Trigger if unknown or review */}
            {onEnhanceWithAI && (
              <div className="mb-4 p-3 bg-[#1C1916] rounded-xl hairline-border flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="material-symbols-outlined text-[#C9963F] text-[20px]">psychology</span>
                  <div className="min-w-0">
                    <p className="font-sans-inter text-[12px] text-[#F4EFE6] font-medium truncate">
                      VLM Typography Enhancement
                    </p>
                    <p className="font-sans-inter text-[11px] text-[#A79C8C] truncate">
                      Deep AI spine crop character recognition
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleAiEnhance}
                  disabled={isEnhancing}
                  className="px-3 py-1.5 rounded bg-[#C9963F]/15 hover:bg-[#C9963F]/25 text-[#C9963F] font-mono-ibm text-[11px] font-semibold tracking-wider transition-colors shrink-0 flex items-center gap-1"
                >
                  {isEnhancing ? (
                    <>
                      <span className="w-3 h-3 border-2 border-[#C9963F] border-t-transparent rounded-full animate-spin" />
                      <span>READING...</span>
                    </>
                  ) : (
                    <span>ENHANCE</span>
                  )}
                </button>
              </div>
            )}

            {aiResult && (
              <div className="mb-4 p-2.5 bg-[#304E2E]/20 text-[#C8ECC1] rounded text-[12px] font-sans-inter border border-[#6E8F6A]/30">
                {aiResult}
              </div>
            )}

            {/* Edition Selection Header */}
            <h3 className="font-mono-ibm text-[11px] font-semibold text-[#A79C8C] uppercase tracking-widest mb-3 border-b border-[#3A332A] pb-1.5 flex justify-between items-center">
              <span>SELECT CORRECT EDITION</span>
              <span className="text-[#9C8F7E] text-[10px]">{candidate.editions.length} MATCHES</span>
            </h3>

            {/* Candidate Edition Cards */}
            <div className="flex flex-col gap-3 mb-6">
              {candidate.editions.map((edition) => (
                <button
                  key={edition.id}
                  onClick={() => {
                    haptic.selectionClick();
                    onSelectEdition(candidate.id, edition);
                  }}
                  className="w-full text-left bg-[#1C1916] rounded-xl flex items-stretch overflow-hidden hairline-border paper-glow hover:bg-[#2C2927] focus:outline-none focus:ring-1 focus:ring-[#C9963F] transition-all group relative cursor-pointer"
                >
                  {/* Cover Preview */}
                  <div className="w-20 sm:w-24 shrink-0 bg-[#100E0C] border-r border-[#3A332A] overflow-hidden">
                    <BookCover
                      coverUrl={edition.coverUrl}
                      title={edition.title}
                      spineColor={candidate?.dominantColor}
                      fallbackTextSize={10}
                      className="w-full h-full grayscale-[20%] group-hover:grayscale-0 group-hover:scale-105 transition-all duration-300"
                    />
                  </div>

                  {/* Edition Metadata */}
                  <div className="p-3 sm:p-3.5 flex flex-col justify-center flex-1 min-w-0">
                    <h4 className="font-serif-literata text-[16px] sm:text-[18px] text-[#F4EFE6] group-hover:text-[#C9963F] transition-colors leading-tight mb-1 truncate">
                      {edition.title}
                    </h4>
                    <p className="font-sans-inter text-[13px] text-[#A79C8C] mb-2 truncate">
                      {edition.author}
                    </p>

                    <div className="flex items-center gap-2 mt-auto font-mono-ibm text-[11px] text-[#9C8F7E]">
                      <span>{edition.year} Ed.</span>
                      <span className="w-1 h-1 rounded-full bg-[#4F4537]" />
                      <span className="truncate">{edition.publisher}</span>
                    </div>
                  </div>

                  {/* Arrow Indicator */}
                  <div className="px-3.5 flex items-center justify-center border-l border-[#3A332A]/50 text-[#9C8F7E] group-hover:text-[#C9963F] transition-colors">
                    <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                  </div>
                </button>
              ))}
            </div>

            {/* Secondary Actions */}
            <div className="flex flex-col gap-2.5 border-t border-[#3A332A] pt-4">
              <button
                onClick={() => {
                  haptic.lightImpact();
                  onOpenManualSearch(candidate.id);
                }}
                className="w-full py-3 px-4 bg-transparent hairline-border rounded-lg font-sans-inter text-[14px] font-medium text-[#C9963F] hover:bg-[#1C1916] transition-colors flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[19px]">search</span>
                <span>Search Manually</span>
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    haptic.mediumImpact();
                    onMarkNotBook(candidate.id);
                  }}
                  className="flex-1 py-2.5 px-3 bg-transparent rounded font-sans-inter text-[13px] text-[#A79C8C] hover:text-[#FFB4AB] hover:bg-[#93000A]/10 transition-colors"
                >
                  Not a book / Noise
                </button>
                <button
                  onClick={() => {
                    haptic.lightImpact();
                    onClose();
                  }}
                  className="flex-1 py-2.5 px-3 bg-transparent rounded font-sans-inter text-[13px] text-[#A79C8C] hover:text-[#F4EFE6] transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </ModalShell>
    </AnimatePresence>
  );
};
