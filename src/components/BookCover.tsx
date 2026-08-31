import React, { useEffect, useState } from 'react';

interface BookCoverProps {
  coverUrl?: string;
  title: string;
  author?: string;
  /** Used for the fallback tile so a coverless book still reads as that book. */
  spineColor?: string;
  className?: string;
  showAuthor?: boolean;
  /** Font size of the fallback title, in px. */
  fallbackTextSize?: number;
}

/**
 * Cover image with a real fallback. Covers are hotlinked from Open Library, so a
 * 404 or an offline session would otherwise leave an empty box: every `<img>` in
 * the app previously had no error handling at all.
 */
export const BookCover: React.FC<BookCoverProps> = ({
  coverUrl,
  title,
  author,
  spineColor,
  className = '',
  showAuthor = false,
  fallbackTextSize = 12,
}) => {
  const [failed, setFailed] = useState(false);

  // A new URL deserves a fresh attempt.
  useEffect(() => {
    setFailed(false);
  }, [coverUrl]);

  if (!coverUrl || failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center p-2 text-center overflow-hidden ${className}`}
        style={{ backgroundColor: spineColor || '#2C251D' }}
        title={title}
      >
        <span
          className="font-serif-literata text-[#F4EFE6] font-semibold leading-tight line-clamp-4"
          style={{ fontSize: `${fallbackTextSize}px` }}
        >
          {title}
        </span>
        {showAuthor && author && (
          <span
            className="font-mono-ibm text-[#F4EFE6]/70 mt-1.5 line-clamp-1"
            style={{ fontSize: `${Math.max(9, fallbackTextSize - 3)}px` }}
          >
            {author}
          </span>
        )}
      </div>
    );
  }

  return (
    <img
      src={coverUrl}
      alt={title}
      loading="lazy"
      onError={() => setFailed(true)}
      className={`object-cover ${className}`}
    />
  );
};
