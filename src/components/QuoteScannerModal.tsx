import React, { useRef, useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { haptic } from '../services/haptics';
import { postJson } from '../services/apiClient';
import { ModalShell } from './ModalShell';
import { useT } from '../i18n/I18nProvider';
import { formatError } from '../i18n/formatError';

interface QuoteScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanComplete: (text: string) => void;
}

export const QuoteScannerModal: React.FC<QuoteScannerModalProps> = ({ isOpen, onClose, onScanComplete }) => {
  const t = useT();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen]);

  const startCamera = useCallback(async () => {
    setError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: { ideal: 1920 } } 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      const name = err instanceof DOMException ? err.name : '';
      setError(
        name === 'NotAllowedError'
          ? t.camera.permissionDenied
          : name === 'NotFoundError'
            ? t.camera.notFound
            : t.camera.startFailed(formatError(t, err))
      );
    }
  }, [t]);

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const captureAndScan = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    haptic.mediumImpact();
    setIsScanning(true);
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageBase64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
      
      try {
        const payload = await postJson<{ text?: string }>('/api/gemini/quote', { imageBase64 });
        if (!payload?.text) {
          throw new Error(t.quoteScanner.noText);
        }
        onScanComplete(payload.text);
        onClose();
      } catch (err) {
        setError(formatError(t, err));
        setIsScanning(false);
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <ModalShell isOpen onClose={onClose} label={t.quoteScanner.dialogLabel} closeOnBackdrop={false} className="contents">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center p-4"
        >
          <div className="w-full max-w-lg bg-[#1C1916] border border-[#3A332A] rounded-2xl overflow-hidden shadow-2xl relative flex flex-col h-[80vh] max-h-[700px]">
            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b border-[#3A332A] bg-[#12100E]">
              <h2 className="font-serif-literata text-[18px] text-[#F4EFE6] font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-[#C9963F]">document_scanner</span>
                {t.quoteScanner.title}
              </h2>
              <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-[#2C251D] text-[#A79C8C] hover:text-[#C9963F] transition-colors">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            
            {/* Camera Viewport */}
            <div className="relative flex-1 bg-black overflow-hidden flex items-center justify-center">
              {error ? (
                <div className="flex flex-col items-center gap-3 px-6 text-center">
                  <p className="text-[#FF6B6B] font-mono-ibm text-[12px] leading-relaxed">{error}</p>
                  <button
                    onClick={() => {
                      setError(null);
                      setIsScanning(false);
                      void startCamera();
                    }}
                    className="px-4 py-2 bg-[#262119] hairline-border rounded-xl font-mono-ibm text-[11px] text-[#C9963F] uppercase tracking-wider"
                  >
                    {t.common.retry}
                  </button>
                </div>
              ) : (
                <>
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    muted 
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  {/* Framing Guide */}
                  <div className="absolute inset-4 border-2 border-dashed border-[#C9963F]/50 rounded-xl pointer-events-none"></div>
                  <canvas ref={canvasRef} className="hidden" />
                </>
              )}

              {/* Scanning Overlay */}
              {isScanning && (
                <div className="absolute inset-0 bg-[#C9963F]/10 flex flex-col items-center justify-center backdrop-blur-sm z-10">
                  <div className="w-12 h-12 border-4 border-[#C9963F]/20 border-t-[#C9963F] rounded-full animate-spin mb-4" />
                  <p className="text-[#C9963F] font-mono-ibm text-[12px] uppercase tracking-widest font-bold">{t.quoteScanner.extracting}</p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="p-6 bg-[#12100E] border-t border-[#3A332A] flex flex-col items-center gap-4">
              <p className="text-[#A79C8C] text-[12px] text-center font-sans-inter">
                {t.quoteScanner.hint}
              </p>
              <button
                onClick={captureAndScan}
                disabled={isScanning || !!error}
                className="w-16 h-16 rounded-full bg-[#C9963F] text-[#12100E] shadow-[0_4px_24px_rgba(201,150,63,0.4)] flex items-center justify-center hover:scale-105 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:scale-100 border-2 border-[#12100E]"
              >
                <span className="material-symbols-outlined text-[30px] font-bold">photo_camera</span>
              </button>
            </div>
          </div>
        </motion.div>
        </ModalShell>
      )}
    </AnimatePresence>
  );
};
