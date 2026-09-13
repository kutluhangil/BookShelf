// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cropRegions } from '../services/imageCrop';
import { AppError } from '../services/appError';

/**
 * The contract under test is a storage one: a box that cannot be cropped must
 * never yield the shelf photo. That photo is a multi-megabyte data URL and the
 * caller writes the result onto every book it creates, so one failed crop used
 * to mean one copy of the whole photo per book — enough to exhaust the local
 * storage quota in a single scan.
 */

const SHELF = 'data:image/jpeg;base64,SHELFPHOTO';
const CROP = 'data:image/jpeg;base64,CROP';

function stubImage(outcome: 'load' | 'error'): void {
  class FakeImage {
    naturalWidth = 1000;
    naturalHeight = 500;
    crossOrigin = '';
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    set src(_value: string) {
      queueMicrotask(() => (outcome === 'load' ? this.onload?.() : this.onerror?.()));
    }
  }
  vi.stubGlobal('Image', FakeImage);
}

function stubCanvas(context: unknown, toDataURL: () => string): void {
  const canvas = {
    width: 0,
    height: 0,
    getContext: () => context,
    toDataURL,
  };
  vi.spyOn(document, 'createElement').mockReturnValue(canvas as unknown as HTMLElement);
}

const CONTEXT = { clearRect: () => undefined, drawImage: () => undefined };

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('cropRegions', () => {
  it('returns nothing for no boxes', async () => {
    await expect(cropRegions(SHELF, [])).resolves.toEqual([]);
  });

  it('returns one thumbnail per box', async () => {
    stubImage('load');
    stubCanvas(CONTEXT, () => CROP);

    const crops = await cropRegions(SHELF, [
      { x: 0, y: 0, width: 10, height: 80 },
      { x: 20, y: 0, width: 10, height: 80 },
    ]);

    expect(crops).toEqual([CROP, CROP]);
  });

  it('yields null for a box too thin to be a spine, never the shelf photo', async () => {
    stubImage('load');
    stubCanvas(CONTEXT, () => CROP);

    const crops = await cropRegions(SHELF, [{ x: 0, y: 0, width: 0, height: 0 }], { padPercent: 0 });

    expect(crops).toEqual([null]);
    expect(crops).not.toContain(SHELF);
  });

  it('yields null when the canvas is tainted, never the shelf photo', async () => {
    stubImage('load');
    stubCanvas(CONTEXT, () => {
      throw new Error('tainted canvas');
    });

    const crops = await cropRegions(SHELF, [{ x: 0, y: 0, width: 10, height: 80 }]);

    expect(crops).toEqual([null]);
  });

  it('raises a coded error when the photo will not decode', async () => {
    stubImage('error');

    await expect(cropRegions(SHELF, [{ x: 0, y: 0, width: 10, height: 80 }])).rejects.toMatchObject({
      code: 'capture.decodeFailed',
    });
  });

  it('raises a coded error when the browser has no 2D canvas', async () => {
    stubImage('load');
    stubCanvas(null, () => CROP);

    const failure = await cropRegions(SHELF, [{ x: 0, y: 0, width: 10, height: 80 }]).catch((e) => e);

    expect(failure).toBeInstanceOf(AppError);
    expect((failure as AppError).code).toBe('device.canvasUnavailable');
  });
});
