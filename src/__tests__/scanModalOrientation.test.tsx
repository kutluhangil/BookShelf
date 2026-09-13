// @vitest-environment jsdom
import React from 'react';
import { describe, expect, it, afterEach, beforeEach, vi } from 'vitest';
import { render, cleanup, act, fireEvent } from '@testing-library/react';
import { I18nProvider } from '../i18n/I18nProvider';
import { LOCALE_STORAGE_KEY } from '../i18n/locale';
import { ScanModal } from '../components/ScanModal';

type OrientationEventConstructor = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<PermissionState>;
};

/** Keeps the set of deviceorientation listeners currently on the window. */
const trackOrientationListeners = () => {
  const listeners = new Set<unknown>();
  const add = window.addEventListener.bind(window);
  const remove = window.removeEventListener.bind(window);
  vi.spyOn(window, 'addEventListener').mockImplementation((type, listener, options) => {
    if (type === 'deviceorientation') listeners.add(listener);
    add(type, listener as EventListener, options);
  });
  vi.spyOn(window, 'removeEventListener').mockImplementation((type, listener, options) => {
    if (type === 'deviceorientation') listeners.delete(listener);
    remove(type, listener as EventListener, options);
  });
  return listeners;
};

const grantOrientationPermission = () => {
  (DeviceOrientationEvent as OrientationEventConstructor).requestPermission = () =>
    Promise.resolve('granted' as PermissionState);
};

beforeEach(() => {
  localStorage.setItem(LOCALE_STORAGE_KEY, 'en');
  HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia: () => new Promise<MediaStream>(() => {}) },
  });
});

afterEach(() => {
  localStorage.clear();
  delete (DeviceOrientationEvent as OrientationEventConstructor).requestPermission;
  vi.restoreAllMocks();
  cleanup();
});

const scanner = (isOpen: boolean) => (
  <I18nProvider>
    <ScanModal isOpen={isOpen} onClose={() => {}} onCapture={() => {}} />
  </I18nProvider>
);

describe('ScanModal orientation listener lifecycle', () => {
  it('removes the orientation listener when the scanner closes', async () => {
    const listeners = trackOrientationListeners();

    const view = render(scanner(true));
    await act(async () => {});
    expect(listeners.size).toBe(1);

    view.rerender(scanner(false));
    expect(listeners.size).toBe(0);
  });

  it('removes the listener added by the iOS permission grant', async () => {
    grantOrientationPermission();
    const listeners = trackOrientationListeners();

    const view = render(scanner(true));
    await act(async () => {});
    // iOS waits for the gesture, so nothing is listening yet.
    expect(listeners.size).toBe(0);

    await act(async () => {
      fireEvent.click(view.getByLabelText('Enable level indicator'));
    });
    expect(listeners.size).toBe(1);

    view.rerender(scanner(false));
    expect(listeners.size).toBe(0);
  });

  it('keeps a single listener across a grant and a reopen', async () => {
    grantOrientationPermission();
    const listeners = trackOrientationListeners();

    const view = render(scanner(true));
    await act(async () => {});
    await act(async () => {
      fireEvent.click(view.getByLabelText('Enable level indicator'));
    });

    view.rerender(scanner(false));
    view.rerender(scanner(true));
    await act(async () => {});

    expect(listeners.size).toBe(1);
  });
});

describe('ScanModal orientation permission failures', () => {
  it('tells the reader when the motion request is rejected instead of failing silently', async () => {
    const rejections: unknown[] = [];
    const trackRejection = (event: PromiseRejectionEvent) => rejections.push(event.reason);
    window.addEventListener('unhandledrejection', trackRejection);

    (DeviceOrientationEvent as OrientationEventConstructor).requestPermission = () =>
      Promise.reject(new Error('requires a user gesture'));

    const view = render(scanner(true));
    await act(async () => {});
    await act(async () => {
      fireEvent.click(view.getByLabelText('Enable level indicator'));
    });
    // Flush the microtask queue the rejection would surface on.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(view.getByText(/level indicator could not be enabled/i).textContent).toContain('requires a user gesture');
    expect(rejections).toHaveLength(0);

    window.removeEventListener('unhandledrejection', trackRejection);
  });

  it('says the level indicator stays off when motion access is denied', async () => {
    (DeviceOrientationEvent as OrientationEventConstructor).requestPermission = () =>
      Promise.resolve('denied' as PermissionState);

    const view = render(scanner(true));
    await act(async () => {});
    await act(async () => {
      fireEvent.click(view.getByLabelText('Enable level indicator'));
    });

    expect(view.getByText(/Motion access was denied/i)).toBeTruthy();
  });
});
