// @vitest-environment jsdom
import React from 'react';
import { describe, expect, it, afterEach, beforeEach, vi } from 'vitest';
import { render, cleanup, act, fireEvent } from '@testing-library/react';
import { I18nProvider } from '../i18n/I18nProvider';
import { LOCALE_STORAGE_KEY } from '../i18n/locale';
import { en } from '../i18n/messages/en';
import { QuoteScannerModal } from '../components/QuoteScannerModal';

/** A stream that only records how many of its tracks were stopped. */
const createFakeStream = () => {
  const state = { stopped: 0 } as { stopped: number; stream: MediaStream };
  const track = { stop: () => { state.stopped += 1; } };
  state.stream = { getTracks: () => [track] } as unknown as MediaStream;
  return state;
};

const setGetUserMedia = (implementation: () => Promise<MediaStream>) => {
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia: implementation },
  });
};

beforeEach(() => {
  localStorage.setItem(LOCALE_STORAGE_KEY, 'en');
  HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
});

afterEach(() => {
  localStorage.clear();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  cleanup();
});

const scanner = (
  isOpen: boolean,
  onScanComplete: (text: string) => void = () => {},
  onClose: () => void = () => {}
) => (
  <I18nProvider>
    <QuoteScannerModal isOpen={isOpen} onClose={onClose} onScanComplete={onScanComplete} />
  </I18nProvider>
);

describe('QuoteScannerModal camera lifecycle', () => {
  it('releases a camera that arrives after the scanner closed', async () => {
    const fake = createFakeStream();
    let release: (() => void) | null = null;
    setGetUserMedia(() => new Promise<MediaStream>((resolve) => { release = () => resolve(fake.stream); }));

    const view = render(scanner(true));
    await act(async () => {});

    view.rerender(scanner(false));
    expect(release).not.toBeNull();
    await act(async () => {
      release!();
    });

    expect(fake.stopped).toBe(1);
  });
});

describe('QuoteScannerModal capture', () => {
  const openWithCamera = async () => {
    const fake = createFakeStream();
    setGetUserMedia(() => Promise.resolve(fake.stream));
    const view = render(scanner(true));
    await act(async () => {});
    return view;
  };

  it('clears the scanning overlay once a scan succeeds', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ text: 'a quote' }), { status: 200 }))
    );
    HTMLCanvasElement.prototype.getContext = vi.fn(() => ({ drawImage: () => undefined })) as never;
    HTMLCanvasElement.prototype.toDataURL = vi.fn(() => 'data:image/jpeg;base64,AAA');

    const scanned: string[] = [];
    const fake = createFakeStream();
    setGetUserMedia(() => Promise.resolve(fake.stream));
    const view = render(scanner(true, (text) => {
      scanned.push(text);
    }));
    await act(async () => {});

    await act(async () => {
      fireEvent.click(view.getByLabelText(en.quoteScanner.capture));
    });

    expect(scanned).toEqual(['a quote']);
    // The component stays mounted between scans, so a spinner left running here
    // would block every later capture.
    expect(view.queryByText(en.quoteScanner.extracting)).toBeNull();
    expect((view.getByLabelText(en.quoteScanner.capture) as HTMLButtonElement).disabled).toBe(false);
  });

  it('reports a browser with no 2D canvas instead of spinning forever', async () => {
    HTMLCanvasElement.prototype.getContext = vi.fn(() => null) as never;

    const view = await openWithCamera();
    await act(async () => {
      fireEvent.click(view.getByLabelText(en.quoteScanner.capture));
    });

    expect(view.queryByText(en.quoteScanner.extracting)).toBeNull();
    expect(view.getByText(en.errors['device.canvasUnavailable']({}))).toBeTruthy();
  });
});
