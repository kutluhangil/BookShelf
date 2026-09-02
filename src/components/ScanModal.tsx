import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SPIKE_DATASET } from '../data/spikeDataset';
import { SpikeSample } from '../types';
import { haptic } from '../services/haptics';
import { createBarcodeReader, type BarcodeReader } from '../services/barcodeScanner';
import { useT } from '../i18n/I18nProvider';
import { formatError } from '../i18n/formatError';

export type ScanMode = 'shelf' | 'isbn' | 'qr';

export interface CapturePayload {
  imageUrl: string;
  mode: ScanMode;
  /** Present for isbn/qr captures decoded by the Barcode Detection API. */
  barcode?: string;
  /** Present only when the user picked one of the bundled demo shelves. */
  sample?: SpikeSample;
}

interface ScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (payload: CapturePayload) => void;
}

/** Longest edge, in pixels, of a frame sent to the server. */
const MAX_CAPTURE_EDGE = 1280;

export const ScanModal: React.FC<ScanModalProps> = ({ isOpen, onClose, onCapture }) => {
  const t = useT();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const readerRef = useRef<BarcodeReader | null>(null);
  const scanLoopRef = useRef<number | null>(null);
  const wasAlignedRef = useRef<boolean>(false);

  const [scanMode, setScanMode] = useState<ScanMode>('shelf');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isTorchAvailable, setIsTorchAvailable] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [barcodeEngine, setBarcodeEngine] = useState<BarcodeReader['engine'] | null>(null);
  const [barcodeError, setBarcodeError] = useState<string | null>(null);
  const [showDemoShelves, setShowDemoShelves] = useState(false);
  const [roll, setRoll] = useState<number | null>(null);
  const [pitch, setPitch] = useState<number | null>(null);
  const [orientationPermissionNeeded, setOrientationPermissionNeeded] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasOrientation = roll !== null && pitch !== null;
  const isRollValid = roll !== null && Math.abs(roll) <= 7;
  const isPitchValid = pitch !== null && Math.abs(pitch - 90) <= 7;
  const isAligned = hasOrientation ? isRollValid && isPitchValid : true;

  const stopCamera = useCallback(() => {
    if (scanLoopRef.current !== null) {
      window.clearTimeout(scanLoopRef.current);
      scanLoopRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setIsCameraReady(false);
    setIsTorchOn(false);
    setIsTorchAvailable(false);
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError(t.scanner.noCameraApi);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
      const [track] = stream.getVideoTracks();
      const capabilities = track?.getCapabilities?.() as MediaTrackCapabilities | undefined;
      setIsTorchAvailable(Boolean(capabilities?.torch));
      setIsCameraReady(true);
    } catch (error) {
      const name = error instanceof DOMException ? error.name : '';
      setCameraError(
        name === 'NotAllowedError'
          ? t.scanner.permissionDenied
          : name === 'NotFoundError'
            ? t.scanner.notFound
            : t.camera.startFailed(formatError(t, error))
      );
    }
  }, [t]);

  // Camera lifecycle
  useEffect(() => {
    if (isOpen) {
      void startCamera();
    } else {
      stopCamera();
    }
    return stopCamera;
  }, [isOpen, startCamera, stopCamera]);

  // Torch control on the live track
  useEffect(() => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track || !isTorchAvailable) return;
    track.applyConstraints({ advanced: [{ torch: isTorchOn }] }).catch(() => {
      setIsTorchAvailable(false);
    });
  }, [isTorchOn, isTorchAvailable]);

  // Device orientation (real gyro only; no simulated angles)
  useEffect(() => {
    if (!isOpen) {
      setRoll(null);
      setPitch(null);
      wasAlignedRef.current = false;
      return;
    }

    const handleOrientation = (event: DeviceOrientationEvent) => {
      if (event.gamma === null || event.beta === null) return;
      setRoll(Math.round(event.gamma * 10) / 10);
      setPitch(Math.round(event.beta * 10) / 10);
    };

    const requestPermission = (
      DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<PermissionState> }
    ).requestPermission;

    if (typeof requestPermission === 'function') {
      // iOS 13+ requires an explicit user gesture before orientation events fire.
      setOrientationPermissionNeeded(true);
    } else if ('DeviceOrientationEvent' in window) {
      window.addEventListener('deviceorientation', handleOrientation, true);
    }

    return () => window.removeEventListener('deviceorientation', handleOrientation, true);
  }, [isOpen]);

  const enableOrientation = async () => {
    const requestPermission = (
      DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<PermissionState> }
    ).requestPermission;
    if (typeof requestPermission !== 'function') return;
    const state = await requestPermission();
    if (state === 'granted') {
      setOrientationPermissionNeeded(false);
      window.addEventListener(
        'deviceorientation',
        (event: DeviceOrientationEvent) => {
          if (event.gamma === null || event.beta === null) return;
          setRoll(Math.round(event.gamma * 10) / 10);
          setPitch(Math.round(event.beta * 10) / 10);
        },
        true
      );
    }
  };

  // Haptic tap when the device enters the stable capture window
  useEffect(() => {
    if (!isOpen || !hasOrientation) return;
    if (isAligned && !wasAlignedRef.current) haptic.lightImpact();
    wasAlignedRef.current = isAligned;
  }, [isAligned, isOpen, hasOrientation]);

  /**
   * Grabs a frame, downscaled so the upload stays small. A full 1920px frame is
   * 1-3MB once base64 encoded, which is slow on mobile and wasteful to send to
   * the vision model; 1280px is plenty to read book spines.
   */
  const grabFrame = useCallback((maxEdge = MAX_CAPTURE_EDGE): string | null => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !video.videoWidth) return null;

    const scale = Math.min(1, maxEdge / Math.max(video.videoWidth, video.videoHeight));
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.85);
  }, []);

  // Continuous barcode / QR detection while those modes are active
  useEffect(() => {
    if (!isOpen || scanMode === 'shelf' || !isCameraReady) return;

    let cancelled = false;
    setBarcodeError(null);

    const start = async () => {
      let reader: BarcodeReader;
      try {
        reader = await createBarcodeReader(scanMode);
      } catch (error) {
        if (!cancelled) {
          setBarcodeError(t.scanner.barcodeUnavailable(formatError(t, error)));
        }
        return;
      }
      if (cancelled) {
        reader.dispose();
        return;
      }

      readerRef.current = reader;
      setBarcodeEngine(reader.engine);

      const tick = async () => {
        if (cancelled) return;
        const video = videoRef.current;
        if (video && video.videoWidth) {
          try {
            const value = await reader.detect(video);
            if (value) {
              haptic.success();
              onCapture({ imageUrl: grabFrame() ?? '', mode: scanMode, barcode: value });
              return;
            }
          } catch {
            // A single failed frame is not fatal; keep polling.
          }
        }
        // ZXing decodes a whole frame in software, so give it a longer interval.
        scanLoopRef.current = window.setTimeout(tick, reader.engine === 'native' ? 350 : 600);
      };

      void tick();
    };

    void start();

    return () => {
      cancelled = true;
      if (scanLoopRef.current !== null) {
        window.clearTimeout(scanLoopRef.current);
        scanLoopRef.current = null;
      }
      readerRef.current?.dispose();
      readerRef.current = null;
    };
  }, [isOpen, scanMode, isCameraReady, grabFrame, onCapture, t]);

  if (!isOpen) return null;

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (loaded) => {
      if (loaded.target?.result) {
        onCapture({ imageUrl: loaded.target.result as string, mode: scanMode });
      }
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const handleShutter = () => {
    haptic.mediumImpact();
    const frame = grabFrame();
    if (!frame) {
      setCameraError(t.scanner.frameFailed);
      return;
    }
    onCapture({ imageUrl: frame, mode: scanMode });
  };

  const signedRoll = roll === null ? '' : `${roll > 0 ? '+' : ''}${roll.toFixed(1)}`;
  const alignmentLabel = !hasOrientation
    ? t.scanner.gyroUnavailable
    : isAligned
      ? t.scanner.levelLocked(signedRoll, pitch!.toFixed(0))
      : t.scanner.tilted(signedRoll);

  return (
    <div className="fixed inset-0 z-50 bg-[#12100E] flex flex-col justify-between overflow-hidden">
      {/* Top HUD */}
      <div className="relative z-20 p-4 sm:px-6 flex flex-col gap-4 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex justify-between items-center w-full gap-2">
          <button
            onClick={() => {
              haptic.lightImpact();
              onClose();
            }}
            className="text-[#F4EFE6] bg-black/40 backdrop-blur-md p-2 rounded-full hairline-border hover:bg-black/70 transition-colors"
            aria-label={t.scanner.closeLabel}
          >
            <span className="material-symbols-outlined text-[24px]" aria-hidden="true">close</span>
          </button>

          <div
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full backdrop-blur-md font-mono-ibm text-[10px] sm:text-[11px] tracking-wider shadow-lg select-none ${
              !hasOrientation
                ? 'bg-black/60 text-[#A79C8C] border border-[#3A332A]'
                : isAligned
                  ? 'bg-[#1C2C1D]/90 text-[#85E07D] border border-[#6E8F6A]'
                  : 'bg-[#3A2412]/90 text-[#F5BD62] border border-[#C9963F]'
            }`}
          >
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                !hasOrientation ? 'bg-[#3A332A]' : isAligned ? 'bg-[#6E8F6A]' : 'bg-[#C9963F] animate-ping'
              }`}
            />
            <span className="font-semibold">{alignmentLabel}</span>
          </div>

          <div className="flex items-center gap-2">
            {orientationPermissionNeeded && (
              <button
                onClick={enableOrientation}
                className="p-2 rounded-full backdrop-blur-md hairline-border bg-black/40 text-[#F4EFE6] hover:bg-black/70 transition-colors"
                title={t.scanner.enableLevel}
               aria-label={t.scanner.enableLevel}>
                <span className="material-symbols-outlined text-[20px]" aria-hidden="true">screen_rotation</span>
              </button>
            )}
            {isTorchAvailable && (
              <button
                onClick={() => {
                  haptic.lightImpact();
                  setIsTorchOn((on) => !on);
                }}
                className={`p-2 rounded-full backdrop-blur-md hairline-border transition-colors ${
                  isTorchOn ? 'bg-[#C9963F] text-[#12100E]' : 'bg-black/40 text-[#F4EFE6] hover:bg-black/70'
                }`}
                title={t.scanner.toggleTorch}
               aria-label={t.scanner.toggleTorch}>
                <span className="material-symbols-outlined text-[22px]" aria-hidden="true">{isTorchOn ? 'flash_on' : 'flash_off'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Mode toggle */}
        <div className="flex self-center bg-black/40 backdrop-blur-md p-1 rounded-full hairline-border w-max shadow-lg">
          {(['shelf', 'isbn', 'qr'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => {
                haptic.selectionClick();
                setScanMode(mode);
              }}
              className={`px-4 sm:px-6 py-1.5 rounded-full font-mono-ibm text-[11px] font-bold tracking-wider transition-all ${
                scanMode === mode ? 'bg-[#C9963F] text-[#12100E] shadow-sm' : 'text-[#A79C8C] hover:text-[#F4EFE6]'
              }`}
            >
              {t.scanner.modes[mode]}
            </button>
          ))}
        </div>
      </div>

      {/* Live viewfinder */}
      <div className="absolute inset-0 z-10 flex items-center justify-center bg-black">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover ${cameraError ? 'opacity-0' : 'opacity-100'}`}
        />
        <canvas ref={canvasRef} className="hidden" />

        {cameraError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-8 text-center">
            <span className="material-symbols-outlined text-[44px] text-[#C97A3F]" aria-hidden="true">videocam_off</span>
            <p className="font-sans-inter text-[14px] text-[#F4EFE6] max-w-sm leading-relaxed">{cameraError}</p>
            <button
              onClick={() => void startCamera()}
              className="px-4 py-2 bg-[#262119] hairline-border rounded-xl font-mono-ibm text-[11px] text-[#C9963F] uppercase tracking-wider"
            >
              {t.scanner.retryCamera}
            </button>
          </div>
        )}

        {!cameraError && scanMode !== 'shelf' && barcodeError && (
          <div className="absolute bottom-40 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/80 rounded-xl hairline-border max-w-xs text-center">
            <p className="font-mono-ibm text-[11px] text-[#FF6B6B] leading-relaxed">{barcodeError}</p>
          </div>
        )}

        {!cameraError && scanMode !== 'shelf' && !barcodeError && barcodeEngine === 'zxing' && (
          <div className="absolute bottom-40 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-black/70 rounded-full hairline-border">
            <p className="font-mono-ibm text-[10px] text-[#A79C8C] uppercase tracking-wider">
              {t.scanner.softwareDecoder}
            </p>
          </div>
        )}

        {/* Framing guide */}
        {!cameraError && (
          <div
            className={`absolute pointer-events-none flex flex-col justify-between p-3 transition-all duration-300 ${
              scanMode === 'shelf'
                ? 'inset-x-6 sm:inset-x-16 inset-y-24 sm:inset-y-28 rounded-xl'
                : scanMode === 'qr'
                  ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-xl'
                  : 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-40 rounded-lg'
            } ${
              isAligned
                ? 'border-2 border-[#6E8F6A]/90 shadow-[0_0_30px_rgba(110,143,106,0.3)]'
                : 'border border-[#C9963F]/60 shadow-[0_0_20px_rgba(201,150,63,0.15)]'
            }`}
          >
            <div className="flex justify-between w-full">
              <div className={`w-6 h-6 border-t-2 border-l-2 ${isAligned ? 'border-[#85E07D]' : 'border-[#C9963F]'}`} />
              <div className={`w-6 h-6 border-t-2 border-r-2 ${isAligned ? 'border-[#85E07D]' : 'border-[#C9963F]'}`} />
            </div>

            <div className="flex flex-col items-center gap-2">
              {scanMode === 'shelf' && hasOrientation && (
                <div className="relative w-48 h-6 flex items-center justify-center">
                  <div className="absolute w-full h-[1px] bg-white/20" />
                  <motion.div
                    animate={{ rotate: roll ?? 0 }}
                    transition={{ type: 'spring', damping: 15, stiffness: 200 }}
                    className={`w-36 h-1 rounded-full shadow-md ${isAligned ? 'bg-[#85E07D]' : 'bg-[#C9963F]'}`}
                  />
                  <div
                    className={`w-3 h-3 rounded-full border-2 border-black z-10 ${
                      isAligned ? 'bg-[#85E07D]' : 'bg-[#C9963F]'
                    }`}
                  />
                </div>
              )}

              <span
                className={`px-3 py-1 rounded text-[11px] font-mono-ibm font-semibold uppercase tracking-widest backdrop-blur-md hairline-border text-center ${
                  isAligned ? 'bg-[#18261A]/90 text-[#85E07D] border-[#6E8F6A]' : 'bg-black/70 text-[#F4EFE6] border-[#C9963F]/60'
                }`}
              >
                {scanMode === 'shelf'
                  ? isAligned
                    ? t.scanner.alignReady
                    : t.scanner.alignSpines
                  : scanMode === 'isbn'
                    ? t.scanner.frameIsbn
                    : t.scanner.frameQr}
              </span>
            </div>

            <div className="flex justify-between w-full">
              <div className={`w-6 h-6 border-b-2 border-l-2 ${isAligned ? 'border-[#85E07D]' : 'border-[#C9963F]'}`} />
              <div className={`w-6 h-6 border-b-2 border-r-2 ${isAligned ? 'border-[#85E07D]' : 'border-[#C9963F]'}`} />
            </div>
          </div>
        )}
      </div>

      {/* Bottom controls */}
      <div className="relative z-20 p-4 sm:px-8 pb-8 pt-3 bg-gradient-to-t from-black via-black/80 to-transparent flex flex-col gap-3">
        <button
          onClick={() => setShowDemoShelves((open) => !open)}
          className="self-center font-mono-ibm text-[10px] text-[#A79C8C] hover:text-[#C9963F] uppercase tracking-widest flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-[14px]" aria-hidden="true">science</span>
          {showDemoShelves ? t.scanner.hideDemo : t.scanner.tryDemo}
        </button>

        <AnimatePresence>
          {showDemoShelves && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1"
            >
              <span className="font-mono-ibm text-[10px] text-[#C97A3F] shrink-0 uppercase tracking-widest">
                {t.scanner.demoData}
              </span>
              {SPIKE_DATASET.slice(0, 8).map((sample, index) => (
                <button
                  key={sample.id}
                  onClick={() => {
                    haptic.selectionClick();
                    onCapture({ imageUrl: sample.imageUrl, mode: 'shelf', sample });
                  }}
                  className="px-2.5 py-1 rounded text-[11px] font-mono-ibm shrink-0 bg-black/60 text-[#A79C8C] hairline-border hover:text-[#F4EFE6] transition-all"
                >
                  #{index + 1} {sample.name.split('—')[1] || sample.name}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center justify-between max-w-md mx-auto w-full px-4">
          <div>
            <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleFileUpload} />
            <button
              onClick={() => {
                haptic.lightImpact();
                fileInputRef.current?.click();
              }}
              className="w-12 h-12 rounded-full bg-black/60 backdrop-blur-md hairline-border text-[#F4EFE6] flex items-center justify-center hover:bg-black/90 transition-colors"
              title={t.scanner.uploadPhoto}
             aria-label={t.scanner.uploadPhoto}>
              <span className="material-symbols-outlined text-[24px]" aria-hidden="true">photo_library</span>
            </button>
          </div>

          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={handleShutter}
            disabled={!isCameraReady}
            className={`w-20 h-20 rounded-full border-4 p-1.5 flex items-center justify-center transition-all bg-black/40 disabled:opacity-40 ${
              isAligned ? 'border-[#6E8F6A] shadow-[0_0_28px_rgba(110,143,106,0.6)]' : 'border-[#C9963F] shadow-[0_0_24px_rgba(201,150,63,0.5)]'
            }`}
            title={t.scanner.capture}
          >
            <div
              className={`w-full h-full rounded-full flex items-center justify-center text-[#12100E] ${
                isAligned ? 'bg-[#6E8F6A]' : 'bg-[#C9963F]'
              }`}
            >
              <span className="material-symbols-outlined text-[32px] font-bold" aria-hidden="true">photo_camera</span>
            </div>
          </motion.button>

          <button
            onClick={() => {
              haptic.lightImpact();
              onClose();
            }}
            className="w-12 h-12 rounded-full bg-black/60 backdrop-blur-md hairline-border text-[#F4EFE6] flex items-center justify-center hover:bg-black/90 transition-colors"
            title={t.common.cancel}
           aria-label={t.common.cancel}>
            <span className="material-symbols-outlined text-[24px]" aria-hidden="true">close</span>
          </button>
        </div>
      </div>
    </div>
  );
};
