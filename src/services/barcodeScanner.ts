/**
 * Barcode reading with a graceful fallback.
 *
 * The Barcode Detection API is Chromium-only, so on Safari and Firefox — which
 * includes every iPhone — ISBN scanning would otherwise be unavailable. ZXing is
 * loaded lazily as a fallback so the 300KB decoder only reaches browsers that
 * actually need it.
 */

export type ScanKind = 'isbn' | 'qr';

export interface BarcodeReader {
  /** Which implementation is in use, for diagnostics and UI copy. */
  engine: 'native' | 'zxing';
  detect(source: HTMLVideoElement): Promise<string | null>;
  dispose(): void;
}

const NATIVE_FORMATS: Record<ScanKind, string[]> = {
  isbn: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'],
  qr: ['qr_code'],
};

function createNativeReader(kind: ScanKind): BarcodeReader | null {
  const Detector = window.BarcodeDetector;
  if (!Detector) return null;

  const detector = new Detector({ formats: NATIVE_FORMATS[kind] });

  return {
    engine: 'native',
    async detect(source) {
      const results = await detector.detect(source);
      return results[0]?.rawValue ?? null;
    },
    dispose() {
      // Nothing to release for the native detector.
    },
  };
}

async function createZxingReader(kind: ScanKind): Promise<BarcodeReader> {
  const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([
    import('@zxing/browser'),
    import('@zxing/library'),
  ]);

  const formats =
    kind === 'qr'
      ? [BarcodeFormat.QR_CODE]
      : [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E, BarcodeFormat.CODE_128];

  const hints = new Map();
  hints.set(DecodeHintType.POSSIBLE_FORMATS, formats);

  const reader = new BrowserMultiFormatReader(hints);
  const canvas = document.createElement('canvas');

  return {
    engine: 'zxing',
    async detect(source) {
      if (!source.videoWidth) return null;
      canvas.width = source.videoWidth;
      canvas.height = source.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.drawImage(source, 0, 0, canvas.width, canvas.height);

      try {
        const result = reader.decodeFromCanvas(canvas);
        return result.getText();
      } catch {
        // ZXing throws NotFoundException on every frame without a barcode.
        return null;
      }
    },
    dispose() {
      canvas.width = 0;
      canvas.height = 0;
    },
  };
}

/** Returns the best available reader for this browser. */
export async function createBarcodeReader(kind: ScanKind): Promise<BarcodeReader> {
  return createNativeReader(kind) ?? (await createZxingReader(kind));
}
