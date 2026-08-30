import React, { useMemo } from 'react';
import { Book, ReadingGoals } from '../types';

interface ReadingGoalsDashboardProps {
  books: Book[];
  goals: ReadingGoals;
  onEditGoals: () => void;
}

export const ReadingGoalsDashboard: React.FC<ReadingGoalsDashboardProps> = ({
  books,
  goals,
  onEditGoals
}) => {
  const currentYear = new Date().getFullYear();

  // Calculate actuals
  const { totalBooks, totalPages, genreCounts } = useMemo(() => {
    let bCount = 0;
    let pCount = 0;
    const gCounts: Record<string, number> = {};

    books.forEach(b => {
      if (b.status === 'read' && b.readAt) {
        const d = new Date(b.readAt);
        if (d.getFullYear() === currentYear) {
          bCount++;
          pCount += (b.pageCount || 250);
          
          if (b.category) {
            const cat = b.category.trim();
            gCounts[cat] = (gCounts[cat] || 0) + 1;
          }
        }
      }
    });
    return { totalBooks: bCount, totalPages: pCount, genreCounts: gCounts };
  }, [books, currentYear]);

  // Annual Book Progress
  const bookProgress = goals.annualBookCount ? Math.min(100, Math.round((totalBooks / goals.annualBookCount) * 100)) : 0;
  // Annual Page Progress
  const pageProgress = goals.annualPageCount ? Math.min(100, Math.round((totalPages / goals.annualPageCount) * 100)) : 0;

  return (
    <section className="bg-[#1C1916] rounded-2xl hairline-border p-5 sm:p-6 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-serif-literata text-[20px] sm:text-[22px] text-[#F4EFE6] font-semibold">
            {currentYear} Reading Goals
          </h3>
          <p className="font-mono-ibm text-[11px] text-[#A79C8C] mt-0.5">
            YOUR ANNUAL PROGRESS
          </p>
        </div>
        <button
          onClick={onEditGoals}
          className="text-[#5A5044] hover:text-[#C9963F] transition-colors p-1"
          title="Edit Goals"
        >
          <span className="material-symbols-outlined text-[18px]">edit</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Books Goal */}
        {goals.annualBookCount ? (
          <div className="space-y-2">
            <div className="flex justify-between items-end">
              <span className="font-mono-ibm text-[11px] text-[#A79C8C] uppercase tracking-wider">Books Read</span>
              <span className="font-serif-literata text-[18px] text-[#F4EFE6] font-bold leading-none">
                {totalBooks} <span className="text-[12px] text-[#5A5044]">/ {goals.annualBookCount}</span>
              </span>
            </div>
            <div className="h-2 w-full bg-[#12100E] rounded-full overflow-hidden border border-[#3A332A]">
              <div 
                className="h-full bg-gradient-to-r from-[#8B2323] to-[#C9963F] rounded-full transition-all duration-700"
                style={{ width: `${bookProgress}%` }}
              />
            </div>
          </div>
        ) : null}

        {/* Pages Goal */}
        {goals.annualPageCount ? (
          <div className="space-y-2">
            <div className="flex justify-between items-end">
              <span className="font-mono-ibm text-[11px] text-[#A79C8C] uppercase tracking-wider">Pages Read</span>
              <span className="font-serif-literata text-[18px] text-[#F4EFE6] font-bold leading-none">
                {totalPages.toLocaleString()} <span className="text-[12px] text-[#5A5044]">/ {goals.annualPageCount.toLocaleString()}</span>
              </span>
            </div>
            <div className="h-2 w-full bg-[#12100E] rounded-full overflow-hidden border border-[#3A332A]">
              <div 
                className="h-full bg-gradient-to-r from-[#4A5B69] to-[#C9963F] rounded-full transition-all duration-700"
                style={{ width: `${pageProgress}%` }}
              />
            </div>
          </div>
        ) : null}
      </div>

      {/* Genre Milestones */}
      {goals.genreMilestones && goals.genreMilestones.length > 0 && (
        <div className="pt-4 border-t border-[#3A332A]">
          <h4 className="font-mono-ibm text-[11px] text-[#A79C8C] uppercase tracking-wider mb-3">Genre Milestones</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {goals.genreMilestones.map((gm, idx) => {
              // Exact match or partial match logic can be refined
              const current = genreCounts[gm.genre] || 0;
              const gProgress = Math.min(100, Math.round((current / gm.targetCount) * 100));
              const isComplete = current >= gm.targetCount;
              
              return (
                <div key={idx} className={`border p-3 rounded-xl flex flex-col gap-2 transition-colors ${isComplete ? 'bg-[#262119] border-[#C9963F]' : 'bg-[#12100E] border-[#3A332A]'}`}>
                  <div className="flex justify-between items-start">
                    <span className={`text-[13px] font-sans-inter font-medium ${isComplete ? 'text-[#C9963F]' : 'text-[#F4EFE6]'}`}>{gm.genre}</span>
                    <span className="text-[11px] font-mono-ibm text-[#A79C8C]">{current}/{gm.targetCount}</span>
                  </div>
                  <div className="h-1.5 w-full bg-[#1C1916] rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${isComplete ? 'bg-[#C9963F]' : 'bg-[#5A5044]'}`}
                      style={{ width: `${gProgress}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
};
