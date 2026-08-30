export type ConfidenceLevel = 'matched' | 'review' | 'unknown';
export type ReadingStatus = 'unread' | 'reading' | 'read';

export interface ReadingSession {
  date: string; // ISO string
  durationSeconds: number;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string;
  publisher: string;
  publishYear: number;
  pageCount: number;
  description: string;
  coverUrl: string;
  spineCropUrl: string;
  spineColor: string;
  shelfId: string;
  status: ReadingStatus;
  progress?: number; // Reader completion percentage (0-100%)
  readAt?: string;
  readHistory?: string[];
  notes?: string;
  tags?: string[];
  readingSessions?: ReadingSession[];
  confidence: ConfidenceLevel;
  score: number;
  category: string;
  addedAt: string;
  isManual?: boolean;
  proofOfCaptureUrl?: string;
}

export interface Shelf {
  id: string;
  name: string;
  volumeCount: number;
  dominantColors: string[];
  themeColor?: string;
  sortOrder: number;
}

export interface EditionOption {
  id: string;
  title: string;
  author: string;
  year: number;
  publisher: string;
  coverUrl: string;
  score: number;
  isbn: string;
  description?: string;
}

export interface SpineCandidate {
  id: string;
  orderIndex: number;
  bbox: {
    x: number; // 0 to 100 percentage
    y: number; // 0 to 100 percentage
    width: number;
    height: number;
  };
  rawTextForward: string;
  rawTextReverse: string;
  dominantColor: string;
  confidence: ConfidenceLevel;
  score: number;
  cropUrl: string;
  matchedBook?: Book;
  editions: EditionOption[];
  isDismissed?: boolean;
  isCustomResolved?: boolean;
}

export interface ScanSession {
  id: string;
  timestamp: string;
  sourceImageUrl: string;
  detectedCount: number;
  candidates: SpineCandidate[];
}

export interface SpikeSample {
  id: string;
  name: string;
  category: 'good_light' | 'warm_angle' | 'thin_spines' | 'turkish_classics';
  categoryLabel: string;
  lighting: string;
  angle: string;
  imageUrl: string;
  bookCount: number;
  groundTruth: Array<{
    title: string;
    author: string;
    year: number;
    publisher: string;
    color: string;
  }>;
  evaluation: {
    segmentationRecall: number; // e.g. 0.95
    textCaptureRate: number;     // e.g. 0.88
    endToEndAccuracy: number;    // e.g. 0.82
    matchedCount: number;
    reviewCount: number;
    unknownCount: number;
  };
}
