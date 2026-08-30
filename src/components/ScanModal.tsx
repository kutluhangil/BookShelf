import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SPIKE_DATASET } from '../data/spikeDataset';
import { SpikeSample } from '../types';
import { haptic } from '../services/haptics';

export type ScanMode = 'shelf' | 'isbn';

interface ScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (imageUrl: string, sampleData?: SpikeSample, mode?: ScanMode) => void;
}

export const ScanModal: React.FC<ScanModalProps> = ({
  isOpen,
  onClose,
  onCapture,
}) => {
  const [selectedSample, setSelectedSample] = useState<SpikeSample>(SPIKE_DATASET[0]);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [scanMode, setScanMode] = useState<ScanMode>('shelf');
  const [roll, setRoll] = useState(1.2); // Roll angle in degrees (optimal: 0° ± 7°)
  const [pitch, setPitch] = useState(88.0); // Pitch angle in degrees (optimal: 90° ± 7°)
  const [showAngleAdjuster, setShowAngleAdjuster] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Track previous alignment state to trigger haptic on edge transition
  const wasAlignedRef = useRef<boolean>(false);

  // Stable alignment threshold check (±7° roll from level, ±7° pitch from 90° vertical)
  const isRollValid = Math.abs(roll) <= 7.0;
  const isPitchValid = Math.abs(pitch - 90.0) <= 7.0;
  const isAligned = isRollValid && isPitchValid;

  // Listen to real DeviceOrientation if available on mobile
  useEffect(() => {
    if (!isOpen) return;

    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.gamma !== null && e.beta !== null) {
        // gamma: left-to-right roll (-90 to 90)
        // beta: front-to-back pitch (-180 to 180, ~90 is vertical)
        const currentRoll = Math.round(e.gamma * 10) / 10;
        const currentPitch = Math.round(e.beta * 10) / 10;
        setRoll(currentRoll);
        setPitch(currentPitch);
      }
    };

    if (typeof window !== 'undefined' && 'DeviceOrientationEvent' in window) {
      window.addEventListener('deviceorientation', handleOrientation, true);
    }

    return () => {
      if (typeof window !== 'undefined' && 'DeviceOrientationEvent' in window) {
        window.removeEventListener('deviceorientation', handleOrientation, true);
      }
    };
  }, [isOpen]);

  // Edge-triggered light haptic tap when entering stable ±7° alignment threshold
  useEffect(() => {
    if (!isOpen) {
      wasAlignedRef.current = false;
      return;
    }

    if (isAligned && !wasAlignedRef.current) {
      // Trigger light haptic tap when device alignment enters stable ±7° capture threshold
      haptic.lightImpact();
    }
    wasAlignedRef.current = isAligned;
  }, [isAligned, isOpen]);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          onCapture(event.target.result as string, undefined, scanMode);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSimulateCapture = () => {
    haptic.mediumImpact();
    onCapture(selectedSample.imageUrl, selectedSample, scanMode);
  };

  const setPresetAngle = (newRoll: number, newPitch: number) => {
    haptic.selectionClick();
    setRoll(newRoll);
    setPitch(newPitch);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#12100E] flex flex-col justify-between overflow-hidden">
      {/* Top HUD Controls */}
      <div className="relative z-20 p-4 sm:px-6 flex flex-col gap-4 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex justify-between items-center w-full">
          <button
            onClick={() => {
              haptic.lightImpact();
              onClose();
            }}
            className="text-[#F4EFE6] bg-black/40 backdrop-blur-md p-2 rounded-full hairline-border hover:bg-black/70 transition-colors"
          >
            <span className="material-symbols-outlined text-[24px]">close</span>
          </button>

          {/* Gyro Alignment Pill / Warning (§4.6 HUD Horizon Indicator) */}
          <div
            onClick={() => {
              if (isAligned) {
                setPresetAngle(14.5, 72.0); // Simulate tilted out of threshold
              } else {
                setPresetAngle(1.2, 89.0); // Simulate locking into threshold
              }
            }}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full backdrop-blur-md font-mono-ibm text-[11px] tracking-wider transition-all cursor-pointer select-none shadow-lg ${
              isAligned
                ? 'bg-[#1C2C1D]/90 text-[#85E07D] border border-[#6E8F6A] ring-1 ring-[#6E8F6A]/40'
                : 'bg-[#3A2412]/90 text-[#F5BD62] border border-[#C9963F] ring-1 ring-[#C9963F]/30'
            }`}
            title="Click to toggle level / tilted angles and test threshold haptic"
          >
            <span
              className={`w-2.5 h-2.5 rounded-full transition-all ${
                isAligned ? 'bg-[#6E8F6A] shadow-[0_0_8px_#6E8F6A]' : 'bg-[#C9963F] animate-ping'
              }`}
            />
            <span className="font-semibold">
              {isAligned
                ? `LEVEL LOCKED (${roll > 0 ? '+' : ''}${roll.toFixed(1)}° ROLL / ${pitch.toFixed(0)}° PITCH)`
                : `TILTED: ROLL ${roll > 0 ? '+' : ''}${roll.toFixed(1)}° — HOLD PARALLEL`}
            </span>
            <span className="material-symbols-outlined text-[15px] opacity-70">
              {isAligned ? 'check_circle' : 'screen_rotation'}
            </span>
          </div>

          {/* Right Top Actions (Angle Tuning & Torch) */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                haptic.lightImpact();
                setShowAngleAdjuster(!showAngleAdjuster);
              }}
              className={`p-2 rounded-full backdrop-blur-md hairline-border transition-colors ${
                showAngleAdjuster
                  ? 'bg-[#C9963F] text-[#12100E]'
                  : 'bg-black/40 text-[#F4EFE6] hover:bg-black/70'
              }`}
              title="Toggle Gyro Alignment Controls"
            >
              <span className="material-symbols-outlined text-[20px]">tune</span>
            </button>

            <button
              onClick={() => {
                haptic.lightImpact();
                setIsTorchOn(!isTorchOn);
              }}
              className={`p-2 rounded-full backdrop-blur-md hairline-border transition-colors ${
                isTorchOn
                  ? 'bg-[#C9963F] text-[#12100E]'
                  : 'bg-black/40 text-[#F4EFE6] hover:bg-black/70'
              }`}
              title="Toggle Flash"
            >
              <span className="material-symbols-outlined text-[22px]">
                {isTorchOn ? 'flash_on' : 'flash_off'}
              </span>
            </button>
          </div>
        </div>
        
        {/* Scan Mode Toggle */}
        <div className="flex self-center bg-black/40 backdrop-blur-md p-1 rounded-full hairline-border w-max shadow-lg">
          <button
            onClick={() => {
              haptic.selectionClick();
              setScanMode('shelf');
            }}
            className={`px-6 py-1.5 rounded-full font-mono-ibm text-[11px] font-bold tracking-wider transition-all ${
              scanMode === 'shelf'
                ? 'bg-[#C9963F] text-[#12100E] shadow-sm'
                : 'text-[#A79C8C] hover:text-[#F4EFE6]'
            }`}
          >
            SHELF SCAN
          </button>
          <button
            onClick={() => {
              haptic.selectionClick();
              setScanMode('isbn');
            }}
            className={`px-6 py-1.5 rounded-full font-mono-ibm text-[11px] font-bold tracking-wider transition-all ${
              scanMode === 'isbn'
                ? 'bg-[#C9963F] text-[#12100E] shadow-sm'
                : 'text-[#A79C8C] hover:text-[#F4EFE6]'
            }`}
          >
            ISBN SCAN
          </button>
        </div>
      </div>

      {/* Interactive Angle Calibration & Preset HUD Bar (Optional Dropdown) */}
      <AnimatePresence>
        {showAngleAdjuster && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="relative z-30 mx-4 sm:mx-auto max-w-lg bg-[#181512]/95 backdrop-blur-md p-3.5 rounded-xl border border-[#3A332A] flex flex-col gap-2.5 shadow-2xl"
          >
            <div className="flex justify-between items-center text-[11px] font-mono-ibm text-[#A79C8C]">
              <span>GYRO ALIGNMENT TEST BENCH (THRESHOLD ±7° STABLE)</span>
              <span className={isAligned ? 'text-[#85E07D] font-bold' : 'text-[#F5BD62] font-bold'}>
                {isAligned ? 'VALID THRESHOLD (LOCKED)' : 'OUT OF BOUNDS'}
              </span>
            </div>

            {/* Roll slider */}
            <div className="flex items-center gap-3">
              <span className="font-mono-ibm text-[11px] text-[#F4EFE6] w-20 shrink-0">
                Roll: {roll > 0 ? '+' : ''}{roll.toFixed(1)}°
              </span>
              <input
                type="range"
                min="-20"
                max="20"
                step="0.5"
                value={roll}
                onChange={(e) => setRoll(parseFloat(e.target.value))}
                className="w-full accent-[#C9963F] cursor-pointer"
              />
            </div>

            {/* Pitch slider */}
            <div className="flex items-center gap-3">
              <span className="font-mono-ibm text-[11px] text-[#F4EFE6] w-20 shrink-0">
                Pitch: {pitch.toFixed(1)}°
              </span>
              <input
                type="range"
                min="65"
                max="115"
                step="0.5"
                value={pitch}
                onChange={(e) => setPitch(parseFloat(e.target.value))}
                className="w-full accent-[#C9963F] cursor-pointer"
              />
            </div>

            {/* Quick Angle Presets to Test Lock-in Haptics */}
            <div className="flex gap-2">
              <button
                onClick={() => setPresetAngle(0.5, 90.0)}
                className={`flex-1 py-1.5 rounded text-[10px] font-mono-ibm font-semibold transition-all ${
                  isAligned ? 'bg-[#6E8F6A] text-[#101F12]' : 'bg-[#262119] text-[#A79C8C] hover:text-[#F4EFE6]'
                }`}
              >
                Snap to Level (0.5°, 90°)
              </button>
              <button
                onClick={() => setPresetAngle(12.5, 88.0)}
                className={`flex-1 py-1.5 rounded text-[10px] font-mono-ibm font-semibold transition-all ${
                  !isRollValid ? 'bg-[#C9963F] text-[#12100E]' : 'bg-[#262119] text-[#A79C8C] hover:text-[#F4EFE6]'
                }`}
              >
                Tilt Roll (+12.5°)
              </button>
              <button
                onClick={() => setPresetAngle(0.0, 75.0)}
                className={`flex-1 py-1.5 rounded text-[10px] font-mono-ibm font-semibold transition-all ${
                  !isPitchValid ? 'bg-[#C9963F] text-[#12100E]' : 'bg-[#262119] text-[#A79C8C] hover:text-[#F4EFE6]'
                }`}
              >
                Tilt Pitch (75°)
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Camera Viewfinder with Live Shelf Preview */}
      <div className="absolute inset-0 z-10 flex items-center justify-center bg-black">
        <img
          src={selectedSample.imageUrl}
          alt="Camera viewfinder"
          className="w-full h-full object-cover opacity-85 select-none"
        />

        {/* Dynamic Alignment Guideline Box */}
        <div
          className={`absolute pointer-events-none flex flex-col justify-between p-3 transition-all duration-300 ${
            scanMode === 'shelf'
              ? 'inset-x-6 sm:inset-x-16 inset-y-24 sm:inset-y-28 rounded-xl'
              : 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-40 rounded-lg bg-black/20 backdrop-blur-sm'
          } ${
            isAligned
              ? 'border-2 border-[#6E8F6A]/90 shadow-[0_0_30px_rgba(110,143,106,0.3)]'
              : 'border border-[#C9963F]/50 shadow-[0_0_20px_rgba(201,150,63,0.15)]'
          }`}
        >
          {/* Top corners */}
          <div className="flex justify-between w-full">
            <div
              className={`w-6 h-6 border-t-2 border-l-2 transition-colors ${
                isAligned ? 'border-[#85E07D]' : 'border-[#C9963F]'
              }`}
            />
            <div
              className={`w-6 h-6 border-t-2 border-r-2 transition-colors ${
                isAligned ? 'border-[#85E07D]' : 'border-[#C9963F]'
              }`}
            />
          </div>

          {/* Center Dynamic Alignment Crosshair & Level Bubble */}
          <div className="flex flex-col items-center gap-2">
            {/* Horizon bar that tilts with roll */}
            {scanMode === 'shelf' && (
              <div className="relative w-48 h-6 flex items-center justify-center">
                <div className="absolute w-full h-[1px] bg-white/20" />
                <motion.div
                  animate={{ rotate: roll }}
                  transition={{ type: 'spring', damping: 15, stiffness: 200 }}
                  className={`w-36 h-1 rounded-full shadow-md transition-colors ${
                    isAligned ? 'bg-[#85E07D]' : 'bg-[#C9963F]'
                  }`}
                />
                <div
                  className={`w-3 h-3 rounded-full border-2 border-black z-10 transition-colors ${
                    isAligned ? 'bg-[#85E07D]' : 'bg-[#C9963F]'
                  }`}
                />
              </div>
            )}
            
            {scanMode === 'isbn' && (
              <div className="flex items-center justify-center w-full my-2">
                <span className="material-symbols-outlined text-[32px] text-[#C9963F] opacity-50">barcode_scanner</span>
              </div>
            )}

            <span
              className={`px-3 py-1 rounded text-[11px] font-mono-ibm font-semibold uppercase tracking-widest backdrop-blur-md hairline-border transition-all text-center ${
                isAligned
                  ? 'bg-[#18261A]/90 text-[#85E07D] border-[#6E8F6A]'
                  : 'bg-black/70 text-[#F4EFE6] border-[#C9963F]/60'
              }`}
            >
              {isAligned 
                ? 'ALIGNMENT LOCKED • OPTIMAL' 
                : (scanMode === 'shelf' ? 'ALIGN SPINES PARALLEL TO GRID' : 'FRAME ISBN BARCODE HERE')}
            </span>
          </div>

          {/* Bottom corners */}
          <div className="flex justify-between w-full">
            <div
              className={`w-6 h-6 border-b-2 border-l-2 transition-colors ${
                isAligned ? 'border-[#85E07D]' : 'border-[#C9963F]'
              }`}
            />
            <div
              className={`w-6 h-6 border-b-2 border-r-2 transition-colors ${
                isAligned ? 'border-[#85E07D]' : 'border-[#C9963F]'
              }`}
            />
          </div>
        </div>

        {/* Flash Simulation Sheen */}
        {isTorchOn && (
          <div className="absolute inset-0 bg-white/10 pointer-events-none mix-blend-overlay" />
        )}
      </div>

      {/* Bottom Shutter Controls & Shelf Sample Preset Bar */}
      <div className="relative z-20 p-4 sm:px-8 pb-8 pt-3 bg-gradient-to-t from-black via-black/80 to-transparent flex flex-col gap-4">
        {/* Preset Shelf Sample Selector (Quick Test Matrix) */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          <span className="font-mono-ibm text-[10px] text-[#A79C8C] shrink-0 uppercase tracking-widest">
            TEST SAMPLES:
          </span>
          {SPIKE_DATASET.slice(0, 8).map((sample, index) => (
            <button
              key={sample.id}
              onClick={() => {
                haptic.selectionClick();
                setSelectedSample(sample);
              }}
              className={`px-2.5 py-1 rounded text-[11px] font-mono-ibm shrink-0 transition-all ${
                selectedSample.id === sample.id
                  ? 'bg-[#C9963F] text-[#12100E] font-semibold shadow-md'
                  : 'bg-black/60 text-[#A79C8C] hairline-border hover:text-[#F4EFE6]'
              }`}
            >
              #{index + 1} {sample.name.split('—')[1] || sample.name}
            </button>
          ))}
        </div>

        {/* Shutter Action Strip */}
        <div className="flex items-center justify-between max-w-md mx-auto w-full px-4">
          {/* File Upload from Photos / Camera Roll */}
          <div>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
            <button
              onClick={() => {
                haptic.lightImpact();
                fileInputRef.current?.click();
              }}
              className="w-12 h-12 rounded-full bg-black/60 backdrop-blur-md hairline-border text-[#F4EFE6] flex items-center justify-center hover:bg-black/90 transition-colors"
              title="Upload from Photo Library"
            >
              <span className="material-symbols-outlined text-[24px]">photo_library</span>
            </button>
          </div>

          {/* Primary Shutter Button */}
          <div className="relative flex items-center justify-center">
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={handleSimulateCapture}
              className={`w-20 h-20 rounded-full border-4 p-1.5 flex items-center justify-center hover:brightness-110 active:brightness-95 transition-all bg-black/40 ${
                isAligned
                  ? 'border-[#6E8F6A] shadow-[0_0_28px_rgba(110,143,106,0.6)]'
                  : 'border-[#C9963F] shadow-[0_0_24px_rgba(201,150,63,0.5)]'
              }`}
              title="Capture Shelf"
            >
              <div
                className={`w-full h-full rounded-full flex items-center justify-center text-[#12100E] transition-colors ${
                  isAligned ? 'bg-[#6E8F6A]' : 'bg-[#C9963F]'
                }`}
              >
                <span className="material-symbols-outlined text-[32px] font-bold">
                  photo_camera
                </span>
              </div>
            </motion.button>
          </div>

          {/* Close / Cancel Button */}
          <button
            onClick={() => {
              haptic.lightImpact();
              onClose();
            }}
            className="w-12 h-12 rounded-full bg-black/60 backdrop-blur-md hairline-border text-[#F4EFE6] flex items-center justify-center hover:bg-black/90 transition-colors"
            title="Cancel"
          >
            <span className="material-symbols-outlined text-[24px]">close</span>
          </button>
        </div>
      </div>
    </div>
  );
};
