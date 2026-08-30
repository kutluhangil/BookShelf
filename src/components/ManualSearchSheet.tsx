import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MOCK_GLOBAL_CATALOG, INITIAL_BOOKS } from '../data/initialLibrary';
import { Book, EditionOption } from '../types';
import { normalizeSpineText } from '../services/clusteringEngine';
import { haptic } from '../services/haptics';

interface ManualSearchSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectResult: (book: {
    title: string;
    author: string;
    isbn: string;
    publisher: string;
    publishYear: number;
    coverUrl: string;
  }) => void;
  candidateCropUrl?: string;
}

export const ManualSearchSheet: React.FC<ManualSearchSheetProps> = ({
  isOpen,
  onClose,
  onSelectResult,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Combined searchable catalog
  const catalog = useMemo(() => {
    const map = new Map<string, any>();
    [...MOCK_GLOBAL_CATALOG, ...INITIAL_BOOKS].forEach((item) => {
      const key = `${item.title.toLowerCase()}-${item.author.toLowerCase()}`;
      if (!map.has(key)) {
        map.set(key, {
          title: item.title,
          author: item.author,
          year: 'publishYear' in item ? item.publishYear : item.year,
          publisher: item.publisher,
          isbn: item.isbn || `9780${Math.floor(100000000 + Math.random() * 900000000)}`,
          coverUrl: item.coverUrl,
        });
      }
    });
    return Array.from(map.values());
  }, []);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return catalog.slice(0, 6);
    const normalized = normalizeSpineText(searchQuery);
    return catalog.filter((book) => {
      const matchTitle = normalizeSpineText(book.title).includes(normalized);
      const matchAuthor = normalizeSpineText(book.author).includes(normalized);
      const matchIsbn = book.isbn.toLowerCase().includes(searchQuery.toLowerCase().trim());
      return matchTitle || matchAuthor || matchIsbn;
    });
  }, [catalog, searchQuery]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end justify-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          className="relative z-10 w-full max-w-[620px] max-h-[85vh] bg-[#262119] rounded-t-[24px] hairline-border border-b-0 flex flex-col pt-3 shadow-[0_-4px_32px_rgba(18,16,14,0.9)] overflow-hidden"
        >
          {/* Drag Handle */}
          <div className="w-full flex justify-center py-1.5 cursor-grab">
            <div className="w-12 h-1.5 bg-[#4F4537] rounded-full opacity-60" />
          </div>

          <div className="p-5 sm:p-7 flex-1 flex flex-col min-h-0">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-serif-literata text-[22px] text-[#F4EFE6]">
                Manual Catalog Search
              </h2>
              <button
                onClick={() => {
                  haptic.lightImpact();
                  onClose();
                }}
                className="text-[#A79C8C] hover:text-[#F4EFE6] p-1 rounded-full"
              >
                <span className="material-symbols-outlined text-[22px]">close</span>
              </button>
            </div>

            {/* Search Input Bar (Image 5 style) */}
            <div className="relative mb-5">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#A79C8C]">
                <span className="material-symbols-outlined text-[20px]">search</span>
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search title, author, or ISBN..."
                autoFocus
                className="w-full pl-11 pr-4 py-3 bg-[#1C1916] hairline-border rounded-xl font-sans-inter text-[15px] text-[#F4EFE6] placeholder:text-[#9C8F7E] focus:outline-none focus:border-[#C9963F] focus:ring-1 focus:ring-[#C9963F]"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    haptic.lightImpact();
                    setSearchQuery('');
                  }}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#A79C8C] hover:text-[#F4EFE6]"
                >
                  <span className="material-symbols-outlined text-[18px]">cancel</span>
                </button>
              )}
            </div>

            {/* Results List */}
            <div className="flex-1 overflow-y-auto no-scrollbar space-y-2.5 pr-1">
              <div className="font-mono-ibm text-[11px] text-[#A79C8C] uppercase tracking-wider mb-2 flex justify-between">
                <span>{searchQuery ? 'SEARCH RESULTS' : 'FREQUENT TITLES'}</span>
                <span>{searchResults.length} AVAILABLE</span>
              </div>

              {searchResults.length === 0 ? (
                <div className="py-12 text-center text-[#A79C8C]">
                  <span className="material-symbols-outlined text-4xl text-[#3A332A] mb-2">menu_book</span>
                  <p className="font-sans-inter text-[14px]">No matching volumes found in catalog.</p>
                  <p className="font-mono-ibm text-[11px] text-[#9C8F7E] mt-1">Try searching with a shorter title or author keyword.</p>
                </div>
              ) : (
                searchResults.map((book, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      haptic.selectionClick();
                      onSelectResult({
                        title: book.title,
                        author: book.author,
                        isbn: book.isbn,
                        publisher: book.publisher,
                        publishYear: book.year,
                        coverUrl: book.coverUrl,
                      });
                      onClose();
                    }}
                    className="w-full text-left bg-[#1C1916] rounded-xl flex items-center p-2.5 hairline-border hover:bg-[#2C2927] hover:border-[#C9963F]/50 transition-all cursor-pointer group"
                  >
                    <div className="w-12 h-16 shrink-0 bg-[#100E0C] rounded overflow-hidden mr-3 border border-[#3A332A]">
                      <img
                        src={book.coverUrl}
                        alt={book.title}
                        className="w-full h-full object-cover grayscale-[20%] group-hover:grayscale-0 transition-all"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-serif-literata text-[16px] text-[#F4EFE6] group-hover:text-[#C9963F] transition-colors truncate">
                        {book.title}
                      </h4>
                      <p className="font-sans-inter text-[13px] text-[#A79C8C] truncate">
                        {book.author}
                      </p>
                      <p className="font-mono-ibm text-[10px] text-[#9C8F7E] tracking-wider mt-0.5">
                        {book.year} • {book.publisher} • ISBN: {book.isbn}
                      </p>
                    </div>
                    <span className="material-symbols-outlined text-[#A79C8C] group-hover:text-[#C9963F] text-[20px] ml-2">
                      add_circle
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
