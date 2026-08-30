import { db } from '../lib/firebase';
import { collection, doc, setDoc, getDocs, getDoc, query, where, updateDoc, arrayUnion, arrayRemove, deleteDoc } from 'firebase/firestore';
import { SharedList, Book, SharedListMember } from '../types';

const COLLECTION_NAME = 'sharedLists';

export const createSharedList = async (list: SharedList) => {
  const docRef = doc(db, COLLECTION_NAME, list.id);
  await setDoc(docRef, list);
};

export const updateSharedList = async (listId: string, updates: Partial<SharedList>) => {
  const docRef = doc(db, COLLECTION_NAME, listId);
  await updateDoc(docRef, updates);
};

export const getMySharedLists = async (userId: string): Promise<SharedList[]> => {
  // Lists where I am the owner
  const qOwner = query(collection(db, COLLECTION_NAME), where('ownerId', '==', userId));
  const snapOwner = await getDocs(qOwner);
  
  // Wait, firestore doesn't easily support querying array of objects by a nested field without complex indexes or a map.
  // Actually, we can fetch all and filter client-side for "member" if it's small, OR just use an array of memberIds for querying.
  // Let's optimize: add `memberIds: string[]` to the document to allow easy querying.
  
  const lists: SharedList[] = [];
  snapOwner.forEach(d => lists.push(d.data() as SharedList));
  
  return lists;
};

export const getSharedListsForUser = async (userId: string): Promise<SharedList[]> => {
  const q = query(collection(db, COLLECTION_NAME), where('memberIds', 'array-contains', userId));
  const snap = await getDocs(q);
  const lists: SharedList[] = [];
  snap.forEach(d => lists.push(d.data() as SharedList));
  return lists;
};

export const getPublicSharedLists = async (): Promise<SharedList[]> => {
  const q = query(collection(db, COLLECTION_NAME), where('isPublic', '==', true));
  const snap = await getDocs(q);
  const lists: SharedList[] = [];
  snap.forEach(d => lists.push(d.data() as SharedList));
  return lists;
};

export const addBookToSharedList = async (listId: string, book: Book) => {
  const docRef = doc(db, COLLECTION_NAME, listId);
  await updateDoc(docRef, {
    books: arrayUnion(book)
  });
};

export const removeBookFromSharedList = async (listId: string, book: Book) => {
  const docRef = doc(db, COLLECTION_NAME, listId);
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    const data = snap.data() as SharedList;
    const newBooks = data.books.filter(b => b.id !== book.id);
    await updateDoc(docRef, { books: newBooks });
  }
};

export const addMemberToSharedList = async (listId: string, member: SharedListMember) => {
  const docRef = doc(db, COLLECTION_NAME, listId);
  await updateDoc(docRef, {
    members: arrayUnion(member),
    memberIds: arrayUnion(member.userId)
  });
};

export const deleteSharedList = async (listId: string) => {
  const docRef = doc(db, COLLECTION_NAME, listId);
  await deleteDoc(docRef);
};
