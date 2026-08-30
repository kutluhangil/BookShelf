import { Book, ReadingStatus } from '../types';

export function parseNLPSearchQuery(query: string, book: Book): boolean {
  let q = query.toLowerCase().trim();
  if (!q) return true;

  let requiredStatus: ReadingStatus | null = null;
  
  // 1. Keyword Mapper: Check for status intents
  const unreadRegex = /\b(haven't read|havent read|unread|not read|to read|want to read)\b/i;
  const readingRegex = /\b(currently reading|reading now|in progress)\b/i;
  const readRegex = /\b(already read|have read|finished reading|read books|books i read)\b/i;
  // A standalone 'read' is risky, so we look for compound phrases

  if (unreadRegex.test(q)) {
    requiredStatus = 'unread';
    q = q.replace(unreadRegex, '').trim();
  } else if (readingRegex.test(q)) {
    requiredStatus = 'reading';
    q = q.replace(readingRegex, '').trim();
  } else if (readRegex.test(q)) {
    requiredStatus = 'read';
    q = q.replace(readRegex, '').trim();
  } else if (/\b(read)\b/i.test(q)) {
    // If we just see "read", it might be a status or a title word. Let's soft-map it
    // if the query has things like "books by X that I read"
    // To be safe, we won't strictly strip 'read' if it's the only word, but we'll try to infer status.
  }

  // Strip common filler words to extract the core search intent
  const fillers = /\b(books|book|by|about|with|i|have|that|are|is|my|show me|find|all)\b/g;
  let searchTerms = q.replace(fillers, ' ').replace(/\s+/g, ' ').trim();

  // If a status intent was detected, enforce it
  if (requiredStatus && book.status !== requiredStatus) {
    return false;
  }

  // If there's still text left after stripping NLP intents and fillers, match against book metadata
  if (searchTerms.length > 0) {
    const titleMatch = book.title.toLowerCase().includes(searchTerms);
    const authorMatch = book.author.toLowerCase().includes(searchTerms);
    const publisherMatch = book.publisher?.toLowerCase().includes(searchTerms);
    const isbnMatch = book.isbn?.includes(searchTerms);
    const categoryMatch = book.category?.toLowerCase().includes(searchTerms);
    const tagsMatch = book.tags?.some(t => t.toLowerCase().includes(searchTerms));

    // Also support multi-word arbitrary match (e.g., if searchTerms is "stephen king")
    // or word-by-word match
    const terms = searchTerms.split(' ').filter(Boolean);
    const allTermsMatch = terms.every(term => 
      book.title.toLowerCase().includes(term) ||
      book.author.toLowerCase().includes(term) ||
      (book.category && book.category.toLowerCase().includes(term))
    );

    if (!titleMatch && !authorMatch && !publisherMatch && !isbnMatch && !categoryMatch && !tagsMatch && !allTermsMatch) {
      return false;
    }
  }

  return true;
}
