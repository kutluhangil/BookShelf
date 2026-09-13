/**
 * Crops individual book spines out of a shelf photo using the bounding boxes the
 * vision model returns. Without this every book's "proof of capture" shows the
 * entire shelf, which makes the feature meaningless.
 *
 * A box that cannot be cropped yields `null` rather than the source image. The
 * shelf photo is a multi-megabyte data URL and the caller stores the result on
 * every book it creates, so falling back to it wrote one copy of the whole
 * photo per book — both useless as a thumbnail and enough to exhaust the local
 * storage quota in a single scan.
 */

import { AppError, toDetail } from './appError';

export interface PercentBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    // Data URLs need no CORS, but a remote sample image would taint the canvas.
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Could not decode the captured image for cropping.'));
    image.src = src;
  });
}

/** Adds breathing room around a box, clamped to the image bounds. */
function padBox(box: PercentBox, padPercent: number): PercentBox {
  const x = Math.max(0, box.x - padPercent);
  const y = Math.max(0, box.y - padPercent);
  return {
    x,
    y,
    width: Math.min(100 - x, box.width + padPercent * 2),
    height: Math.min(100 - y, box.height + padPercent * 2),
  };
}

/**
 * Returns one entry per box, in the same order: the spine's own thumbnail as a
 * data URL, or `null` for a box this photo cannot produce a thumbnail for.
 *
 * A failure that affects the whole batch — the photo will not decode, the
 * browser has no 2D canvas — is raised, not papered over: the caller asked for
 * crops and there are none, and the reader can act on both messages.
 */
export async function cropRegions(
  sourceDataUrl: string,
  boxes: PercentBox[],
  options: { padPercent?: number; maxEdge?: number } = {}
): Promise<Array<string | null>> {
  if (boxes.length === 0) return [];

  const { padPercent = 1, maxEdge = 320 } = options;

  let image: HTMLImageElement;
  try {
    image = await loadImage(sourceDataUrl);
  } catch (error) {
    throw new AppError('capture.decodeFailed', {}, { detail: toDetail(error), cause: error });
  }

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new AppError('device.canvasUnavailable', {});

  return boxes.map((rawBox) => {
    const box = padBox(rawBox, padPercent);

    const sx = (box.x / 100) * image.naturalWidth;
    const sy = (box.y / 100) * image.naturalHeight;
    const sw = (box.width / 100) * image.naturalWidth;
    const sh = (box.height / 100) * image.naturalHeight;

    // A box this thin is a detection artefact, not a spine.
    if (sw < 2 || sh < 2) return null;

    const scale = Math.min(1, maxEdge / Math.max(sw, sh));
    canvas.width = Math.max(1, Math.round(sw * scale));
    canvas.height = Math.max(1, Math.round(sh * scale));

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

    try {
      return canvas.toDataURL('image/jpeg', 0.82);
    } catch {
      // A tainted canvas (remote image without CORS headers) throws here. It
      // costs this one thumbnail, not the scan.
      return null;
    }
  });
}
