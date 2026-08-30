import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { SpineCandidate } from '../types';
import { haptic } from '../services/haptics';

interface ProcessingViewProps {
  imageUrl: string;
  candidates: SpineCandidate[];
  onComplete: () => void;
}

export const ProcessingView: React.FC<ProcessingViewProps> = ({
  imageUrl,
  candidates,
  onComplete,
}) => {
  const [progress, setProgress] = useState(15);
  const [currentStage, setCurrentStage] = useState('ALIGNING PERSPECTIVE & ROLL (1.2°)');

  useEffect(() => {
    const stage1 = setTimeout(() => {
      setProgress(42);
      setCurrentStage(`SEGMENTING ${candidates.length} PHYSICAL SPINES (§7.3)`);
    }, 600);

    const stage2 = setTimeout(() => {
      setProgress(74);
      setCurrentStage('EXTRACTING 4-ORIENTATION OCR TEXT & COLOR SIGNATURES');
    }, 1300);

    const stage3 = setTimeout(() => {
      setProgress(95);
      setCurrentStage('RESOLVING CATALOG EDITIONS & CONFIDENCE BANDS');
    }, 2000);

    const stage4 = setTimeout(() => {
      setProgress(100);
      // Invoke success haptic pattern via haptics service when clustering and matching simulation completes
      haptic.success();
      onComplete();
    }, 2600);

    return () => {
      clearTimeout(stage1);
      clearTimeout(stage2);
      clearTimeout(stage3);
      clearTimeout(stage4);
    };
  }, [candidates.length, onComplete]);

  return (
    <div className="fixed inset-0 z-50 bg-[#12100E] flex flex-col justify-between overflow-hidden">
      {/* Top Telemetry Header */}
      <div className="p-4 sm:px-6 bg-[#181512] border-b border-[#3A332A] flex justify-between items-center z-20">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#C9963F] animate-ping" />
          <span className="font-mono-ibm text-[12px] text-[#C9963F] font-semibold tracking-widest uppercase">
            LOCAL ENGINE RUNNING
          </span>
        </div>
        <span className="font-mono-ibm text-[11px] text-[#A79C8C] tracking-wider">
          {progress}% PROCESSED
        </span>
      </div>

      {/* Center Image Viewport with Laser Beam and Candidate Bounding Boxes */}
      <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
        <img
          src={imageUrl}
          alt="Processing shelf"
          className="w-full h-full object-cover opacity-60 filter contrast-125"
        />

        {/* Moving Laser Line (Image 9) */}
        <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-[#C9963F] to-transparent animate-laser shadow-[0_0_15px_#C9963F]" />

        {/* Segmented Spine Bounding Boxes (Image 9) */}
        <div className="absolute inset-0 pointer-events-none">
          {candidates.map((cand, idx) => {
            const isRevealed = progress > 35;
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
          Privacy-First Architecture: Raw image crops remain strictly on your device.
        </p>
      </div>
    </div>
  );
};
