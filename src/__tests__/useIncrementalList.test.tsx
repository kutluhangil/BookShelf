// @vitest-environment jsdom
import React from 'react';
import { describe, expect, it, beforeAll, afterEach, vi } from 'vitest';
import { render, screen, act, cleanup } from '@testing-library/react';
import { useIncrementalList } from '../hooks/useIncrementalList';

let observerCallbacks: Array<(entries: Array<{ isIntersecting: boolean }>) => void> = [];

beforeAll(() => {
  // jsdom has no IntersectionObserver; capture the callback so a test can
  // simulate the sentinel scrolling into view.
  class FakeObserver {
    constructor(private callback: (entries: Array<{ isIntersecting: boolean }>) => void) {
      observerCallbacks.push(callback);
    }
    observe() {}
    disconnect() {}
    unobserve() {}
  }
  vi.stubGlobal('IntersectionObserver', FakeObserver);
});

// Vitest is not running with globals, so Testing Library's automatic cleanup
// is not registered; without this each test would inherit the previous DOM.
afterEach(cleanup);

const Harness: React.FC<{ items: number[]; pageSize?: number }> = ({ items, pageSize = 3 }) => {
  const { visible, hasMore, remaining, sentinelRef, loadMore } = useIncrementalList(items, pageSize);
  return (
    <div>
      <p data-testid="visible">{visible.join(',')}</p>
      <p data-testid="remaining">{remaining}</p>
      <p data-testid="hasMore">{String(hasMore)}</p>
      <button onClick={loadMore}>more</button>
      <div ref={sentinelRef} data-testid="sentinel" />
    </div>
  );
};

const range = (n: number) => Array.from({ length: n }, (_, i) => i);

describe('useIncrementalList', () => {
  it('renders only the first page and reports what is left', () => {
    render(<Harness items={range(10)} />);
    expect(screen.getByTestId('visible').textContent).toBe('0,1,2');
    expect(screen.getByTestId('remaining').textContent).toBe('7');
    expect(screen.getByTestId('hasMore').textContent).toBe('true');
  });

  it('grows by one page when the sentinel intersects', () => {
    observerCallbacks = [];
    render(<Harness items={range(10)} />);
    act(() => observerCallbacks.at(-1)?.([{ isIntersecting: true }]));
    expect(screen.getByTestId('visible').textContent).toBe('0,1,2,3,4,5');
  });

  it('ignores a non-intersecting entry', () => {
    observerCallbacks = [];
    render(<Harness items={range(10)} />);
    act(() => observerCallbacks.at(-1)?.([{ isIntersecting: false }]));
    expect(screen.getByTestId('visible').textContent).toBe('0,1,2');
  });

  it('never grows past the end of the list', () => {
    render(<Harness items={range(4)} pageSize={3} />);
    act(() => observerCallbacks.at(-1)?.([{ isIntersecting: true }]));
    expect(screen.getByTestId('visible').textContent).toBe('0,1,2,3');
    expect(screen.getByTestId('hasMore').textContent).toBe('false');
    expect(screen.getByTestId('remaining').textContent).toBe('0');
  });

  it('resets to the first page when the list changes, e.g. a new filter', () => {
    const { rerender } = render(<Harness items={range(10)} />);
    act(() => observerCallbacks.at(-1)?.([{ isIntersecting: true }]));
    expect(screen.getByTestId('visible').textContent).toBe('0,1,2,3,4,5');

    rerender(<Harness items={range(10).map((n) => n + 100)} />);
    expect(screen.getByTestId('visible').textContent).toBe('100,101,102');
  });
});
