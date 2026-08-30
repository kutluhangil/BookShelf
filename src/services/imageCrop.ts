/**
 * Crops individual book spines out of a shelf photo using the bounding boxes the
 * vision model returns. Without this every book's "proof of capture" shows the
 * entire shelf, which makes the feature meaningless.
 */

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
 * Returns one data URL per box, in the same order. A box that cannot be cropped
 * falls back to the source image so the caller always gets a usable value.
 */
export async function cropRegions(
  sourceDataUrl: string,
  boxes: PercentBox[],
  options: { padPercent?: number; maxEdge?: number } = {}
): Promise<string[]> {
  if (boxes.length === 0) return [];

  const { padPercent = 1, maxEdge = 320 } = options;

  let image: HTMLImageElement;
  try {
    image = await loadImage(sourceDataUrl);
  } catch {
    return boxes.map(() => sourceDataUrl);
  }

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return boxes.map(() => sourceDataUrl);

  return boxes.map((rawBox) => {
    const box = padBox(rawBox, padPercent);

    const sx = (box.x / 100) * image.naturalWidth;
    const sy = (box.y / 100) * image.naturalHeight;
    const sw = (box.width / 100) * image.naturalWidth;
    const sh = (box.height / 100) * image.naturalHeight;

    if (sw < 2 || sh < 2) return sourceDataUrl;

    const scale = Math.min(1, maxEdge / Math.max(sw, sh));
    canvas.width = Math.max(1, Math.round(sw * scale));
    canvas.height = Math.max(1, Math.round(sh * scale));

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

    try {
      return canvas.toDataURL('image/jpeg', 0.82);
    } catch {
      // A tainted canvas (remote image without CORS headers) throws here.
      return sourceDataUrl;
    }
  });
}
