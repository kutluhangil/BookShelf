// @vitest-environment jsdom
import React from 'react';
import { describe, expect, it, afterEach, beforeEach, vi } from 'vitest';
import { render, cleanup, act } from '@testing-library/react';
import { I18nProvider } from '../i18n/I18nProvider';
import { LOCALE_STORAGE_KEY } from '../i18n/locale';
import { ScanModal } from '../components/ScanModal';

interface FakeStream {
  stopped: number;
  stream: MediaStream;
}

/** A stream that only records how many of its tracks were stopped. */
const createFakeStream = (): FakeStream => {
  const state = { stopped: 0 } as FakeStream;
  const track = {
    stop: () => {
      state.stopped += 1;
    },
    getCapabilities: () => ({}),
    applyConstraints: () => Promise.resolve(),
  };
  state.stream = {
    getTracks: () => [track],
    getVideoTracks: () => [track],
  } as unknown as MediaStream;
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
  cleanup();
});

const renderScanner = (isOpen: boolean) =>
  render(
    <I18nProvider>
      <ScanModal isOpen={isOpen} onClose={() => {}} onCapture={() => {}} />
    </I18nProvider>
  );

describe('ScanModal camera lifecycle', () => {
  it('stops the camera when the scanner closes', async () => {
    const fake = createFakeStream();
    setGetUserMedia(() => Promise.resolve(fake.stream));

    const view = renderScanner(true);
    await act(async () => {});

    view.rerender(
      <I18nProvider>
        <ScanModal isOpen={false} onClose={() => {}} onCapture={() => {}} />
      </I18nProvider>
    );

    expect(fake.stopped).toBe(1);
  });

  it('releases a camera that arrives after the scanner closed', async () => {
    const fake = createFakeStream();
    let release: (() => void) | null = null;
    setGetUserMedia(
      () =>
        new Promise<MediaStream>((resolve) => {
          release = () => resolve(fake.stream);
        })
    );

    const view = renderScanner(true);
    await act(async () => {});

    // The reader closes the scanner while the camera is still warming up.
    view.rerender(
      <I18nProvider>
        <ScanModal isOpen={false} onClose={() => {}} onCapture={() => {}} />
      </I18nProvider>
    );

    expect(release).not.toBeNull();
    await act(async () => {
      release!();
    });

    expect(fake.stopped).toBe(1);
  });

  it('releases the stream of a start that a reopen superseded', async () => {
    const first = createFakeStream();
    const second = createFakeStream();
    const pending: Array<(stream: MediaStream) => void> = [];
    setGetUserMedia(() => new Promise<MediaStream>((resolve) => pending.push(resolve)));

    const view = renderScanner(true);
    await act(async () => {});

    view.rerender(
      <I18nProvider>
        <ScanModal isOpen={false} onClose={() => {}} onCapture={() => {}} />
      </I18nProvider>
    );
    view.rerender(
      <I18nProvider>
        <ScanModal isOpen onClose={() => {}} onCapture={() => {}} />
      </I18nProvider>
    );
    await act(async () => {});

    expect(pending).toHaveLength(2);
    // The first camera resolves last; it belongs to a session that is gone.
    await act(async () => {
      pending[1](second.stream);
      pending[0](first.stream);
    });

    expect(first.stopped).toBe(1);
    expect(second.stopped).toBe(0);
  });
});
