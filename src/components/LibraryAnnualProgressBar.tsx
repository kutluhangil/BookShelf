import React, { useMemo } from 'react';
import { Book, ReadingGoals } from '../types';

interface LibraryAnnualProgressBarProps {
  books: Book[];
  goals: ReadingGoals;
}

export const LibraryAnnualProgressBar: React.FC<LibraryAnnualProgressBarProps> = ({ books, goals }) => {
  const currentYear = new Date().getFullYear();

  const { totalBooks, totalPages } = useMemo(() => {
    let bCount = 0;
    let pCount = 0;

    books.forEach(b => {
      if (b.status === 'read' && b.readAt) {
        const d = new Date(b.readAt);
        if (d.getFullYear() === currentYear) {
          bCount++;
          pCount += (b.pageCount || 250);
        }
      }
    });

    return { totalBooks: bCount, totalPages: pCount };
  }, [books, currentYear]);

  // If no goals are set, return null or a prompt.
  if (!goals.annualBookCount && !goals.annualPageCount) return null;

  return (
    <div className="w-full bg-[#1C1916] border border-[#3A332A] rounded-xl p-4 sm:p-5 flex flex-col md:flex-row gap-4 md:gap-8 mt-2 shadow-sm">
      {goals.annualBookCount ? (
        <div className="flex-1 space-y-2">
          <div className="flex justify-between items-end">
            <span className="font-mono-ibm text-[11px] text-[#A79C8C] uppercase tracking-wider flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[14px]">menu_book</span>
              {currentYear} Books Goal
            </span>
            <span className="font-serif-literata text-[15px] text-[#F4EFE6] font-bold leading-none">
              {totalBooks} <span className="text-[12px] text-[#5A5044] font-normal">/ {goals.annualBookCount}</span>
            </span>
          </div>
          <div className="h-1.5 w-full bg-[#12100E] rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-[#8B2323] to-[#C9963F] rounded-full transition-all duration-700"
              style={{ width: `${Math.min(100, Math.round((totalBooks / goals.annualBookCount) * 100))}%` }}
            />
          </div>
        </div>
      ) : null}

      {goals.annualPageCount ? (
        <div className="flex-1 space-y-2">
          <div className="flex justify-between items-end">
            <span className="font-mono-ibm text-[11px] text-[#A79C8C] uppercase tracking-wider flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[14px]">auto_stories</span>
              {currentYear} Pages Goal
            </span>
            <span className="font-serif-literata text-[15px] text-[#F4EFE6] font-bold leading-none">
              {totalPages.toLocaleString()} <span className="text-[12px] text-[#5A5044] font-normal">/ {goals.annualPageCount.toLocaleString()}</span>
            </span>
          </div>
          <div className="h-1.5 w-full bg-[#12100E] rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-[#4A5B69] to-[#C9963F] rounded-full transition-all duration-700"
              style={{ width: `${Math.min(100, Math.round((totalPages / goals.annualPageCount) * 100))}%` }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
};
