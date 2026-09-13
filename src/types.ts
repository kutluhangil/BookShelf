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
  /**
   * The spine crop cut out of the shelf photo, as a base64 JPEG data URL, or an
   * empty string for a book that was not scanned. This is the single copy: it
   * used to be duplicated into `proofOfCaptureUrl`, which doubled what every
   * scanned book cost in local storage and in a Firestore document.
   */
  spineCropUrl: string;
  spineColor: string;
  shelfId: string;
  status: ReadingStatus;
  progress?: number; // Reader completion percentage (0-100%)
  currentPage?: number; // Page-level progress, kept in sync with `progress`
  readAt?: string;
  readHistory?: string[];
  rating?: number; // 1-5 stars, set by the reader
  notes?: string;
  quotes?: string[]; // OCR scanned quotes
  tags?: string[];
  readingSessions?: ReadingSession[];
  
  // Lending Tracker
  lentTo?: string;
  lentAt?: string; // ISO date string
  lentDueAt?: string; // ISO date string
  confidence: ConfidenceLevel;
  score: number;
  category: string;
  addedAt: string;
  updatedAt?: string; // Last local mutation, used to resolve cloud sync conflicts
  isManual?: boolean;
}

export interface Shelf {
  id: string;
  name: string;
  volumeCount: number;
  dominantColors: string[];
  themeColor?: string;
  texture?: string;
  sortOrder: number;
  layout?: 'standard' | 'coordinate';
  gridDimensions?: { cols: number; rows: number };
  coordinates?: Record<string, { x: number; y: number }>;
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
  /** The spine's own thumbnail, or null when this box could not be cropped. */
  cropUrl: string | null;
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

export interface GenreMilestone {
  genre: string;
  targetCount: number;
}

export interface ReadingGoals {
  annualPageCount?: number;
  annualBookCount?: number;
  genreMilestones?: GenreMilestone[];
}

export interface SharedListMember {
  userId: string;
  email?: string;
  displayName?: string;
  photoURL?: string;
  role: 'owner' | 'contributor';
}

/**
 * What a shared list stores per book.
 *
 * A Firestore document is capped at 1MB, and a `Book` carries `spineCropUrl`:
 * a base64 JPEG that runs to tens of kilobytes on its own. Embedding whole
 * books pushed a list past the cap after a few dozen scanned volumes, and from
 * there every write to it failed permanently — including removing a book. Only
 * the fields the list renders are copied. `coverUrl` is always a remote URL,
 * never image data.
 */
export interface SharedListBook {
  id: string;
  title: string;
  author: string;
  coverUrl: string;
  spineColor: string;
}

export interface SharedList {
  id: string;
  name: string;
  description?: string;
  isPublic: boolean;
  ownerId: string;
  members: SharedListMember[];
  memberIds: string[]; // For fast queries
  invitedEmails?: string[]; // Pending invitations, claimed on first sign-in
  books: SharedListBook[];
  createdAt: string;
}
