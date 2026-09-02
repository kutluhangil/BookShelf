import React, { useMemo } from 'react';
import { Book } from '../types';
import { RECOMMENDATION_CATALOG, CatalogBook } from '../data/recommendationCatalog';
import { haptic } from '../services/haptics';
import { useT } from '../i18n/I18nProvider';

interface RecommendedBooksProps {
  books: Book[];
  onAddBook?: (book: Omit<Book, 'id' | 'addedAt'>) => void;
}

interface RecommendedItem extends CatalogBook {
  matchReason: string;
  score: number;
}

export const RecommendedBooks: React.FC<RecommendedBooksProps> = ({ books, onAddBook }) => {
  const t = useT();

  const recommendations = useMemo(() => {
    if (books.length === 0) return [];

    // Extract user preferences based on current library
    const existingTitles = new Set(books.map(b => b.title.toLowerCase()));
    
    const authorFrequencies: Record<string, number> = {};
    const categoryFrequencies: Record<string, number> = {};
    
    books.forEach(book => {
      authorFrequencies[book.author] = (authorFrequencies[book.author] || 0) + 1;
      categoryFrequencies[book.category] = (categoryFrequencies[book.category] || 0) + 1;
    });

    const scoredCatalog: RecommendedItem[] = [];

    RECOMMENDATION_CATALOG.forEach(catalogBook => {
      // Don't recommend books the user already has
      if (existingTitles.has(catalogBook.title.toLowerCase())) return;

      let score = 0;
      let matchReason = '';

      // Score based on matching authors and categories
      const authorScore = authorFrequencies[catalogBook.author] || 0;
      const categoryScore = categoryFrequencies[catalogBook.category] || 0;

      if (authorScore > 0) {
        score += authorScore * 3; // Author matches are weighted heavily
        matchReason = t.recommended.becauseAuthor(catalogBook.author);
      }
      
      if (categoryScore > 0) {
        score += categoryScore;
        if (!matchReason) {
          matchReason = t.recommended.becauseCategory(catalogBook.category);
        }
      }

      // Add a small random tiebreaker
      score += Math.random() * 0.5;

      if (score > 0) {
        if (!matchReason) matchReason = t.recommended.generic;
        scoredCatalog.push({ ...catalogBook, score, matchReason });
      }
    });

    // Sort by score descending and take the top 3
    return scoredCatalog.sort((a, b) => b.score - a.score).slice(0, 3);
  }, [books, t]);

  if (recommendations.length === 0) return null;

  return (
    <section className="bg-[#1C1916] rounded-2xl hairline-border p-5 sm:p-6 space-y-4">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-[16px] text-[#C9963F]" aria-hidden="true">explore</span>
        <h3 className="font-serif-literata text-[20px] sm:text-[22px] text-[#F4EFE6] font-semibold">
          {t.recommended.title}
        </h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {recommendations.map((rec) => (
          <div key={rec.id} className="bg-[#12100E] border border-[#3A332A] rounded-xl p-4 flex flex-col h-full hover:border-[#C9963F]/50 transition-colors group cursor-default">
            <div className="flex gap-3 mb-3">
              {/* Spine Visual */}
              <div 
                className="w-12 h-16 rounded shadow-sm flex-shrink-0 flex items-center justify-center border border-white/10"
                style={{ backgroundColor: rec.coverColor }}
              >
                <div className="w-full h-full border-l-[3px] border-black/20" />
              </div>
              
              <div className="flex flex-col justify-center">
                <h4 className="font-serif-literata text-[15px] font-bold text-[#F4EFE6] leading-tight line-clamp-2">
                  {rec.title}
                </h4>
                <p className="font-mono-ibm text-[12px] text-[#A79C8C] mt-1 line-clamp-1">
                  {rec.author}
                </p>
              </div>
            </div>
            
            <p className="font-sans-inter text-[13px] text-[#8C8273] leading-relaxed line-clamp-3 mb-4 flex-grow">
              {rec.description}
            </p>
            
            <div className="mt-auto pt-3 border-t border-[#3A332A]/50 flex items-center justify-between">
              <span className="inline-block px-2 py-1 bg-[#262119] text-[#C9963F] rounded text-[10px] font-mono-ibm uppercase tracking-wider">
                {rec.matchReason}
              </span>
              {onAddBook && (
                <button
                  onClick={() => {
                    haptic.selectionClick();
                    // The catalog only knows title, author, category and a
                    // colour, but a Book has to be complete: the detail view
                    // and the pacing maths read these fields directly, and an
                    // undefined one used to surface as "NaN" in the UI. The
                    // shelf is decided by the caller.
                    onAddBook({
                      title: rec.title,
                      author: rec.author,
                      category: rec.category,
                      description: rec.description,
                      isbn: '',
                      publisher: '',
                      publishYear: 0,
                      pageCount: 0,
                      coverUrl: '',
                      spineCropUrl: '',
                      spineColor: rec.coverColor,
                      shelfId: '',
                      status: 'unread',
                      confidence: 'matched',
                      score: 1,
                      isManual: true,
                    });
                  }}
                  className="px-3 py-1.5 bg-[#C9963F]/10 hover:bg-[#C9963F]/20 text-[#C9963F] rounded text-[11px] font-mono-ibm font-bold uppercase tracking-wider transition-colors flex items-center gap-1"
                  title={t.recommended.addToLibrary}
                >
                  <span className="material-symbols-outlined text-[14px]" aria-hidden="true">add</span>
                  <span>{t.recommended.add}</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
