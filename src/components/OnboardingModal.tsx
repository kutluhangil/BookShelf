import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShelfStrip } from './ShelfStrip';
import { haptic } from '../services/haptics';
import { ModalShell } from './ModalShell';
import { useT } from '../i18n/I18nProvider';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartScanning: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onClose,
  onStartScanning,
}) => {
  const t = useT();
  const [slide, setSlide] = useState(0);

  if (!isOpen) return null;

  const slides = [
    {
      ...t.onboarding.slides[0],
      image: 'https://images.unsplash.com/photo-1507842229451-79b1be8d6293?q=80&w=900&auto=format&fit=crop',
      showStrip: false,
    },
    {
      ...t.onboarding.slides[1],
      image: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?q=80&w=900&auto=format&fit=crop',
      showStrip: true,
    },
    {
      ...t.onboarding.slides[2],
      image: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?q=80&w=900&auto=format&fit=crop',
      showStrip: false,
    },
  ];

  const current = slides[slide];

  return (
    <AnimatePresence>
      <ModalShell isOpen={isOpen} onClose={onClose} label={t.onboarding.dialogLabel} closeOnBackdrop={false} className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/90 backdrop-blur-md"
        />

        {/* Modal Window (Images 7, 15, 21 archetype) */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative z-10 w-full max-w-[480px] bg-[#1C1916] rounded-2xl hairline-border flex flex-col shadow-[0_20px_50px_rgba(0,0,0,0.95)] overflow-hidden"
        >
          {/* Header */}
          <div className="p-4 px-6 border-b border-[#3A332A] flex justify-between items-center bg-[#181512]">
            <span className="font-mono-ibm text-[11px] text-[#C9963F] font-semibold tracking-widest uppercase">
              {t.onboarding.stepLabel(current.step)}
            </span>
            <button
              onClick={onClose}
              className="text-[#A79C8C] hover:text-[#F4EFE6] p-1 rounded-full text-xs font-mono-ibm tracking-wider uppercase"
            >
              {t.onboarding.skip}
            </button>
          </div>

          <div className="p-6 flex flex-col items-center text-center">
            {/* Visual Hero */}
            <div className="w-full h-48 rounded-xl overflow-hidden mb-5 hairline-border bg-[#100E0C] relative">
              <img
                src={current.image}
                alt={current.title}
                className="w-full h-full object-cover grayscale-[20%]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#1C1916] via-transparent to-transparent pointer-events-none" />

              {current.showStrip && (
                <div className="absolute bottom-3 inset-x-4">
                  <ShelfStrip
                    colors={['#C9963F', '#304E2E', '#2C2927', '#8B2323', '#723700', '#1C1916', '#4F4537', '#7F5700']}
                    variant="compact"
                    height={36}
                  />
                </div>
              )}
            </div>

            {/* Title & Description */}
            <h2 className="font-serif-literata text-[22px] sm:text-[24px] text-[#F4EFE6] font-bold mb-1 leading-snug">
              {current.title}
            </h2>
            <p className="font-sans-inter text-[13px] text-[#C9963F] font-medium mb-3">
              {current.subtitle}
            </p>
            <p className="font-sans-inter text-[13px] text-[#A79C8C] leading-relaxed mb-6 max-w-sm">
              {current.description}
            </p>

            {/* Slide Dots Indicator */}
            <div className="flex gap-2 mb-6">
              {slides.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    haptic.selectionClick();
                    setSlide(idx);
                  }}
                  className={`h-1.5 rounded-full transition-all ${
                    slide === idx ? 'w-8 bg-[#C9963F]' : 'w-2 bg-[#4F4537]'
                  }`}
                />
              ))}
            </div>

            {/* Navigation CTA */}
            <div className="w-full flex gap-3">
              {slide < slides.length - 1 ? (
                <button
                  onClick={() => {
                    haptic.lightImpact();
                    setSlide(slide + 1);
                  }}
                  className="w-full py-3 bg-[#C9963F] hover:bg-[#b58332] text-[#12100E] rounded-xl font-mono-ibm text-[12px] font-bold uppercase tracking-wider transition-all"
                >
                  {t.onboarding.nextStep}
                </button>
              ) : (
                <button
                  onClick={() => {
                    haptic.mediumImpact();
                    onClose();
                    onStartScanning();
                  }}
                  className="w-full py-3 bg-[#C9963F] hover:bg-[#b58332] text-[#12100E] rounded-xl font-mono-ibm text-[12px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]" aria-hidden="true">photo_camera</span>
                  <span>{t.onboarding.startScanning}</span>
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </ModalShell>
    </AnimatePresence>
  );
};
