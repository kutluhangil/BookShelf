import React, { useState } from 'react';
import { SpineCandidate } from '../types';
import { ShelfStrip } from './ShelfStrip';
import { ConfidenceBadge } from './ConfidenceBadge';
import { haptic } from '../services/haptics';
import { BookCover } from './BookCover';
import { useT } from '../i18n/I18nProvider';
import { activateOnKey } from '../utils/interactive';

interface ScanResultsViewProps {
  sourceImageUrl: string;
  candidates: SpineCandidate[];
  onReviewCandidate: (candidate: SpineCandidate) => void;
  onOpenManualSearch: (candidateId: string) => void;
  onSaveMatchedBooks: (candidatesToSave: SpineCandidate[]) => void;
  onDiscard: () => void;
}

export const ScanResultsView: React.FC<ScanResultsViewProps> = ({
  sourceImageUrl,
  candidates,
  onReviewCandidate,
  onOpenManualSearch,
  onSaveMatchedBooks,
  onDiscard,
}) => {
  const t = useT();
  const [isBannerCollapsed, setIsBannerCollapsed] = useState(false);
  const [selectedCandidates, setSelectedCandidates] = useState<Set<string>>(
    new Set(candidates.filter((c) => c.confidence === 'matched' && !c.isDismissed).map((c) => c.id))
  );

  const matched = candidates.filter((c) => c.confidence === 'matched' && !c.isDismissed);
  const needsReview = candidates.filter((c) => c.confidence === 'review' && !c.isDismissed);
  const unrecognized = candidates.filter((c) => c.confidence === 'unknown' && !c.isDismissed);

  const spineColors = candidates
    .filter((c) => !c.isDismissed)
    .map((c) => c.dominantColor || '#C9963F');

  const toggleSelect = (id: string) => {
    haptic.selectionClick();
    const next = new Set(selectedCandidates);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedCandidates(next);
  };

  const handleAddAllValid = () => {
    haptic.success();
    const toSave = candidates.filter((c) => selectedCandidates.has(c.id));
    onSaveMatchedBooks(toSave);
  };

  return (
    <div className="min-h-screen bg-[#12100E] text-[#F4EFE6] flex flex-col pb-28">
      {/* Top Source Capture Collapsible Card (Image 12) */}
      <div className="bg-[#1C1916] border-b border-[#3A332A] overflow-hidden transition-all duration-300">
        <div className="max-w-[800px] mx-auto p-4 sm:p-6">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
              <span className="font-mono-ibm text-[11px] text-[#C9963F] font-semibold tracking-widest uppercase">
                {t.scanResults.detected(candidates.length)}
              </span>
              <span className="text-[#3A332A]">|</span>
              <span className="font-mono-ibm text-[11px] text-[#A79C8C]">
                {t.scanResults.breakdown(matched.length, needsReview.length, unrecognized.length)}
              </span>
            </div>

            <button
              onClick={() => {
                haptic.lightImpact();
                setIsBannerCollapsed(!isBannerCollapsed);
              }}
              className="text-[#A79C8C] hover:text-[#F4EFE6] font-mono-ibm text-[11px] flex items-center gap-1"
            >
              <span>{isBannerCollapsed ? t.scanResults.expand : t.scanResults.collapse}</span>
              <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                {isBannerCollapsed ? 'expand_more' : 'expand_less'}
              </span>
            </button>
          </div>

          {!isBannerCollapsed && (
            <div className="relative w-full h-32 sm:h-40 rounded-xl overflow-hidden hairline-border mb-3 bg-[#100E0C]">
              <img
                src={sourceImageUrl}
                alt={t.scanResults.sourceAlt}
                className="w-full h-full object-cover grayscale-[30%]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

              {/* Bounding box overlays */}
              <div className="absolute inset-0 pointer-events-none">
                {candidates.map((c, i) => (
                  <div
                    key={c.id}
                    className="absolute border border-[#C9963F]/70 bg-[#C9963F]/10 rounded-sm"
                    style={{
                      left: `${c.bbox.x}%`,
                      top: `${c.bbox.y}%`,
                      width: `${c.bbox.width}%`,
                      height: `${c.bbox.height}%`,
                    }}
                  >
                    <span className="absolute -top-3 left-0 bg-black/80 text-[#F4EFE6] font-mono-ibm text-[8px] px-1 rounded">
                      #{i + 1}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Mini Interactive ShelfStrip Index */}
          <div className="space-y-1">
            <ShelfStrip
              colors={spineColors}
              variant="compact"
              height={32}
              className="opacity-90 hover:opacity-100"
            />
            <div className="flex justify-between font-mono-ibm text-[9px] text-[#9C8F7E] px-1">
              <span>{t.scanResults.spineIndex(1)}</span>
              <span>{t.scanResults.spineIndex(candidates.length)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Categorized Candidate Lists (Image 12) */}
      <main className="max-w-[800px] mx-auto w-full px-4 sm:px-6 py-6 space-y-8 flex-1">
        {/* Group 1: Needs Review (Priority to resolve) */}
        {needsReview.length > 0 && (
          <section className="space-y-3">
            <div className="flex justify-between items-center border-b border-[#C9963F]/30 pb-2">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[#C9963F]" />
                <h3 className="font-serif-literata text-[18px] sm:text-[20px] text-[#F5BD62] font-semibold">
                  {t.scanResults.needsReview(needsReview.length)}
                </h3>
              </div>
              <span className="font-mono-ibm text-[11px] text-[#A79C8C]">
                {t.scanResults.multipleEditions}
              </span>
            </div>

            <div className="space-y-3">
              {needsReview.map((cand) => (
                <div
                  key={cand.id}
                  role="button"
                  tabIndex={0}
                  aria-label={t.scanResults.reviewCandidate(cand.orderIndex)}
                  onClick={() => {
                    haptic.lightImpact();
                    onReviewCandidate(cand);
                  }}
                  onKeyDown={activateOnKey(() => {
                    haptic.lightImpact();
                    onReviewCandidate(cand);
                  })}
                  className="bg-[#262119] rounded-xl p-3.5 sm:p-4 hairline-border border-[#C9963F]/40 flex items-center justify-between gap-3 cursor-pointer hover:bg-[#2C251D] transition-colors group"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-12 h-16 shrink-0 bg-[#100E0C] rounded overflow-hidden border border-[#3A332A]">
                      <img
                        src={cand.cropUrl}
                        alt={t.scanResults.candidateAlt}
                        className="w-full h-full object-cover grayscale-[20%]"
                      />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <ConfidenceBadge level="review" score={cand.score} showScore />
                      </div>
                      <h4 className="font-serif-literata text-[16px] text-[#F4EFE6] group-hover:text-[#C9963F] transition-colors truncate">
                        {cand.editions[0]?.title || cand.rawTextForward}
                      </h4>
                      <p className="font-sans-inter text-[13px] text-[#A79C8C] truncate">
                        {cand.editions[0]?.author || t.scanResults.ambiguousReading}
                      </p>
                    </div>
                  </div>

                  <button className="px-3 py-1.5 bg-[#C9963F]/20 text-[#C9963F] font-mono-ibm text-[11px] font-semibold rounded-lg shrink-0 group-hover:bg-[#C9963F] group-hover:text-[#12100E] transition-all flex items-center gap-1">
                    <span>{t.bookCard.resolve}</span>
                    <span className="material-symbols-outlined text-[15px]" aria-hidden="true">chevron_right</span>
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Group 2: High Confidence Matched Books */}
        {matched.length > 0 && (
          <section className="space-y-3">
            <div className="flex justify-between items-center border-b border-[#6E8F6A]/30 pb-2">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[#6E8F6A]" />
                <h3 className="font-serif-literata text-[18px] sm:text-[20px] text-[#C8ECC1] font-semibold">
                  {t.scanResults.matchedBooks(matched.length)}
                </h3>
              </div>
              <button
                onClick={() => {
                  haptic.selectionClick();
                  if (selectedCandidates.size === matched.length) {
                    setSelectedCandidates(new Set());
                  } else {
                    setSelectedCandidates(new Set(matched.map((m) => m.id)));
                  }
                }}
                className="font-mono-ibm text-[11px] text-[#A79C8C] hover:text-[#F4EFE6]"
              >
                {selectedCandidates.size === matched.length ? t.scanResults.deselectAll : t.scanResults.selectAll}
              </button>
            </div>

            <div className="space-y-2.5">
              {matched.map((cand) => {
                const isSelected = selectedCandidates.has(cand.id);
                const book = cand.matchedBook || cand.editions[0];

                return (
                  <div
                    key={cand.id}
                    role="checkbox"
                    aria-checked={isSelected}
                    tabIndex={0}
                    onClick={() => toggleSelect(cand.id)}
                    onKeyDown={activateOnKey(() => toggleSelect(cand.id))}
                    className={`bg-[#1C1916] rounded-xl p-3 sm:p-3.5 hairline-border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-[#6E8F6A]/60 bg-[#22271E]'
                        : 'border-[#3A332A] opacity-75 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Checkbox */}
                      <div
                        className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${
                          isSelected
                            ? 'bg-[#6E8F6A] text-[#12100E]'
                            : 'border border-[#4F4537] bg-transparent'
                        }`}
                      >
                        {isSelected && (
                          <span className="material-symbols-outlined text-[16px] font-bold" aria-hidden="true">check</span>
                        )}
                      </div>

                      {/* Small Thumbnail */}
                      <div className="w-10 h-14 shrink-0 bg-[#100E0C] rounded overflow-hidden border border-[#3A332A]">
                        <BookCover
                          coverUrl={book.coverUrl}
                          title={book.title}
                          spineColor={'spineColor' in book ? book.spineColor : cand.dominantColor}
                          className="w-full h-full"
                          fallbackTextSize={8}
                        />
                      </div>

                      <div className="min-w-0">
                        <h4 className="font-serif-literata text-[15px] text-[#F4EFE6] truncate">
                          {book.title}
                        </h4>
                        <p className="font-sans-inter text-[12px] text-[#A79C8C] truncate">
                          {book.author}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <ConfidenceBadge level="matched" score={cand.score} showScore />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Group 3: Unrecognized Spines */}
        {unrecognized.length > 0 && (
          <section className="space-y-3">
            <div className="flex justify-between items-center border-b border-[#A9503F]/30 pb-2">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[#A9503F]" />
                <h3 className="font-serif-literata text-[18px] sm:text-[20px] text-[#FFB4AB] font-semibold">
                  {t.scanResults.unrecognized(unrecognized.length)}
                </h3>
              </div>
              <span className="font-mono-ibm text-[11px] text-[#A79C8C]">
                {t.scanResults.belowThreshold}
              </span>
            </div>

            <div className="space-y-2.5">
              {unrecognized.map((cand) => (
                <div
                  key={cand.id}
                  className="bg-[#1C1916] rounded-xl p-3 sm:p-3.5 hairline-border border-[#A9503F]/40 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-14 shrink-0 bg-[#100E0C] rounded overflow-hidden border border-[#3A332A]">
                      <img
                        src={cand.cropUrl}
                        alt={t.scanResults.unrecognizedAlt}
                        className="w-full h-full object-cover grayscale"
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <ConfidenceBadge level="unknown" score={cand.score} showScore />
                      </div>
                      <p className="font-mono-ibm text-[11px] text-[#9C8F7E] truncate">
                        {t.scanResults.raw(cand.rawTextForward || t.scanResults.unreadable)}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      haptic.selectionClick();
                      onOpenManualSearch(cand.id);
                    }}
                    className="px-3 py-1.5 bg-[#262119] hover:bg-[#304E2E]/40 text-[#C9963F] hairline-border rounded font-mono-ibm text-[11px] font-semibold shrink-0"
                  >
                    {t.scanResults.identify}
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Sticky Bottom Action Bar (Image 12) */}
      <footer className="fixed bottom-0 left-0 right-0 z-40 bg-[#12100E]/95 backdrop-blur-md border-t border-[#3A332A] p-4">
        <div className="max-w-[800px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-center sm:text-left">
            <p className="font-mono-ibm text-[12px] text-[#F4EFE6] font-semibold">
              {t.scanResults.selectedCount(selectedCandidates.size, matched.length + needsReview.length)}
            </p>
            <p className="font-sans-inter text-[11px] text-[#A79C8C]">
              {t.scanResults.readyToSave}
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={() => {
                haptic.lightImpact();
                onDiscard();
              }}
              className="px-4 py-2.5 rounded-xl hairline-border text-[#A79C8C] hover:text-[#F4EFE6] hover:bg-[#1C1916] font-sans-inter text-[13px] transition-colors"
            >
              {t.scanResults.discard}
            </button>

            {needsReview.length > 0 ? (
              <button
                onClick={() => {
                  haptic.mediumImpact();
                  onReviewCandidate(needsReview[0]);
                }}
                className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-[#262119] hover:bg-[#304E2E]/40 hairline-border border-[#C9963F] text-[#C9963F] font-mono-ibm text-[12px] font-semibold tracking-wider transition-all"
              >
                {t.scanResults.reviewIssues(needsReview.length)}
              </button>
            ) : null}

            <button
              onClick={handleAddAllValid}
              disabled={selectedCandidates.size === 0}
              className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-[#C9963F] hover:bg-[#b58332] text-[#12100E] font-mono-ibm text-[12px] font-bold tracking-wider transition-all shadow-[0_4px_16px_rgba(201,150,63,0.35)] disabled:opacity-40 disabled:pointer-events-none"
            >
              {t.scanResults.addMatched(selectedCandidates.size)}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
