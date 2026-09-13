import { getFirestoreApi } from '../lib/firebase';
import { SharedList, SharedListBook, Book, SharedListMember } from '../types';
import { AppError } from './appError';

const COLLECTION_NAME = 'sharedLists';

/** The only keys a stored list entry may carry; see `SharedListBook`. */
const SHARED_LIST_BOOK_KEYS = ['id', 'title', 'author', 'coverUrl', 'spineColor'] as const;

/**
 * Hard ceiling on how many books one list holds. Entries are small, but they
 * share a single document and Firestore caps that at 1MB — a list that crosses
 * the line can never be written again, not even to remove a book. Refusing the
 * add keeps the list editable and says why.
 */
export const SHARED_LIST_MAX_BOOKS = 500;

/** Copies the fields a shared list renders, leaving the spine crop behind. */
export const toSharedListBook = (book: Book | SharedListBook): SharedListBook => ({
  id: book.id,
  title: book.title,
  author: book.author,
  coverUrl: book.coverUrl,
  spineColor: book.spineColor,
});

/**
 * Projects a stored document. Lists written before books were slimmed down hold
 * whole `Book` records, so reading them raw would put the spine crops — and the
 * pre-schema-3 `proofOfCaptureUrl` duplicate, which `deleteField` cannot reach
 * inside an array — back in front of the UI and into the next write.
 */
function readList(data: unknown): SharedList {
  const list = data as SharedList;
  return { ...list, books: list.books.map(toSharedListBook) };
}

/** True while the document still holds entries carrying more than it needs. */
function holdsLegacyEntries(data: unknown): boolean {
  const stored = (data as { books: Array<Record<string, unknown>> }).books;
  return stored.some((entry) =>
    Object.keys(entry).some((key) => !SHARED_LIST_BOOK_KEYS.includes(key as (typeof SHARED_LIST_BOOK_KEYS)[number]))
  );
}

export const createSharedList = async (list: SharedList): Promise<void> => {
  const { db, doc, setDoc } = await getFirestoreApi();
  await setDoc(doc(db, COLLECTION_NAME, list.id), { ...list, books: list.books.map(toSharedListBook) });
};

export const updateSharedList = async (listId: string, updates: Partial<SharedList>): Promise<void> => {
  const { db, doc, updateDoc } = await getFirestoreApi();
  await updateDoc(doc(db, COLLECTION_NAME, listId), updates);
};

/**
 * How many lists a browse fetches at once. Both queries used to read the whole
 * matching set: the public one grows with every list anyone in the deployment
 * has ever published, and each document carries its books inline.
 */
export const SHARED_LIST_PAGE_SIZE = 50;

/** Lists the signed-in user owns or has been invited to, newest first. */
export const getSharedListsForUser = async (userId: string, max = SHARED_LIST_PAGE_SIZE): Promise<SharedList[]> => {
  const { db, collection, getDocs, query, where, orderBy, limit } = await getFirestoreApi();
  const snap = await getDocs(
    query(
      collection(db, COLLECTION_NAME),
      where('memberIds', 'array-contains', userId),
      orderBy('createdAt', 'desc'),
      limit(max)
    )
  );
  const lists: SharedList[] = [];
  snap.forEach((entry) => lists.push(readList(entry.data())));
  return lists;
};

/**
 * Public lists anyone can browse, newest first.
 *
 * Lists the caller already belongs to are filtered out here rather than in the
 * query, because Firestore cannot express "array does not contain". One page is
 * over-fetched so that filtering cannot empty an otherwise full page.
 */
export const getPublicSharedLists = async (
  excludeMemberId?: string,
  max = SHARED_LIST_PAGE_SIZE
): Promise<SharedList[]> => {
  const { db, collection, getDocs, query, where, orderBy, limit } = await getFirestoreApi();
  const snap = await getDocs(
    query(
      collection(db, COLLECTION_NAME),
      where('isPublic', '==', true),
      orderBy('createdAt', 'desc'),
      limit(excludeMemberId ? max * 2 : max)
    )
  );
  const lists: SharedList[] = [];
  snap.forEach((entry) => {
    const list = readList(entry.data());
    if (excludeMemberId && list.memberIds?.includes(excludeMemberId)) return;
    lists.push(list);
  });
  return lists.slice(0, max);
};

export const getSharedList = async (listId: string): Promise<SharedList | null> => {
  const { db, doc, getDoc } = await getFirestoreApi();
  const snap = await getDoc(doc(db, COLLECTION_NAME, listId));
  return snap.exists() ? readList(snap.data()) : null;
};

export const addBookToSharedList = async (listId: string, book: Book): Promise<void> => {
  const { db, doc, getDoc, updateDoc, arrayUnion } = await getFirestoreApi();
  const ref = doc(db, COLLECTION_NAME, listId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new AppError('sharedList.missing', { listId });

  const list = readList(snap.data());
  if (list.books.length >= SHARED_LIST_MAX_BOOKS) {
    throw new AppError('sharedList.full', { listId, limit: SHARED_LIST_MAX_BOOKS });
  }

  // `arrayUnion` keeps concurrent adds from overwriting each other, so it is the
  // normal path. A document still holding fat entries is rewritten instead, so
  // the oversized copies leave on the first edit rather than staying forever.
  const entry = toSharedListBook(book);
  await updateDoc(
    ref,
    holdsLegacyEntries(snap.data()) ? { books: [...list.books, entry] } : { books: arrayUnion(entry) }
  );
};

export const removeBookFromSharedList = async (listId: string, bookId: string): Promise<void> => {
  const { db, doc, getDoc, updateDoc } = await getFirestoreApi();
  const ref = doc(db, COLLECTION_NAME, listId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new AppError('sharedList.missing', { listId });
  const list = readList(snap.data());
  await updateDoc(ref, { books: list.books.filter((entry) => entry.id !== bookId) });
};

export const addMemberToSharedList = async (listId: string, member: SharedListMember): Promise<void> => {
  const { db, doc, getDoc, updateDoc, arrayUnion } = await getFirestoreApi();
  const ref = doc(db, COLLECTION_NAME, listId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new AppError('sharedList.missing', { listId });

  const data = readList(snap.data());
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

  const data = readList(snap.data());
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
    const list = readList(entry.data());
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
  const list = readList(snap.data());
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
          snapshot.forEach((entry) => lists.push(readList(entry.data())));
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
