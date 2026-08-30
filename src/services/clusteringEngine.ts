import { SpineCandidate, Book, EditionOption } from '../types';
import { INITIAL_BOOKS, MOCK_GLOBAL_CATALOG } from '../data/initialLibrary';

// Helper for Turkish character normalization & unaccent
export function normalizeSpineText(input: string): string {
  if (!input) return '';
  return input
    .replace(/İ/g, 'i')
    .replace(/I/g, 'ı')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\b(yayinlari|yayin|kitap|roman|cilt|vol|edition|press|books|classics|ed)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Trigram calculation
function getTrigrams(text: string): Set<string> {
  const normalized = `  ${text} `;
  const trigrams = new Set<string>();
  for (let i = 0; i < normalized.length - 2; i++) {
    trigrams.add(normalized.substring(i, i + 3));
  }
  return trigrams;
}

export function calculateSimilarity(s1: string, s2: string): number {
  const n1 = normalizeSpineText(s1);
  const n2 = normalizeSpineText(s2);
  if (!n1 || !n2) return 0;
  if (n1 === n2) return 1.0;
  if (n1.includes(n2) || n2.includes(n1)) return 0.88;

  const t1 = getTrigrams(n1);
  const t2 = getTrigrams(n2);
  let matchCount = 0;

  for (const tri of t1) {
    if (t2.has(tri)) matchCount++;
  }

  const union = new Set([...t1, ...t2]).size;
  return union > 0 ? (matchCount / union) * 1.15 : 0;
}

const DEFAULT_SPINE_COLORS = [
  '#C9963F',
  '#304E2E',
  '#2C2927',
  '#723700',
  '#8B2323',
  '#1C1916',
  '#4F4537',
  '#7F5700',
  '#3B4238',
  '#521A1A',
  '#222222',
  '#1E262B',
  '#373432',
  '#C97A3F',
];

export function segmentAndMatchShelf(
  shelfImageUrl: string,
  sampleGroundTruth?: Array<{ title: string; author: string; year: number; publisher: string; color: string }>
): SpineCandidate[] {
  // If ground truth is provided from spike sample or presets, build structured candidates
  if (sampleGroundTruth && sampleGroundTruth.length > 0) {
    const total = sampleGroundTruth.length;
    let currentX = 2;

    return sampleGroundTruth.map((item, idx) => {
      const width = Math.max(5, Math.min(12, (94 / total) * (0.8 + (idx % 3) * 0.2)));
      const candidateX = currentX;
      currentX += width + 0.5;

      const isReviewCase = idx === 3 || item.title.toLowerCase().includes('dune') || item.title.toLowerCase().includes('moby');
      const isUnknownCase = idx === total - 1 && total > 8;

      let score = 0.95 - (idx % 4) * 0.03;
      let confidence: 'matched' | 'review' | 'unknown' = 'matched';

      if (isUnknownCase) {
        score = 0.18;
        confidence = 'unknown';
      } else if (isReviewCase) {
        score = 0.68;
        confidence = 'review';
      }

      // Generate editions
      const editions: EditionOption[] = [
        {
          id: `ed-${idx}-1`,
          title: item.title,
          author: item.author,
          year: item.year,
          publisher: item.publisher,
          coverUrl: item.title.includes('Dune')
            ? 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?q=80&w=800&auto=format&fit=crop'
            : 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?q=80&w=800&auto=format&fit=crop',
          score: score,
          isbn: `9780${Math.floor(100000000 + Math.random() * 900000000)}`,
        },
        {
          id: `ed-${idx}-2`,
          title: `${item.title} (Anniversary Edition)`,
          author: item.author,
          year: item.year + 25,
          publisher: 'Ace Books / Penguin Classics',
          coverUrl: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?q=80&w=800&auto=format&fit=crop',
          score: score - 0.08,
          isbn: `9780${Math.floor(100000000 + Math.random() * 900000000)}`,
        },
      ];

      const matchedBook: Book | undefined =
        confidence !== 'unknown'
          ? {
              id: `scan-book-${idx}`,
              title: item.title,
              author: item.author,
              isbn: editions[0].isbn,
              publisher: item.publisher,
              publishYear: item.year,
              pageCount: 280 + (idx * 37) % 300,
              description: `Physical archival edition of ${item.title} by ${item.author}, published by ${item.publisher}.`,
              coverUrl: editions[0].coverUrl,
              spineCropUrl: shelfImageUrl,
              spineColor: item.color || DEFAULT_SPINE_COLORS[idx % DEFAULT_SPINE_COLORS.length],
              shelfId: 'shelf-fiction',
              status: 'unread',
              confidence,
              score,
              category: 'Catalog Match',
              addedAt: new Date().toISOString(),
              proofOfCaptureUrl: shelfImageUrl,
            }
          : undefined;

      return {
        id: `candidate-${idx + 1}`,
        orderIndex: idx,
        bbox: {
          x: candidateX,
          y: 8 + (idx % 2) * 2,
          width: width,
          height: 80 - (idx % 3) * 3,
        },
        rawTextForward: `${item.title} ${item.author} ${item.publisher}`,
        rawTextReverse: `${item.publisher} ${item.author} ${item.title}`,
        dominantColor: item.color || DEFAULT_SPINE_COLORS[idx % DEFAULT_SPINE_COLORS.length],
        confidence,
        score,
        cropUrl: shelfImageUrl,
        matchedBook,
        editions,
      };
    });
  }

  // Default synthetic segmentation for any generic user-uploaded photo
  const count = 12;
  const candidates: SpineCandidate[] = [];
  let currentPos = 3;

  for (let i = 0; i < count; i++) {
    const width = 6.5 + (i % 3) * 1.5;
    const isMatched = i !== 3 && i !== 7 && i !== 11;
    const isReview = i === 3 || i === 7;
    const isUnknown = i === 11;

    const catalogBook = INITIAL_BOOKS[i % INITIAL_BOOKS.length];
    const score = isMatched ? 0.94 - (i % 3) * 0.03 : isReview ? 0.58 : 0.14;
    const confidence: 'matched' | 'review' | 'unknown' = isMatched ? 'matched' : isReview ? 'review' : 'unknown';

    const editions: EditionOption[] = [
      {
        id: `ed-gen-${i}-1`,
        title: isUnknown ? 'Unknown Volume' : catalogBook.title,
        author: isUnknown ? 'Unknown Author' : catalogBook.author,
        year: catalogBook.publishYear,
        publisher: catalogBook.publisher,
        coverUrl: catalogBook.coverUrl,
        score: score,
        isbn: catalogBook.isbn,
      },
      {
        id: `ed-gen-${i}-2`,
        title: isUnknown ? 'Alternative Reading' : `${catalogBook.title} (Revised Edition)`,
        author: catalogBook.author,
        year: catalogBook.publishYear + 10,
        publisher: 'Penguin Classics',
        coverUrl: catalogBook.coverUrl,
        score: Math.max(0.1, score - 0.12),
        isbn: '9780140449136',
      },
    ];

    candidates.push({
      id: `candidate-${i + 1}`,
      orderIndex: i,
      bbox: {
        x: currentPos,
        y: 10 + (i % 2) * 3,
        width: width,
        height: 78 - (i % 4) * 2,
      },
      rawTextForward: isUnknown ? '??? FADED EMBOSS' : `${catalogBook.title} ${catalogBook.author}`,
      rawTextReverse: isUnknown ? 'UNKNOWN' : `${catalogBook.author} ${catalogBook.title}`,
      dominantColor: DEFAULT_SPINE_COLORS[i % DEFAULT_SPINE_COLORS.length],
      confidence,
      score,
      cropUrl: shelfImageUrl,
      matchedBook: isUnknown
        ? undefined
        : {
            ...catalogBook,
            id: `scan-${Date.now()}-${i}`,
            confidence,
            score,
            proofOfCaptureUrl: shelfImageUrl,
          },
      editions,
    });

    currentPos += width + 1;
  }

  return candidates;
}
