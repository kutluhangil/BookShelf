import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Renders a long list in chunks, growing as a sentinel scrolls into view.
 *
 * Every book was rendered at once, each wrapped in its own animated component,
 * so a few hundred volumes made the library view stutter on load. Capping the
 * rendered slice bounds React's work as well as layout and paint.
 */
export function useIncrementalList<T>(items: T[], pageSize = 60) {
  const [limit, setLimit] = useState(pageSize);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Any change to the underlying list (filter, sort, search) starts over.
  useEffect(() => {
    setLimit(pageSize);
  }, [items, pageSize]);

  const hasMore = limit < items.length;

  const loadMore = useCallback(() => {
    setLimit((current) => Math.min(current + pageSize, items.length));
  }, [items.length, pageSize]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;

    // IntersectionObserver is unavailable in some environments; show everything
    // rather than stranding the user mid-list.
    if (typeof IntersectionObserver === 'undefined') {
      setLimit(items.length);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) loadMore();
      },
      { rootMargin: '600px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadMore, items.length]);

  return {
    visible: items.slice(0, limit),
    hasMore,
    remaining: Math.max(0, items.length - limit),
    sentinelRef,
    loadMore,
  };
}
