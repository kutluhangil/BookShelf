import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Book } from '../types';
import { BookCover } from './BookCover';
import { ModalShell } from './ModalShell';
import { useT } from '../i18n/I18nProvider';

interface BookComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  books: Book[];
}

export const BookComparisonModal: React.FC<BookComparisonModalProps> = ({
  isOpen,
  onClose,
  books,
}) => {
  const t = useT();

  if (!isOpen || books.length !== 2) return null;

  const [book1, book2] = books;

  const renderStat = (label: string, val1: React.ReactNode, val2: React.ReactNode) => (
    <div className="grid grid-cols-3 gap-2 py-3 border-b border-[#3A332A] items-center text-center">
      <div className="font-sans-inter text-[13px] text-[#F4EFE6]">{val1}</div>
      <div className="font-mono-ibm text-[10px] text-[#A79C8C] uppercase tracking-wider">{label}</div>
      <div className="font-sans-inter text-[13px] text-[#F4EFE6]">{val2}</div>
    </div>
  );

  return (
    <AnimatePresence>
      <ModalShell isOpen={isOpen} onClose={onClose} label={t.comparison.dialogLabel} closeOnBackdrop={false} className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative bg-[#1C1916] rounded-2xl p-6 w-full max-w-2xl border border-[#3A332A] shadow-2xl flex flex-col max-h-[90vh]"
        >
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="font-serif-literata text-[24px] text-[#F4EFE6] font-bold">{t.comparison.title}</h2>
              <p className="font-mono-ibm text-[11px] text-[#A79C8C] mt-1 uppercase tracking-wider">{t.comparison.subtitle}</p>
            </div>
            <button
              onClick={onClose}
              className="text-[#A79C8C] hover:text-[#F4EFE6] transition-colors p-1"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <div className="overflow-y-auto pr-2 custom-scrollbar flex-1">
            {/* Headers */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              {[book1, book2].map((b, i) => (
                <div key={i} className="flex flex-col items-center text-center space-y-3">
                  <div className="w-24 h-36 rounded-md overflow-hidden bg-[#2C251D] shadow-md border border-[#3A332A]">
                    {b.coverUrl ? (
                      <BookCover coverUrl={b.coverUrl} title={b.title} spineColor={b.spineColor} className="w-full h-full" fallbackTextSize={10} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center p-2" style={{ backgroundColor: b.spineColor || '#2C251D' }}>
                         <span className="font-serif-literata text-[10px] text-[#F4EFE6] font-bold">{b.title}</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="font-serif-literata text-[16px] text-[#F4EFE6] font-bold line-clamp-2 leading-tight">{b.title}</h3>
                    <p className="font-sans-inter text-[12px] text-[#A79C8C] mt-1">{b.author}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Comparison Stats */}
            <div className="bg-[#12100E] rounded-xl border border-[#3A332A] p-2">
              {renderStat(t.comparison.status, 
                <span className={`px-2 py-0.5 rounded text-[10px] uppercase ${book1.status === 'read' ? 'bg-[#2E3C2B] text-[#85E07D]' : book1.status === 'reading' ? 'bg-[#3A2E1D] text-[#C9963F]' : 'bg-[#2C251D] text-[#A79C8C]'}`}>{t.bookStatus[book1.status]}</span>,
                <span className={`px-2 py-0.5 rounded text-[10px] uppercase ${book2.status === 'read' ? 'bg-[#2E3C2B] text-[#85E07D]' : book2.status === 'reading' ? 'bg-[#3A2E1D] text-[#C9963F]' : 'bg-[#2C251D] text-[#A79C8C]'}`}>{t.bookStatus[book2.status]}</span>
              )}
              {renderStat(t.comparison.pages, book1.pageCount || t.comparison.unknown, book2.pageCount || t.comparison.unknown)}
              {renderStat(t.comparison.category, book1.category || t.common.none, book2.category || t.common.none)}
              {renderStat(t.comparison.rating, 
                book1.rating ? <span className="text-[#C9963F]">{'★'.repeat(book1.rating)}</span> : '-',
                book2.rating ? <span className="text-[#C9963F]">{'★'.repeat(book2.rating)}</span> : '-'
              )}
              {renderStat(t.comparison.progress, 
                book1.progress ? `${book1.progress}%` : '-',
                book2.progress ? `${book2.progress}%` : '-'
              )}
              {renderStat(t.comparison.readingSessions, 
                book1.readHistory?.length || 0,
                book2.readHistory?.length || 0
              )}
              
              {/* Tags */}
              <div className="grid grid-cols-3 gap-2 py-3 border-b border-[#3A332A] items-center text-center">
                <div className="flex flex-wrap gap-1 justify-center">
                  {book1.tags?.slice(0, 3).map(t => <span key={t} className="text-[9px] bg-[#1C1916] border border-[#3A332A] text-[#A79C8C] px-1.5 py-0.5 rounded uppercase">{t}</span>) || '-'}
                </div>
                <div className="font-mono-ibm text-[10px] text-[#A79C8C] uppercase tracking-wider">{t.comparison.topTags}</div>
                <div className="flex flex-wrap gap-1 justify-center">
                  {book2.tags?.slice(0, 3).map(t => <span key={t} className="text-[9px] bg-[#1C1916] border border-[#3A332A] text-[#A79C8C] px-1.5 py-0.5 rounded uppercase">{t}</span>) || '-'}
                </div>
              </div>

              {/* Notes */}
              <div className="grid grid-cols-3 gap-2 py-3 items-start text-center">
                <div className="font-sans-inter text-[11px] text-[#A79C8C] italic text-left line-clamp-4">{book1.notes || t.comparison.noNotes}</div>
                <div className="font-mono-ibm text-[10px] text-[#A79C8C] uppercase tracking-wider pt-1">{t.comparison.notesPreview}</div>
                <div className="font-sans-inter text-[11px] text-[#A79C8C] italic text-right line-clamp-4">{book2.notes || t.comparison.noNotes}</div>
              </div>
            </div>
          </div>
        </motion.div>
      </ModalShell>
    </AnimatePresence>
  );
};
