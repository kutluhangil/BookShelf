import React, { useState, useEffect, useCallback } from 'react';
import { SharedList, Book, SharedListMember } from '../types';
import {
  getSharedListsForUser,
  getPublicSharedLists,
  createSharedList,
  deleteSharedList,
  addBookToSharedList,
  removeBookFromSharedList,
  inviteByEmail,
  claimInvitations,
  joinPublicList,
  subscribeToUserLists,
} from '../services/sharedLists';
import { isFirebaseConfigured, firebaseConfigError, type User } from '../lib/firebase';
import { haptic } from '../services/haptics';
import { BookCover } from './BookCover';
import { useT } from '../i18n/I18nProvider';
import { formatError } from '../i18n/formatError';
import { activateOnKey } from '../utils/interactive';

interface SharedListsViewProps {
  books: Book[];
  currentUser: User | null;
  onRequestLogin?: () => void;
}

type Scope = 'mine' | 'public';

export const SharedListsView: React.FC<SharedListsViewProps> = ({ books, currentUser, onRequestLogin }) => {
  const t = useT();
  const [scope, setScope] = useState<Scope>('mine');
  const [myLists, setMyLists] = useState<SharedList[]>([]);
  const [publicLists, setPublicLists] = useState<SharedList[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newListForm, setNewListForm] = useState({ name: '', description: '', isPublic: false });
  const [activeListId, setActiveListId] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const asMember = useCallback(
    (role: SharedListMember['role']): SharedListMember | null =>
      currentUser
        ? {
            userId: currentUser.uid,
            email: currentUser.email?.toLowerCase() ?? undefined,
            displayName: currentUser.displayName ?? undefined,
            photoURL: currentUser.photoURL ?? undefined,
            role,
          }
        : null,
    [currentUser]
  );

  const loadLists = useCallback(async () => {
    if (!isFirebaseConfigured) {
      setError(firebaseConfigError ? formatError(t, firebaseConfigError) : null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const [mine, publics] = await Promise.all([
        currentUser ? getSharedListsForUser(currentUser.uid) : Promise.resolve([]),
        getPublicSharedLists(currentUser?.uid),
      ]);
      setMyLists(mine);
      setPublicLists(publics);
    } catch (thrown) {
      setError(formatError(t, thrown));
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, t]);

  useEffect(() => {
    void loadLists();
  }, [loadLists]);

  // Live updates for the user's own lists, so a collaborator's edit shows up
  // without a reload. Public lists stay on the one-shot fetch above; they are
  // browsed, not co-edited.
  useEffect(() => {
    if (!isFirebaseConfigured || !currentUser) return;
    return subscribeToUserLists(
      currentUser.uid,
      (lists) => {
        setMyLists(lists);
        setIsLoading(false);
      },
      (thrown) => setError(thrown.message)
    );
  }, [currentUser]);

  // Pull in any invitations addressed to this user's email.
  useEffect(() => {
    const member = asMember('contributor');
    if (!member?.email) return;
    claimInvitations(member)
      .then((claimed) => {
        if (claimed.length > 0) {
          setNotice(t.sharedLists.joinedInvites(claimed.length));
          void loadLists();
        }
      })
      .catch((thrown) => setError(formatError(t, thrown)));
  }, [asMember, loadLists, t]);

  const activeList = [...myLists, ...publicLists].find((l) => l.id === activeListId) ?? null;
  const isOwner = activeList != null && currentUser != null && activeList.ownerId === currentUser.uid;
  const isMember = activeList != null && currentUser != null && activeList.memberIds.includes(currentUser.uid);

  const run = async (action: () => Promise<void>) => {
    setError(null);
    try {
      await action();
    } catch (thrown) {
      setError(formatError(t, thrown));
    }
  };

  const handleCreateList = async (event: React.FormEvent) => {
    event.preventDefault();
    const me = asMember('owner');
    if (!me || !newListForm.name.trim()) return;

    const newList: SharedList = {
      id: `list-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      name: newListForm.name.trim(),
      description: newListForm.description.trim(),
      isPublic: newListForm.isPublic,
      ownerId: me.userId,
      members: [me],
      memberIds: [me.userId],
      invitedEmails: [],
      books: [],
      createdAt: new Date().toISOString(),
    };

    await run(async () => {
      await createSharedList(newList);
      setMyLists((prev) => [newList, ...prev]);
      setIsCreating(false);
      setNewListForm({ name: '', description: '', isPublic: false });
      haptic.success();
    });
  };

  const handleAddBook = (listId: string, book: Book) =>
    run(async () => {
      await addBookToSharedList(listId, book);
      setMyLists((prev) => prev.map((l) => (l.id === listId ? { ...l, books: [...l.books, book] } : l)));
      haptic.selectionClick();
    });

  const handleRemoveBook = (listId: string, bookId: string) =>
    run(async () => {
      await removeBookFromSharedList(listId, bookId);
      setMyLists((prev) =>
        prev.map((l) => (l.id === listId ? { ...l, books: l.books.filter((b) => b.id !== bookId) } : l))
      );
    });

  const handleInvite = (listId: string) =>
    run(async () => {
      await inviteByEmail(listId, inviteEmail);
      setMyLists((prev) =>
        prev.map((l) =>
          l.id === listId ? { ...l, invitedEmails: [...(l.invitedEmails ?? []), inviteEmail.trim().toLowerCase()] } : l
        )
      );
      setNotice(t.sharedLists.inviteRecorded(inviteEmail.trim().toLowerCase()));
      setInviteEmail('');
    });

  const handleDelete = (listId: string) =>
    run(async () => {
      await deleteSharedList(listId);
      setMyLists((prev) => prev.filter((l) => l.id !== listId));
      setActiveListId(null);
      setPendingDeleteId(null);
    });

  const handleJoin = (listId: string) => {
    const me = asMember('contributor');
    if (!me) return;
    return run(async () => {
      await joinPublicList(listId, me);
      // The live subscription picks up the new membership; only the public list
      // needs a manual refresh so the joined list stops showing as joinable.
      setPublicLists((prev) => prev.filter((list) => list.id !== listId));
      setScope('mine');
      haptic.success();
    });
  };

  const renderListCard = (list: SharedList, joinable: boolean) => (
    <div
      key={list.id}
      role="button"
      tabIndex={0}
      onClick={() => setActiveListId(list.id)}
      onKeyDown={activateOnKey(() => setActiveListId(list.id))}
      className="bg-[#1C1916] rounded-xl p-5 border border-[#3A332A] hover:border-[#C9963F]/50 cursor-pointer transition-all group flex flex-col"
    >
      <div className="flex justify-between items-start mb-2 gap-2">
        <h3 className="font-serif-literata text-[18px] text-[#F4EFE6] group-hover:text-[#C9963F] transition-colors">
          {list.name}
        </h3>
        <span className="material-symbols-outlined text-[16px] text-[#A79C8C]" title={list.isPublic ? t.sharedLists.public : t.sharedLists.inviteOnly} aria-hidden="true">
          {list.isPublic ? 'public' : 'lock'}
        </span>
      </div>
      <p className="text-[13px] text-[#A79C8C] mb-4 line-clamp-2">{list.description || t.sharedLists.noDescription}</p>

      <div className="flex items-center justify-between mt-auto">
        <span className="text-[12px] text-[#8C8273] font-mono-ibm">{t.sharedLists.bookCount(list.books.length)}</span>
        <div className="flex -space-x-2">
          {list.members.slice(0, 5).map((member, index) => (
            <div
              key={`${member.userId}-${index}`}
              className="w-6 h-6 rounded-full border border-[#1C1916] bg-[#2C251D] overflow-hidden flex items-center justify-center"
              title={member.displayName || member.email}
            >
              {member.photoURL ? (
                <img src={member.photoURL} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-[10px] text-[#C9963F] font-bold uppercase">
                  {(member.displayName || member.email || '?').charAt(0)}
                </span>
              )}
            </div>
          ))}
          {list.members.length > 5 && (
            <div className="w-6 h-6 rounded-full border border-[#1C1916] bg-[#3A332A] flex items-center justify-center text-[10px] text-[#A79C8C]">
              +{list.members.length - 5}
            </div>
          )}
        </div>
      </div>

      {joinable && (
        <button
          onClick={(event) => {
            event.stopPropagation();
            void handleJoin(list.id);
          }}
          className="mt-4 w-full py-2 bg-[#262119] hover:bg-[#3A332A] text-[#C9963F] rounded-lg font-mono-ibm text-[11px] font-bold uppercase tracking-wider transition-colors"
        >
          {t.sharedLists.joinList}
        </button>
      )}
    </div>
  );

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      {!activeListId ? (
        <>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 border-b border-[#3A332A] pb-4">
            <div>
              <h2 className="font-serif-literata text-[24px] text-[#F4EFE6] font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-[#C9963F] text-[28px]" aria-hidden="true">group</span>
                {t.sharedLists.title}
              </h2>
              <p className="font-sans-inter text-[13px] text-[#A79C8C] mt-0.5">
                {t.sharedLists.subtitle}
              </p>
            </div>
            {currentUser && (
              <button
                onClick={() => {
                  haptic.lightImpact();
                  setIsCreating((open) => !open);
                }}
                className="px-4 py-2 bg-[#C9963F] hover:bg-[#b58332] text-[#12100E] font-mono-ibm text-[12px] font-bold rounded-xl tracking-wider transition-all flex items-center gap-1.5 shadow-[0_4px_16px_rgba(201,150,63,0.3)]"
              >
                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">add</span>
                <span>{t.sharedLists.createList}</span>
              </button>
            )}
          </div>

          <div className="flex gap-2">
            {(['mine', 'public'] as const).map((value) => (
              <button
                key={value}
                onClick={() => setScope(value)}
                className={`px-4 py-1.5 rounded-lg font-mono-ibm text-[11px] uppercase tracking-wider transition-colors ${
                  scope === value ? 'bg-[#C9963F] text-[#12100E] font-bold' : 'bg-[#1C1916] text-[#A79C8C] hairline-border'
                }`}
              >
                {value === 'mine' ? t.sharedLists.myLists(myLists.length) : t.sharedLists.publicLists(publicLists.length)}
              </button>
            ))}
          </div>

          {notice && (
            <div className="bg-[#1C2C1D]/60 border border-[#6E8F6A]/50 rounded-xl px-4 py-3 text-[13px] text-[#85E07D]">
              {notice}
            </div>
          )}

          {error && (
            <div className="bg-[#2A1A1A] border border-[#A9503F]/50 rounded-xl px-4 py-3 text-[13px] text-[#FF6B6B] break-words">
              {error}
            </div>
          )}

          {!currentUser && (
            <div className="bg-[#262119] border border-[#C9963F]/30 rounded-xl p-6 text-center">
              <span className="material-symbols-outlined text-[32px] text-[#C9963F] mb-2" aria-hidden="true">lock</span>
              <h3 className="text-[#F4EFE6] font-serif-literata text-[18px] mb-2">{t.sharedLists.signInTitle}</h3>
              <p className="text-[#A79C8C] text-[13px] max-w-md mx-auto mb-4">
                {t.sharedLists.signInBody}
              </p>
              {onRequestLogin && isFirebaseConfigured && (
                <button
                  onClick={onRequestLogin}
                  className="px-4 py-2 bg-[#C9963F] text-[#12100E] rounded-xl font-mono-ibm text-[11px] font-bold uppercase tracking-wider"
                >
                  {t.header.signInWithGoogle}
                </button>
              )}
            </div>
          )}

          {isCreating && currentUser && (
            <form onSubmit={handleCreateList} className="bg-[#1C1916] rounded-xl p-5 border border-[#C9963F]/50 space-y-4">
              <input
                type="text"
                placeholder={t.sharedLists.namePlaceholder}
                value={newListForm.name}
                onChange={(event) => setNewListForm({ ...newListForm, name: event.target.value })}
                className="w-full bg-[#12100E] text-[#F4EFE6] border border-[#3A332A] rounded-xl px-4 py-2.5 text-[14px] focus:border-[#C9963F] outline-none"
                required
              />
              <textarea
                placeholder={t.sharedLists.descriptionPlaceholder}
                value={newListForm.description}
                onChange={(event) => setNewListForm({ ...newListForm, description: event.target.value })}
                className="w-full bg-[#12100E] text-[#F4EFE6] border border-[#3A332A] rounded-xl px-4 py-2.5 text-[14px] focus:border-[#C9963F] outline-none min-h-[80px]"
              />
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={newListForm.isPublic}
                  onChange={(event) => setNewListForm({ ...newListForm, isPublic: event.target.checked })}
                  className="accent-[#C9963F]"
                />
                <label htmlFor="isPublic" className="text-[13px] text-[#D4CDA8]">
                  {t.sharedLists.makePublic}
                </label>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setIsCreating(false)} className="px-4 py-2 text-[#A79C8C] hover:text-[#F4EFE6] text-sm">
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#2C251D] hover:bg-[#3A332A] text-[#C9963F] border border-[#C9963F]/30 rounded-lg text-sm font-bold tracking-wider"
                >
                  {t.common.save}
                </button>
              </div>
            </form>
          )}

          {isLoading ? (
            <div className="text-center text-[#A79C8C] py-10 font-mono-ibm text-[12px] uppercase tracking-widest">
              {t.sharedLists.loading}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(scope === 'mine' ? myLists : publicLists).map((list) => renderListCard(list, scope === 'public' && !!currentUser))}
              {(scope === 'mine' ? myLists : publicLists).length === 0 && (
                <div className="col-span-full text-center py-12 text-[#8C8273]">
                  {scope === 'mine' ? t.sharedLists.emptyMine : t.sharedLists.emptyPublic}
                </div>
              )}
            </div>
          )}
        </>
      ) : !activeList ? (
        <div className="space-y-4">
          <p className="text-[#FF6B6B] text-[13px]">{t.sharedLists.listGone}</p>
          <button onClick={() => setActiveListId(null)} className="text-[#C9963F] font-mono-ibm text-[12px]">
            {t.sharedLists.backToLists}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <button
            onClick={() => setActiveListId(null)}
            className="flex items-center gap-1 text-[#A79C8C] hover:text-[#C9963F] transition-colors text-[13px] font-mono-ibm"
          >
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">arrow_back</span>
            {t.sharedLists.backToLists}
          </button>

          {error && (
            <div className="bg-[#2A1A1A] border border-[#A9503F]/50 rounded-xl px-4 py-3 text-[13px] text-[#FF6B6B] break-words">
              {error}
            </div>
          )}

          <div className="bg-[#1C1916] rounded-xl p-6 border border-[#3A332A]">
            <div className="flex justify-between items-start mb-4 gap-4">
              <div className="min-w-0">
                <h2 className="font-serif-literata text-[28px] text-[#F4EFE6]">{activeList.name}</h2>
                <p className="text-[#A79C8C]">{activeList.description}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2">
                  {activeList.members.map((member, index) => (
                    <div
                      key={`${member.userId}-${index}`}
                      className="w-8 h-8 rounded-full border-2 border-[#1C1916] bg-[#2C251D] overflow-hidden flex items-center justify-center"
                      title={member.displayName || member.email}
                    >
                      {member.photoURL ? (
                        <img src={member.photoURL} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[12px] text-[#C9963F] font-bold uppercase">
                          {(member.displayName || member.email || '?').charAt(0)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
                {isOwner &&
                  (pendingDeleteId === activeList.id ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => void handleDelete(activeList.id)}
                        className="px-3 py-1.5 bg-[#A9503F] text-white rounded-lg font-mono-ibm text-[11px] font-bold uppercase"
                      >
                        {t.common.confirm}
                      </button>
                      <button onClick={() => setPendingDeleteId(null)} className="px-2 text-[#A79C8C] text-[11px] font-mono-ibm">
                        {t.common.cancel}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setPendingDeleteId(activeList.id)}
                      className="p-2 rounded-lg bg-[#262119] text-[#A79C8C] hover:text-[#FF6B6B] transition-colors"
                      title={t.sharedLists.deleteList}
                     aria-label={t.sharedLists.deleteList}>
                      <span className="material-symbols-outlined text-[18px]" aria-hidden="true">delete</span>
                    </button>
                  ))}
              </div>
            </div>

            {isOwner && (
              <div className="border-t border-[#3A332A] pt-5">
                <h3 className="font-mono-ibm text-[12px] text-[#C9963F] mb-3 uppercase tracking-wider">{t.sharedLists.inviteReader}</h3>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(event) => setInviteEmail(event.target.value)}
                    placeholder="friend@example.com"
                    className="flex-1 bg-[#12100E] text-[#F4EFE6] border border-[#3A332A] rounded-lg px-3 py-2 text-[13px] focus:border-[#C9963F] outline-none"
                  />
                  <button
                    onClick={() => void handleInvite(activeList.id)}
                    disabled={!inviteEmail.trim()}
                    className="px-4 py-2 bg-[#262119] hover:bg-[#3A332A] text-[#C9963F] rounded-lg font-mono-ibm text-[11px] font-bold uppercase tracking-wider disabled:opacity-50"
                  >
                    {t.sharedLists.invite}
                  </button>
                </div>
                {(activeList.invitedEmails?.length ?? 0) > 0 && (
                  <p className="mt-2 text-[11px] font-mono-ibm text-[#8C8273]">
                    {t.sharedLists.pending(activeList.invitedEmails!.join(', '))}
                  </p>
                )}
              </div>
            )}

            <div className="mt-8 border-t border-[#3A332A] pt-6">
              <h3 className="font-mono-ibm text-[12px] text-[#C9963F] mb-4 uppercase tracking-wider">{t.sharedLists.booksInList}</h3>
              {activeList.books.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {activeList.books.map((book) => (
                    <div key={book.id} className="relative group">
                      <div className="aspect-[2/3] rounded-lg overflow-hidden bg-[#262119] border border-[#3A332A]">
                        <BookCover
                          coverUrl={book.coverUrl}
                          title={book.title}
                          spineColor={book.spineColor}
                          className="w-full h-full"
                          fallbackTextSize={11}
                        />
                      </div>
                      <p className="mt-1 text-[11px] text-[#A79C8C] truncate">{book.title}</p>
                      {isMember && (
                        <button
                          onClick={() => void handleRemoveBook(activeList.id, book.id)}
                          className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 text-[#A79C8C] hover:text-[#FF6B6B] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                          title={t.sharedLists.removeFromList}
                         aria-label={t.sharedLists.removeFromList}>
                          <span className="material-symbols-outlined text-[14px]" aria-hidden="true">close</span>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[#8C8273]">{t.sharedLists.noBooks}</p>
              )}
            </div>

            {isMember && (
              <div className="mt-8 border-t border-[#3A332A] pt-6">
                <h3 className="font-mono-ibm text-[12px] text-[#C9963F] mb-4 uppercase tracking-wider">
                  {t.sharedLists.addFromLibrary}
                </h3>
                <div className="flex overflow-x-auto gap-4 pb-4 snap-x">
                  {books
                    .filter((book) => !activeList.books.some((listed) => listed.id === book.id))
                    .map((book) => (
                      <button
                        key={book.id}
                        onClick={() => void handleAddBook(activeList.id, book)}
                        className="min-w-[100px] snap-start flex flex-col items-center gap-2 cursor-pointer"
                      >
                        <div className="w-[80px] h-[120px] rounded shadow bg-[#262119] overflow-hidden">
                          <BookCover
                            coverUrl={book.coverUrl}
                            title={book.title}
                            spineColor={book.spineColor}
                            className="w-full h-full"
                            fallbackTextSize={9}
                          />
                        </div>
                        <span className="text-[10px] bg-[#3A332A] hover:bg-[#C9963F] text-[#D4CDA8] hover:text-[#12100E] px-2 py-1 rounded-full transition-colors w-full">
                          {t.recommended.add}
                        </span>
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
