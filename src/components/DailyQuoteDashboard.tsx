import React, { useMemo } from 'react';

const QUOTES = [
  { text: "A reader lives a thousand lives before he dies. The man who never reads lives only one.", author: "George R.R. Martin", book: "A Dance with Dragons" },
  { text: "There is no friend as loyal as a book.", author: "Ernest Hemingway", book: "The Old Man and the Sea" },
  { text: "Fairy tales are more than true: not because they tell us that dragons exist, but because they tell us that dragons can be beaten.", author: "Neil Gaiman", book: "Coraline" },
  { text: "I have always imagined that Paradise will be a kind of library.", author: "Jorge Luis Borges", book: "Poem of the Gifts" },
  { text: "Books are a uniquely portable magic.", author: "Stephen King", book: "On Writing" },
  { text: "If you only read the books that everyone else is reading, you can only think what everyone else is thinking.", author: "Haruki Murakami", book: "Norwegian Wood" },
  { text: "We read to know we're not alone.", author: "William Nicholson", book: "Shadowlands" },
  { text: "A room without books is like a body without a soul.", author: "Marcus Tullius Cicero", book: "" },
  { text: "One must always be careful of books, and what is inside them, for words have the power to change us.", author: "Cassandra Clare", book: "Clockwork Angel" },
  { text: "Show me a family of readers, and I will show you the people who move the world.", author: "Napoléon Bonaparte", book: "" }
];

export const DailyQuoteDashboard: React.FC = () => {
  const quote = useMemo(() => {
    const today = new Date();
    // Use day of year to ensure it changes exactly once per day
    const start = new Date(today.getFullYear(), 0, 0);
    const diff = (today.getTime() - start.getTime()) + ((start.getTimezoneOffset() - today.getTimezoneOffset()) * 60 * 1000);
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);
    
    return QUOTES[dayOfYear % QUOTES.length];
  }, []);

  return (
    <section className="bg-[#1C1916] rounded-2xl hairline-border p-5 sm:p-6 flex flex-col justify-center relative overflow-hidden">
      {/* Decorative large quotation mark */}
      <div className="absolute -top-4 -left-1 text-[100px] text-[#262119] font-serif-literata leading-none select-none opacity-50">
        "
      </div>
      
      <div className="relative z-10 space-y-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[14px] text-[#C9963F]">auto_awesome</span>
          <h3 className="font-mono-ibm text-[11px] text-[#A79C8C] uppercase tracking-wider">
            Daily Literary Quote
          </h3>
        </div>
        
        <blockquote className="font-serif-literata text-[18px] sm:text-[20px] text-[#F4EFE6] leading-relaxed italic">
          "{quote.text}"
        </blockquote>
        
        <div className="font-mono-ibm text-[12px] text-[#C9963F] flex items-center gap-2">
          <div className="h-[1px] w-6 bg-[#C9963F] opacity-50" />
          <span>
            {quote.author}
            {quote.book && (
              <span className="text-[#A79C8C]">, {quote.book}</span>
            )}
          </span>
        </div>
      </div>
    </section>
  );
};
