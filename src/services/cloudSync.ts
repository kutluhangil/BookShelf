import { db } from '../lib/firebase';
import { collection, doc, writeBatch, getDocs, query, where, setDoc, getDoc } from 'firebase/firestore';
import { Book, Shelf, ReadingGoals } from '../types';

export const syncToCloud = async (userId: string, books: Book[], shelves: Shelf[], readingGoals?: ReadingGoals) => {
  const batch = writeBatch(db);

  // Sync Shelves
  for (const shelf of shelves) {
    const shelfRef = doc(db, 'shelves', shelf.id);
    batch.set(shelfRef, { ...shelf, userId }, { merge: true });
  }

  // Sync Books
  for (const book of books) {
    const bookRef = doc(db, 'books', book.id);
    batch.set(bookRef, { ...book, userId }, { merge: true });
  }

  // Update user profile metadata
  const userRef = doc(db, 'users', userId);
  batch.set(userRef, { lastSync: new Date().toISOString(), readingGoals: readingGoals || null }, { merge: true });

  await batch.commit();
};

export const fetchFromCloud = async (userId: string): Promise<{ books: Book[], shelves: Shelf[], readingGoals?: ReadingGoals }> => {
  const books: Book[] = [];
  const shelves: Shelf[] = [];

  const shelvesQuery = query(collection(db, 'shelves'), where('userId', '==', userId));
  const shelvesSnapshot = await getDocs(shelvesQuery);
  shelvesSnapshot.forEach((doc) => {
    const data = doc.data() as Shelf;
    shelves.push(data);
  });

  const booksQuery = query(collection(db, 'books'), where('userId', '==', userId));
  const booksSnapshot = await getDocs(booksQuery);
  booksSnapshot.forEach((doc) => {
    const data = doc.data() as Book;
    books.push(data);
  });

  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);
  let readingGoals: ReadingGoals | undefined;
  if (userSnap.exists()) {
    readingGoals = userSnap.data().readingGoals;
  }

  return { books, shelves, readingGoals };
};
