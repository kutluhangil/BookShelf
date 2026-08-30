import { SpineCandidate, Book, EditionOption, ConfidenceLevel } from '../types';
import { INITIAL_BOOKS, MOCK_GLOBAL_CATALOG } from '../data/initialLibrary';
import { postJson, ApiError } from './apiClient';
import { cropRegions } from './imageCrop';

// Helper for Turkish character normalization & unaccent
export function normalizeSpineText(input: string): string {
  if (!input) return '';
  return input
    .replace(/İ/g, 'I')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // `ı` is a distinct letter, not an accented `i`, so NFD leaves it intact and
    // the ASCII filter below would otherwise shred Turkish words into fragments.
    .replace(/ı/g, 'i')
    .replace(/ş/g, 's')
    .replace(/ğ/g, 'g')
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
  return union > 0 ? Math.min(1, (matchCount / union) * 1.15) : 0;
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

const MATCH_THRESHOLD = 0.82;
const REVIEW_THRESHOLD = 0.45;

export function scoreToConfidence(score: number): ConfidenceLevel {
  if (score >= MATCH_THRESHOLD) return 'matched';
  if (score >= REVIEW_THRESHOLD) return 'review';
  return 'unknown';
}

/** One spine as returned by the server-side vision model. */
export interface RecognizedSpine {
  rawText?: string;
  title?: string;
  author?: string;
  publisher?: string;
  year?: number | null;
  dominantColor?: string;
  confidence?: number;
  bbox?: { x?: number; y?: number; width?: number; height?: number };
}

interface CatalogEntry {
  title: string;
  author: string;
  year: number;
  publisher: string;
  isbn: string;
  coverUrl: string;
}

/** Local catalog used to resolve a recognized spine into concrete edition options. */
const LOCAL_CATALOG: CatalogEntry[] = (() => {
  const entries = new Map<string, CatalogEntry>();
  const push = (entry: CatalogEntry) => {
    const key = `${normalizeSpineText(entry.title)}|${normalizeSpineText(entry.author)}`;
    if (!entries.has(key)) entries.set(key, entry);
  };

  MOCK_GLOBAL_CATALOG.forEach((item) =>
    push({
      title: item.title,
      author: item.author,
      year: item.year,
      publisher: item.publisher,
      isbn: item.isbn,
      coverUrl: item.coverUrl,
    })
  );
  INITIAL_BOOKS.forEach((book) =>
    push({
      title: book.title,
      author: book.author,
      year: book.publishYear,
      publisher: book.publisher,
      isbn: book.isbn,
      coverUrl: book.coverUrl,
    })
  );

  return Array.from(entries.values());
})();

function rankCatalog(query: string, limit: number): Array<{ entry: CatalogEntry; score: number }> {
  return LOCAL_CATALOG.map((entry) => ({
    entry,
    score: Math.max(
      calculateSimilarity(query, `${entry.title} ${entry.author}`),
      calculateSimilarity(query, entry.title)
    ),
  }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

function clampPercent(value: number | undefined, fallback: number): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback;
  return Math.max(0, Math.min(100, value));
}

function normalizeHexColor(value: string | undefined, fallbackIndex: number): string {
  if (value && /^#[0-9a-fA-F]{6}$/.test(value.trim())) return value.trim();
  return DEFAULT_SPINE_COLORS[fallbackIndex % DEFAULT_SPINE_COLORS.length];
}

/**
 * Converts the vision model's spine list into review-ready candidates by matching
 * the recognized text against the local catalog with trigram similarity.
 */
export function buildCandidatesFromRecognition(
  shelfImageUrl: string,
  spines: RecognizedSpine[]
): SpineCandidate[] {
  return spines.map((spine, idx) => {
    const rawText = (spine.rawText || `${spine.title ?? ''} ${spine.author ?? ''}`).trim();
    const modelConfidence = typeof spine.confidence === 'number' ? Math.max(0, Math.min(1, spine.confidence)) : 0.5;

    const ranked = rankCatalog(rawText || spine.title || '', 3).filter((item) => item.score > 0.2);
    const bestCatalogScore = ranked[0]?.score ?? 0;

    // The model's own confidence and the catalog similarity both matter; weight them.
    const score = Number((modelConfidence * 0.6 + bestCatalogScore * 0.4).toFixed(3));
    const confidence = scoreToConfidence(score);
    const dominantColor = normalizeHexColor(spine.dominantColor, idx);

    const editions: EditionOption[] = ranked.map((item, rank) => ({
      id: `ed-${idx}-${rank}`,
      title: item.entry.title,
      author: item.entry.author,
      year: item.entry.year,
      publisher: item.entry.publisher,
      coverUrl: item.entry.coverUrl,
      score: Number(item.score.toFixed(3)),
      isbn: item.entry.isbn,
    }));

    // Fall back to what the model itself read when the local catalog has nothing.
    if (editions.length === 0 && spine.title) {
      editions.push({
        id: `ed-${idx}-model`,
        title: spine.title,
        author: spine.author || 'Unknown Author',
        year: spine.year ?? new Date().getFullYear(),
        publisher: spine.publisher || 'Unknown Publisher',
        coverUrl: '',
        score: modelConfidence,
        isbn: '',
      });
    }

    const primary = editions[0];
    const matchedBook: Book | undefined =
      confidence !== 'unknown' && primary
        ? {
            id: `scan-${Date.now().toString(36)}-${idx}-${Math.random().toString(36).slice(2, 7)}`,
            title: primary.title,
            author: primary.author,
            isbn: primary.isbn,
            publisher: primary.publisher,
            publishYear: primary.year,
            pageCount: 0,
            description: '',
            coverUrl: primary.coverUrl,
            spineCropUrl: shelfImageUrl,
            spineColor: dominantColor,
            shelfId: 'shelf-fiction',
            status: 'unread',
            confidence,
            score,
            category: 'Physical Scan',
            addedAt: new Date().toISOString(),
            proofOfCaptureUrl: shelfImageUrl,
          }
        : undefined;

    return {
      id: `candidate-${idx + 1}`,
      orderIndex: idx,
      bbox: {
        x: clampPercent(spine.bbox?.x, (idx * 7) % 90),
        y: clampPercent(spine.bbox?.y, 10),
        width: clampPercent(spine.bbox?.width, 7),
        height: clampPercent(spine.bbox?.height, 78),
      },
      rawTextForward: rawText || 'UNREADABLE SPINE',
      rawTextReverse: rawText.split(' ').reverse().join(' ') || 'UNREADABLE SPINE',
      dominantColor,
      confidence,
      score,
      cropUrl: shelfImageUrl,
      matchedBook,
      editions,
    };
  });
}

export class ShelfRecognitionError extends Error {
  constructor(message: string, readonly detail?: string) {
    super(message);
    this.name = 'ShelfRecognitionError';
  }
}

/**
 * Sends the captured shelf photo to the server-side vision endpoint and returns
 * review-ready spine candidates.
 */
export async function recognizeShelf(shelfImageDataUrl: string): Promise<SpineCandidate[]> {
  const imageBase64 = shelfImageDataUrl.includes(',')
    ? shelfImageDataUrl.slice(shelfImageDataUrl.indexOf(',') + 1)
    : shelfImageDataUrl;

  let payload: { spines?: unknown };
  try {
    payload = await postJson<{ spines?: unknown }>('/api/gemini/shelf', { imageBase64 });
  } catch (error) {
    if (error instanceof ApiError) {
      throw new ShelfRecognitionError(error.message, error.isAuthError ? 'Sign in to use the shelf scanner.' : undefined);
    }
    throw error;
  }

  const spines = payload?.spines;
  if (!Array.isArray(spines)) {
    throw new ShelfRecognitionError('Shelf recognition returned no spine list.', JSON.stringify(payload).slice(0, 300));
  }

  const candidates = buildCandidatesFromRecognition(shelfImageDataUrl, spines as RecognizedSpine[]);

  // Give every candidate its own spine thumbnail instead of the whole shelf.
  const crops = await cropRegions(
    shelfImageDataUrl,
    candidates.map((candidate) => candidate.bbox)
  );

  return candidates.map((candidate, index) => {
    const cropUrl = crops[index] ?? shelfImageDataUrl;
    return {
      ...candidate,
      cropUrl,
      matchedBook: candidate.matchedBook
        ? { ...candidate.matchedBook, spineCropUrl: cropUrl, proofOfCaptureUrl: cropUrl }
        : undefined,
    };
  });
}

/**
 * Builds candidates for the bundled demo dataset, whose ground truth is known.
 * Only used by the clearly-labelled sample shelves in the evaluation view — never
 * for a real user capture.
 */
export function buildDemoCandidates(
  shelfImageUrl: string,
  groundTruth: Array<{ title: string; author: string; year: number; publisher: string; color: string }>
): SpineCandidate[] {
  const total = groundTruth.length;
  let currentX = 2;

  return groundTruth.map((item, idx) => {
    const width = Math.max(5, Math.min(12, (94 / total) * (0.8 + (idx % 3) * 0.2)));
    const candidateX = currentX;
    currentX += width + 0.5;

    const ranked = rankCatalog(`${item.title} ${item.author}`, 2);
    const score = Number(Math.max(0.2, ranked[0]?.score ?? 0.5).toFixed(3));
    const confidence = scoreToConfidence(score);
    const dominantColor = normalizeHexColor(item.color, idx);

    const editions: EditionOption[] = [
      {
        id: `demo-ed-${idx}-0`,
        title: item.title,
        author: item.author,
        year: item.year,
        publisher: item.publisher,
        coverUrl: ranked[0]?.entry.coverUrl ?? '',
        score,
        isbn: ranked[0]?.entry.isbn ?? '',
      },
      ...ranked.slice(1).map((entry, rank) => ({
        id: `demo-ed-${idx}-${rank + 1}`,
        title: entry.entry.title,
        author: entry.entry.author,
        year: entry.entry.year,
        publisher: entry.entry.publisher,
        coverUrl: entry.entry.coverUrl,
        score: Number(entry.score.toFixed(3)),
        isbn: entry.entry.isbn,
      })),
    ];

    const matchedBook: Book | undefined =
      confidence !== 'unknown'
        ? {
            id: `demo-${Date.now().toString(36)}-${idx}`,
            title: item.title,
            author: item.author,
            isbn: editions[0].isbn,
            publisher: item.publisher,
            publishYear: item.year,
            pageCount: 0,
            description: '',
            coverUrl: editions[0].coverUrl,
            spineCropUrl: shelfImageUrl,
            spineColor: dominantColor,
            shelfId: 'shelf-fiction',
            status: 'unread',
            confidence,
            score,
            category: 'Demo Sample',
            addedAt: new Date().toISOString(),
            proofOfCaptureUrl: shelfImageUrl,
          }
        : undefined;

    return {
      id: `candidate-${idx + 1}`,
      orderIndex: idx,
      bbox: { x: candidateX, y: 8 + (idx % 2) * 2, width, height: 80 - (idx % 3) * 3 },
      rawTextForward: `${item.title} ${item.author} ${item.publisher}`,
      rawTextReverse: `${item.publisher} ${item.author} ${item.title}`,
      dominantColor,
      confidence,
      score,
      cropUrl: shelfImageUrl,
      matchedBook,
      editions,
    };
  });
}
