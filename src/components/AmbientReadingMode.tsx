import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Book } from '../types';
import { haptic } from '../services/haptics';
import { AmbientAudioEngine, AMBIENT_TRACK_IDS, AmbientTrackId } from '../services/ambientAudio';
import { BookCover } from './BookCover';
import { useT } from '../i18n/I18nProvider';
import { formatError } from '../i18n/formatError';

interface AmbientReadingModeProps {
  book: Book;
  elapsedSeconds: number;
  isActive: boolean;
  onStop: () => void;
}


export const AmbientReadingMode: React.FC<AmbientReadingModeProps> = ({ book, elapsedSeconds, isActive, onStop }) => {
  const t = useT();
  const [activeTrack, setActiveTrack] = useState<AmbientTrackId | null>(null);
  const [volume, setVolume] = useState(0.35);
  const [audioError, setAudioError] = useState<string | null>(null);
  const engineRef = useRef<AmbientAudioEngine | null>(null);

  if (engineRef.current === null && typeof window !== 'undefined') {
    engineRef.current = new AmbientAudioEngine();
  }

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    try {
      setAudioError(null);
      if (activeTrack) {
        engine.play(activeTrack);
      } else {
        engine.stop();
      }
    } catch (error) {
      setAudioError(formatError(t, error));
      setActiveTrack(null);
    }
  }, [activeTrack, t]);

  useEffect(() => {
    engineRef.current?.setVolume(volume);
  }, [volume]);

  // Stop the soundscape when leaving ambient mode or unmounting.
  useEffect(() => {
    if (!isActive) {
      engineRef.current?.stop();
      setActiveTrack(null);
    }
  }, [isActive]);

  useEffect(() => () => engineRef.current?.dispose(), []);

  const formatTime = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
          className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center overflow-hidden"
        >
          {/* Subtle glowing background based on book spine color */}
          <div 
            className="absolute inset-0 opacity-10 mix-blend-screen pointer-events-none transition-opacity duration-1000"
            style={{ 
              background: `radial-gradient(circle at center, ${book.spineColor || '#C9963F'} 0%, transparent 60%)` 
            }}
          />

          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5, duration: 1 }}
            className="relative z-10 flex flex-col items-center max-w-md w-full px-6"
          >
            <BookCover
              coverUrl={book.coverUrl}
              title={book.title}
              spineColor={book.spineColor}
              fallbackTextSize={12}
              className="w-32 h-48 rounded shadow-2xl mb-8 border border-white/5 opacity-50"
            />

            <h2 className="font-serif-literata text-2xl text-white/60 mb-2 text-center tracking-wide">{book.title}</h2>
            <p className="font-mono-ibm text-sm text-white/40 mb-12 tracking-widest uppercase">{book.author}</p>

            <div className="text-6xl font-mono-ibm text-[#C9963F]/70 tracking-widest font-light mb-16 tabular-nums">
              {formatTime(elapsedSeconds)}
            </div>

            <div className="w-full space-y-6">
              <div className="flex flex-col items-center gap-3">
                <span className="text-[10px] font-mono-ibm uppercase tracking-widest text-white/30">{t.ambient.audioLabel}</span>
                <div className="flex flex-wrap justify-center gap-2">
                  <button
                    onClick={() => setActiveTrack(null)}
                    className={`px-3 py-1.5 rounded-full text-xs font-mono-ibm transition-colors ${!activeTrack ? 'bg-white/10 text-white' : 'bg-transparent text-white/40 border border-white/10 hover:border-white/30'}`}
                  >
                    {t.ambient.off}
                  </button>
                  {AMBIENT_TRACK_IDS.map(trackId => (
                    <button
                      key={trackId}
                      onClick={() => {
                        haptic.selectionClick();
                        setActiveTrack(trackId);
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs font-mono-ibm transition-colors ${activeTrack === trackId ? 'bg-[#C9963F]/20 text-[#C9963F] border border-[#C9963F]/30' : 'bg-transparent text-white/40 border border-white/10 hover:border-white/30'}`}
                    >
                      {t.ambient.tracks[trackId]}
                    </button>
                  ))}
                </div>

                {activeTrack && (
                  <label className="flex items-center gap-3 w-full max-w-xs mt-2">
                    <span className="material-symbols-outlined text-white/30 text-[16px]" aria-hidden="true">volume_down</span>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={volume}
                      onChange={(event) => setVolume(parseFloat(event.target.value))}
                      className="flex-1 accent-[#C9963F] cursor-pointer"
                      aria-label={t.ambient.volumeLabel}
                    />
                    <span className="material-symbols-outlined text-white/30 text-[16px]" aria-hidden="true">volume_up</span>
                  </label>
                )}

                {audioError && (
                  <p className="text-[11px] font-mono-ibm text-[#C97A3F] text-center max-w-xs">{audioError}</p>
                )}
              </div>

              <div className="flex justify-center pt-8">
                <button
                  onClick={() => {
                    haptic.lightImpact();
                    onStop();
                  }}
                  className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-white/60 font-mono-ibm text-sm uppercase tracking-widest transition-all hover:text-white"
                >
                  {t.ambient.endSession}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
