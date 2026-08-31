import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { SpineCandidate } from '../types';
import { haptic } from '../services/haptics';
import { useT } from '../i18n/I18nProvider';

interface ProcessingViewProps {
  imageUrl: string;
  candidates: SpineCandidate[];
  /** What the app is currently waiting on (recognition, ISBN lookup, ...). */
  label?: string;
  onComplete?: () => void;
}

export const ProcessingView: React.FC<ProcessingViewProps> = ({
  imageUrl,
  candidates,
  label,
  onComplete,
}) => {
  const t = useT();
  const stageLabel = label ?? t.processing.defaultLabel;
  const hasResults = candidates.length > 0;
  const [progress, setProgress] = useState(12);
  const [currentStage, setCurrentStage] = useState(t.processing.uploadingFrame(stageLabel));

  // While the request is in flight, creep the progress bar without ever claiming
  // completion; the real result decides when the view hands over.
  useEffect(() => {
    if (hasResults) return;
    setCurrentStage(t.processing.waitingForResponse(stageLabel));
    const interval = setInterval(() => {
      setProgress((prev) => (prev >= 70 ? 70 : prev + 2));
    }, 180);
    return () => clearInterval(interval);
  }, [hasResults, stageLabel, t]);

  // Results arrived: reveal the detected boxes, then hand over.
  useEffect(() => {
    if (!hasResults || !onComplete) return;

    setProgress(82);
    setCurrentStage(t.processing.segmented(candidates.length));

    const stage = setTimeout(() => {
      setProgress(96);
      setCurrentStage(t.processing.resolvingEditions);
    }, 500);

    const done = setTimeout(() => {
      setProgress(100);
      haptic.success();
      onComplete();
    }, 1200);

    return () => {
      clearTimeout(stage);
      clearTimeout(done);
    };
  }, [hasResults, candidates.length, onComplete, t]);

  return (
    <div className="fixed inset-0 z-50 bg-[#12100E] flex flex-col justify-between overflow-hidden">
      {/* Top Telemetry Header */}
      <div className="p-4 sm:px-6 bg-[#181512] border-b border-[#3A332A] flex justify-between items-center z-20">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#C9963F] animate-ping" />
          <span className="font-mono-ibm text-[12px] text-[#C9963F] font-semibold tracking-widest uppercase">
            {stageLabel}
          </span>
        </div>
        <span className="font-mono-ibm text-[11px] text-[#A79C8C] tracking-wider">
          {t.processing.processed(progress)}
        </span>
      </div>

      {/* Center Image Viewport with Laser Beam and Candidate Bounding Boxes */}
      <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={t.processing.imageAlt}
            className="w-full h-full object-cover opacity-60 filter contrast-125"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-14 h-14 border-4 border-[#C9963F]/20 border-t-[#C9963F] rounded-full animate-spin" />
          </div>
        )}

        {/* Moving Laser Line (Image 9) */}
        <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-[#C9963F] to-transparent animate-laser shadow-[0_0_15px_#C9963F]" />

        {/* Segmented Spine Bounding Boxes (Image 9) */}
        <div className="absolute inset-0 pointer-events-none">
          {candidates.map((cand, idx) => {
            const isRevealed = hasResults;
            return (
              <motion.div
                key={cand.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{
                  opacity: isRevealed ? 1 : 0,
                  scale: isRevealed ? 1 : 0.95,
                }}
                transition={{ duration: 0.3, delay: idx * 0.05 }}
                className="absolute border-2 rounded-sm transition-all animate-spine-pulse"
                style={{
                  left: `${cand.bbox.x}%`,
                  top: `${cand.bbox.y}%`,
                  width: `${cand.bbox.width}%`,
                  height: `${cand.bbox.height}%`,
                  borderColor:
                    cand.confidence === 'matched'
                      ? 'rgba(110, 143, 106, 0.9)'
                      : cand.confidence === 'review'
                      ? 'rgba(201, 150, 63, 0.9)'
                      : 'rgba(169, 80, 63, 0.9)',
                  backgroundColor: 'rgba(201, 150, 63, 0.08)',
                }}
              >
                {/* Index tag */}
                <span className="absolute top-1 left-1 bg-black/80 px-1 text-[8px] font-mono-ibm text-[#F4EFE6] rounded border border-white/20">
                  #{idx + 1}
                </span>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Bottom Progress & Diagnostic Terminal */}
      <div className="p-6 bg-[#181512] border-t border-[#3A332A] z-20 space-y-4">
        {/* Terminal Text Line */}
        <div className="bg-[#100E0C] p-3 rounded-lg hairline-border flex items-center justify-between font-mono-ibm text-[11px] text-[#A79C8C]">
          <div className="flex items-center gap-2 truncate">
            <span className="text-[#C9963F] font-bold">&gt;</span>
            <span className="text-[#F4EFE6] truncate">{currentStage}</span>
          </div>
          <span className="w-2 h-4 bg-[#C9963F] animate-pulse shrink-0 ml-2" />
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-[#100E0C] h-2 rounded-full overflow-hidden hairline-border">
          <motion.div
            className="bg-[#C9963F] h-full rounded-full"
            style={{ width: `${progress}%` }}
            transition={{ ease: 'easeInOut' }}
          />
        </div>

        <p className="text-center font-sans-inter text-[12px] text-[#9C8F7E]">
          {t.processing.privacyNote}
        </p>
      </div>
    </div>
  );
};
