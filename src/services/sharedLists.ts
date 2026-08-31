import { getFirestoreApi } from '../lib/firebase';
import { SharedList, Book, SharedListMember } from '../types';
import { AppError } from './appError';

const COLLECTION_NAME = 'sharedLists';

export const createSharedList = async (list: SharedList): Promise<void> => {
  const { db, doc, setDoc } = await getFirestoreApi();
  await setDoc(doc(db, COLLECTION_NAME, list.id), list);
};

export const updateSharedList = async (listId: string, updates: Partial<SharedList>): Promise<void> => {
  const { db, doc, updateDoc } = await getFirestoreApi();
  await updateDoc(doc(db, COLLECTION_NAME, listId), updates);
};

/** Lists the signed-in user owns or has been invited to. */
export const getSharedListsForUser = async (userId: string): Promise<SharedList[]> => {
  const { db, collection, getDocs, query, where } = await getFirestoreApi();
  const snap = await getDocs(query(collection(db, COLLECTION_NAME), where('memberIds', 'array-contains', userId)));
  const lists: SharedList[] = [];
  snap.forEach((entry) => lists.push(entry.data() as SharedList));
  return lists.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
};

/** Public lists anyone can browse. */
export const getPublicSharedLists = async (excludeMemberId?: string): Promise<SharedList[]> => {
  const { db, collection, getDocs, query, where } = await getFirestoreApi();
  const snap = await getDocs(query(collection(db, COLLECTION_NAME), where('isPublic', '==', true)));
  const lists: SharedList[] = [];
  snap.forEach((entry) => {
    const list = entry.data() as SharedList;
    if (excludeMemberId && list.memberIds?.includes(excludeMemberId)) return;
    lists.push(list);
  });
  return lists.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
};

export const getSharedList = async (listId: string): Promise<SharedList | null> => {
  const { db, doc, getDoc } = await getFirestoreApi();
  const snap = await getDoc(doc(db, COLLECTION_NAME, listId));
  return snap.exists() ? (snap.data() as SharedList) : null;
};

export const addBookToSharedList = async (listId: string, book: Book): Promise<void> => {
  const { db, doc, updateDoc, arrayUnion } = await getFirestoreApi();
  await updateDoc(doc(db, COLLECTION_NAME, listId), { books: arrayUnion(book) });
};

export const removeBookFromSharedList = async (listId: string, bookId: string): Promise<void> => {
  const { db, doc, getDoc, updateDoc } = await getFirestoreApi();
  const ref = doc(db, COLLECTION_NAME, listId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new AppError('sharedList.missing', { listId });
  const data = snap.data() as SharedList;
  await updateDoc(ref, { books: data.books.filter((b) => b.id !== bookId) });
};

export const addMemberToSharedList = async (listId: string, member: SharedListMember): Promise<void> => {
  const { db, doc, getDoc, updateDoc, arrayUnion } = await getFirestoreApi();
  const ref = doc(db, COLLECTION_NAME, listId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new AppError('sharedList.missing', { listId });

  const data = snap.data() as SharedList;
  if (data.members.some((m) => m.userId === member.userId || (member.email && m.email === member.email))) {
    throw new AppError('sharedList.alreadyMember', { person: member.email ?? member.displayName ?? null });
  }

  await updateDoc(ref, {
    members: arrayUnion(member),
    memberIds: arrayUnion(member.userId),
  });
};

/** Invites someone by email before they have ever signed in. */
export const inviteByEmail = async (listId: string, email: string): Promise<void> => {
  const normalized = email.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalized)) {
    throw new AppError('sharedList.invalidEmail', { email });
  }
  const { db, doc, getDoc, updateDoc, arrayUnion } = await getFirestoreApi();
  const ref = doc(db, COLLECTION_NAME, listId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new AppError('sharedList.missing', { listId });

  const data = snap.data() as SharedList;
  if (data.invitedEmails?.includes(normalized)) {
    throw new AppError('sharedList.alreadyInvited', { email: normalized });
  }
  await updateDoc(ref, { invitedEmails: arrayUnion(normalized) });
};

/** Claims any pending invitations addressed to the signed-in user's email. */
export const claimInvitations = async (member: SharedListMember): Promise<SharedList[]> => {
  if (!member.email) return [];
  const { db, collection, getDocs, query, where, updateDoc, arrayUnion } = await getFirestoreApi();
  const snap = await getDocs(
    query(collection(db, COLLECTION_NAME), where('invitedEmails', 'array-contains', member.email.toLowerCase()))
  );

  const claimed: SharedList[] = [];
  for (const entry of snap.docs) {
    const list = entry.data() as SharedList;
    if (list.memberIds?.includes(member.userId)) continue;
    await updateDoc(entry.ref, {
      members: arrayUnion(member),
      memberIds: arrayUnion(member.userId),
    });
    claimed.push(list);
  }
  return claimed;
};

/** Lets a signed-in user join a public list. */
export const joinPublicList = async (listId: string, member: SharedListMember): Promise<void> => {
  const { db, doc, getDoc, updateDoc, arrayUnion } = await getFirestoreApi();
  const ref = doc(db, COLLECTION_NAME, listId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new AppError('sharedList.missing', { listId });
  const list = snap.data() as SharedList;
  if (!list.isPublic) throw new AppError('sharedList.inviteOnly', {});
  if (list.memberIds?.includes(member.userId)) return;

  await updateDoc(ref, {
    members: arrayUnion(member),
    memberIds: arrayUnion(member.userId),
  });
};

export const deleteSharedList = async (listId: string): Promise<void> => {
  const { db, doc, deleteDoc } = await getFirestoreApi();
  await deleteDoc(doc(db, COLLECTION_NAME, listId));
};

/**
 * Live subscription to the lists a user belongs to. Collaborators see each
 * other's edits without reloading, which is the point of a shared list.
 * Returns a synchronous unsubscribe so it can be used as an effect cleanup.
 */
export const subscribeToUserLists = (
  userId: string,
  onChange: (lists: SharedList[]) => void,
  onError: (error: Error) => void
): (() => void) => {
  let cancelled = false;
  let unsubscribe: (() => void) | null = null;

  void (async () => {
    try {
      const { db, collection, query, where, onSnapshot } = await getFirestoreApi();
      if (cancelled) return;

      unsubscribe = onSnapshot(
        query(collection(db, COLLECTION_NAME), where('memberIds', 'array-contains', userId)),
        (snapshot) => {
          const lists: SharedList[] = [];
          snapshot.forEach((entry) => lists.push(entry.data() as SharedList));
          onChange(lists.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
        },
        (error) => onError(error instanceof Error ? error : new Error(String(error)))
      );
    } catch (error) {
      if (!cancelled) onError(error instanceof Error ? error : new Error(String(error)));
    }
  })();

  return () => {
    cancelled = true;
    unsubscribe?.();
  };
};
