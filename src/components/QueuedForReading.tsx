import React, { useMemo } from 'react';
import { Book } from '../types';
import { haptic } from '../services/haptics';

interface QueuedForReadingProps {
  books: Book[];
  onSelectBook: (book: Book) => void;
}

export const QueuedForReading: React.FC<QueuedForReadingProps> = ({ books, onSelectBook }) => {
  const queuedBooks = useMemo(() => {
    // Priority: unread books with "priority", "next", "urgent", "high priority" tags
    const unread = books.filter(b => b.status === 'unread');
    
    const priorityKeywords = ['priority', 'next', 'urgent', 'high priority'];
    
    let priorityBooks = unread.filter(b => 
      b.tags?.some(tag => priorityKeywords.some(keyword => tag.toLowerCase().includes(keyword)))
    );
    
    // Fallback: If no priority tags, just sort by addedAt (newest first) or highest score/rating
    // If we don't have tags, we'll just pick up to 5 recently added unread books
    if (priorityBooks.length === 0) {
      priorityBooks = [...unread].sort((a, b) => {
        const dateA = a.addedAt ? new Date(a.addedAt).getTime() : 0;
        const dateB = b.addedAt ? new Date(b.addedAt).getTime() : 0;
        return dateB - dateA;
      }).slice(0, 5);
    }
    
    return priorityBooks;
  }, [books]);

  if (queuedBooks.length === 0) {
    return null;
  }

  return (
    <section className="bg-[#1C1916] rounded-2xl p-4 sm:p-6 hairline-border">
      <div className="flex items-center gap-2 mb-4">
        <span className="material-symbols-outlined text-[#C9963F] text-[20px]">
          queue_play_next
        </span>
        <h3 className="font-serif-literata text-[18px] text-[#F4EFE6] font-semibold">
          Queued for Reading
        </h3>
        <span className="ml-auto text-[11px] font-mono-ibm text-[#A79C8C] uppercase tracking-wider">
          {queuedBooks.length} VOLUME{queuedBooks.length !== 1 ? 'S' : ''}
        </span>
      </div>

      <div className="flex overflow-x-auto gap-4 pb-2 no-scrollbar scroll-smooth snap-x">
        {queuedBooks.map((book) => (
          <div 
            key={book.id}
            onClick={() => {
              haptic.selectionClick();
              onSelectBook(book);
            }}
            className="snap-start min-w-[240px] max-w-[240px] flex-shrink-0 bg-[#12100E] border border-[#3A332A] hover:border-[#C9963F] rounded-xl p-4 cursor-pointer transition-all hover:shadow-lg group flex flex-col h-full"
          >
            <div className="flex gap-4 items-start mb-3">
              <div 
                className="w-12 h-16 flex-shrink-0 rounded shadow-md overflow-hidden border border-[#3A332A]"
                style={{ backgroundColor: book.spineColor || '#2C251D' }}
              >
                {book.coverUrl ? (
                  <img src={book.coverUrl} alt={book.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center p-1 text-center bg-[#2C251D]">
                    <span className="font-serif-literata text-[7px] text-[#F4EFE6] font-bold line-clamp-3">{book.title}</span>
                  </div>
                )}
              </div>
              
              <div className="flex flex-col">
                <h4 className="font-serif-literata text-[14px] font-bold text-[#F4EFE6] leading-tight line-clamp-2 group-hover:text-[#C9963F] transition-colors">
                  {book.title}
                </h4>
                <p className="font-mono-ibm text-[11px] text-[#A79C8C] mt-1 line-clamp-1">
                  {book.author}
                </p>
              </div>
            </div>
            
            <div className="mt-auto pt-3 border-t border-[#3A332A]/50 flex items-center justify-between">
              <div className="flex gap-1.5 flex-wrap">
                {book.tags?.filter(t => ['priority', 'next', 'urgent', 'high priority'].some(k => t.toLowerCase().includes(k))).slice(0, 1).map(tag => (
                  <span key={tag} className="inline-block px-1.5 py-0.5 bg-[#C9963F]/10 text-[#C9963F] rounded text-[9px] font-mono-ibm uppercase tracking-wider">
                    {tag}
                  </span>
                )) || (
                  <span className="inline-block px-1.5 py-0.5 bg-[#262119] text-[#A79C8C] rounded text-[9px] font-mono-ibm uppercase tracking-wider">
                    Up Next
                  </span>
                )}
              </div>
              <span className="material-symbols-outlined text-[16px] text-[#A79C8C] group-hover:text-[#C9963F] group-hover:translate-x-1 transition-all">
                arrow_forward
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
