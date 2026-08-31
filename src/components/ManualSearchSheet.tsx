import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { searchBooks, BookLookupResult } from '../services/bookLookup';
import { haptic } from '../services/haptics';
import { BookCover } from './BookCover';
import { ModalShell } from './ModalShell';
import { useT } from '../i18n/I18nProvider';
import { formatError } from '../i18n/formatError';

interface ManualSearchSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectResult: (book: BookLookupResult) => void;
  candidateCropUrl?: string;
  /** Pre-fills the query with the text read off the spine. */
  initialQuery?: string;
}

export const ManualSearchSheet: React.FC<ManualSearchSheetProps> = ({
  isOpen,
  onClose,
  onSelectResult,
  initialQuery = '',
}) => {
  const t = useT();
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [results, setResults] = useState<BookLookupResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (isOpen) setSearchQuery(initialQuery);
  }, [isOpen, initialQuery]);

  // Debounced live search against Open Library
  useEffect(() => {
    if (!isOpen) return;
    const query = searchQuery.trim();

    if (query.length < 2) {
      setResults([]);
      setError(null);
      setIsSearching(false);
      return;
    }

    const requestId = ++requestIdRef.current;
    setIsSearching(true);
    setError(null);

    const timer = window.setTimeout(async () => {
      try {
        const found = await searchBooks(query);
        if (requestIdRef.current !== requestId) return;
        setResults(found);
        if (found.length === 0) setError(t.manualSearch.noResults(query));
      } catch (lookupError) {
        if (requestIdRef.current !== requestId) return;
        setResults([]);
        setError(formatError(t, lookupError));
      } finally {
        if (requestIdRef.current === requestId) setIsSearching(false);
      }
    }, 350);

    return () => window.clearTimeout(timer);
  }, [searchQuery, isOpen, t]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <ModalShell isOpen={isOpen} onClose={onClose} label={t.manualSearch.dialogLabel} closeOnBackdrop={false} className="fixed inset-0 z-50 flex items-end justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm"
        />

        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          className="relative z-10 w-full max-w-[620px] max-h-[85vh] bg-[#262119] rounded-t-[24px] hairline-border border-b-0 flex flex-col pt-3 shadow-[0_-4px_32px_rgba(18,16,14,0.9)] overflow-hidden"
        >
          <div className="w-full flex justify-center py-1.5">
            <div className="w-12 h-1.5 bg-[#4F4537] rounded-full opacity-60" />
          </div>

          <div className="p-5 sm:p-7 flex-1 flex flex-col min-h-0">
            <div className="flex justify-between items-center mb-1">
              <h2 className="font-serif-literata text-[22px] text-[#F4EFE6]">{t.manualSearch.title}</h2>
              <button
                onClick={() => {
                  haptic.lightImpact();
                  onClose();
                }}
                className="text-[#A79C8C] hover:text-[#F4EFE6] p-1 rounded-full"
                aria-label={t.manualSearch.closeLabel}
              >
                <span className="material-symbols-outlined text-[22px]">close</span>
              </button>
            </div>
            <p className="font-mono-ibm text-[10px] text-[#8C8273] uppercase tracking-widest mb-4">
              {t.manualSearch.poweredBy}
            </p>

            <div className="relative mb-5">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#A79C8C]">
                <span className="material-symbols-outlined text-[20px]">search</span>
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={t.manualSearch.placeholder}
                autoFocus
                className="w-full pl-11 pr-10 py-3 bg-[#1C1916] hairline-border rounded-xl font-sans-inter text-[15px] text-[#F4EFE6] placeholder:text-[#9C8F7E] focus:outline-none focus:border-[#C9963F] focus:ring-1 focus:ring-[#C9963F]"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    haptic.lightImpact();
                    setSearchQuery('');
                  }}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#A79C8C] hover:text-[#F4EFE6]"
                  aria-label={t.manualSearch.clearLabel}
                >
                  <span className="material-symbols-outlined text-[18px]">cancel</span>
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar space-y-2.5 pr-1">
              <div className="font-mono-ibm text-[11px] text-[#A79C8C] uppercase tracking-wider mb-2 flex justify-between">
                <span>{isSearching ? t.manualSearch.searching : t.manualSearch.resultsHeading}</span>
                <span>{t.manualSearch.foundCount(results.length)}</span>
              </div>

              {isSearching && results.length === 0 && (
                <div className="py-12 flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-2 border-[#C9963F]/20 border-t-[#C9963F] rounded-full animate-spin" />
                  <p className="font-mono-ibm text-[11px] text-[#A79C8C] uppercase tracking-widest">{t.manualSearch.querying}</p>
                </div>
              )}

              {!isSearching && error && (
                <div className="py-12 text-center text-[#A79C8C]">
                  <span className="material-symbols-outlined text-4xl text-[#3A332A] mb-2">menu_book</span>
                  <p className="font-sans-inter text-[14px] max-w-sm mx-auto">{error}</p>
                </div>
              )}

              {!isSearching && !error && results.length === 0 && searchQuery.trim().length < 2 && (
                <div className="py-12 text-center text-[#A79C8C]">
                  <span className="material-symbols-outlined text-4xl text-[#3A332A] mb-2">search</span>
                  <p className="font-sans-inter text-[14px]">{t.manualSearch.typeMore}</p>
                </div>
              )}

              {results.map((book, idx) => (
                <button
                  key={`${book.title}-${book.isbn}-${idx}`}
                  onClick={() => {
                    haptic.selectionClick();
                    onSelectResult(book);
                    onClose();
                  }}
                  className="w-full text-left bg-[#1C1916] rounded-xl flex items-center p-2.5 hairline-border hover:bg-[#2C2927] hover:border-[#C9963F]/50 transition-all cursor-pointer group"
                >
                  <div className="w-12 h-16 shrink-0 bg-[#100E0C] rounded overflow-hidden mr-3 border border-[#3A332A] flex items-center justify-center">
                    <BookCover coverUrl={book.coverUrl} title={book.title} className="w-full h-full" fallbackTextSize={9} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-serif-literata text-[16px] text-[#F4EFE6] group-hover:text-[#C9963F] transition-colors truncate">
                      {book.title}
                    </h4>
                    <p className="font-sans-inter text-[13px] text-[#A79C8C] truncate">{book.author}</p>
                    <p className="font-mono-ibm text-[10px] text-[#9C8F7E] tracking-wider mt-0.5 truncate">
                      {book.publishYear || '—'} • {book.publisher}
                      {book.isbn ? ` • ISBN: ${book.isbn}` : ''}
                    </p>
                  </div>
                  <span className="material-symbols-outlined text-[#A79C8C] group-hover:text-[#C9963F] text-[20px] ml-2">
                    add_circle
                  </span>
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      </ModalShell>
    </AnimatePresence>
  );
};
