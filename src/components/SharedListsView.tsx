import React, { useState, useEffect } from 'react';
import { SharedList, Book, SharedListMember } from '../types';
import { getSharedListsForUser, createSharedList, updateSharedList, deleteSharedList, addBookToSharedList, addMemberToSharedList } from '../services/sharedLists';
import { auth } from '../lib/firebase';
import { User } from 'firebase/auth';
import { haptic } from '../services/haptics';
import { BookCard } from './BookCard';

interface SharedListsViewProps {
  books: Book[]; // User's local books to add to lists
  currentUser: User | null;
}

export const SharedListsView: React.FC<SharedListsViewProps> = ({ books, currentUser }) => {
  const [lists, setLists] = useState<SharedList[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newListForm, setNewListForm] = useState({ name: '', description: '', isPublic: false });
  const [activeListId, setActiveListId] = useState<string | null>(null);

  useEffect(() => {
    loadLists();
  }, [currentUser]);

  const loadLists = async () => {
    if (!currentUser) {
      setIsLoading(false);
      return;
    }
    try {
      const data = await getSharedListsForUser(currentUser.uid);
      setLists(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !newListForm.name.trim()) return;

    const me: SharedListMember = {
      userId: currentUser.uid,
      email: currentUser.email || undefined,
      displayName: currentUser.displayName || undefined,
      photoURL: currentUser.photoURL || undefined,
      role: 'owner'
    };

    const newList: SharedList = {
      id: `list-${Date.now()}`,
      name: newListForm.name,
      description: newListForm.description,
      isPublic: newListForm.isPublic,
      ownerId: currentUser.uid,
      members: [me],
      memberIds: [currentUser.uid],
      books: [],
      createdAt: new Date().toISOString()
    };

    await createSharedList(newList);
    setLists(prev => [...prev, newList]);
    setIsCreating(false);
    setNewListForm({ name: '', description: '', isPublic: false });
    haptic.success();
  };

  const handleAddBook = async (listId: string, book: Book) => {
    await addBookToSharedList(listId, book);
    setLists(prev => prev.map(l => l.id === listId ? { ...l, books: [...l.books, book] } : l));
    haptic.selectionClick();
  };

  const activeList = lists.find(l => l.id === activeListId);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 animate-fade-in">
      {!activeListId ? (
        <>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 border-b border-[#3A332A] pb-4">
            <div>
              <h2 className="font-serif-literata text-[24px] text-[#F4EFE6] font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-[#C9963F] text-[28px]">group</span>
                Shared Lists
              </h2>
              <p className="font-sans-inter text-[13px] text-[#A79C8C] mt-0.5">
                Collaborate with friends or explore public collections
              </p>
            </div>
            <button
              onClick={() => {
                haptic.lightImpact();
                setIsCreating(!isCreating);
              }}
              className="px-4 py-2 bg-[#C9963F] hover:bg-[#b58332] text-[#12100E] font-mono-ibm text-[12px] font-bold rounded-xl tracking-wider transition-all flex items-center gap-1.5 shadow-[0_4px_16px_rgba(201,150,63,0.3)]"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              <span>CREATE LIST</span>
            </button>
          </div>

          {!currentUser && (
            <div className="bg-[#262119] border border-[#C9963F]/30 rounded-xl p-6 text-center">
              <span className="material-symbols-outlined text-[32px] text-[#C9963F] mb-2">lock</span>
              <h3 className="text-[#F4EFE6] font-serif-literata text-[18px] mb-2">Sign in Required</h3>
              <p className="text-[#A79C8C] text-[13px] max-w-md mx-auto mb-4">You need to sign in to create or view shared reading lists and collaborate with others.</p>
            </div>
          )}

          {isCreating && currentUser && (
            <form onSubmit={handleCreateList} className="bg-[#1C1916] rounded-xl p-5 border border-[#C9963F]/50 space-y-4">
              <input
                type="text"
                placeholder="List Name"
                value={newListForm.name}
                onChange={e => setNewListForm({ ...newListForm, name: e.target.value })}
                className="w-full bg-[#12100E] text-[#F4EFE6] border border-[#3A332A] rounded-xl px-4 py-2.5 text-[14px] focus:border-[#C9963F] outline-none"
                required
              />
              <textarea
                placeholder="Description (Optional)"
                value={newListForm.description}
                onChange={e => setNewListForm({ ...newListForm, description: e.target.value })}
                className="w-full bg-[#12100E] text-[#F4EFE6] border border-[#3A332A] rounded-xl px-4 py-2.5 text-[14px] focus:border-[#C9963F] outline-none min-h-[80px]"
              />
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={newListForm.isPublic}
                  onChange={e => setNewListForm({ ...newListForm, isPublic: e.target.checked })}
                  className="accent-[#C9963F]"
                />
                <label htmlFor="isPublic" className="text-[13px] text-[#D4CDA8]">Make this list public</label>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setIsCreating(false)} className="px-4 py-2 text-[#A79C8C] hover:text-[#F4EFE6] text-sm">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-[#2C251D] hover:bg-[#3A332A] text-[#C9963F] border border-[#C9963F]/30 rounded-lg text-sm font-bold tracking-wider">Save</button>
              </div>
            </form>
          )}

          {isLoading ? (
            <div className="text-center text-[#A79C8C] py-10">Loading lists...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {lists.map(list => (
                <div
                  key={list.id}
                  onClick={() => setActiveListId(list.id)}
                  className="bg-[#1C1916] rounded-xl p-5 border border-[#3A332A] hover:border-[#C9963F]/50 cursor-pointer transition-all group"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-serif-literata text-[18px] text-[#F4EFE6] group-hover:text-[#C9963F] transition-colors">{list.name}</h3>
                    {list.isPublic ? (
                      <span className="material-symbols-outlined text-[16px] text-[#A79C8C]" title="Public">public</span>
                    ) : (
                      <span className="material-symbols-outlined text-[16px] text-[#A79C8C]" title="Invite-only">lock</span>
                    )}
                  </div>
                  <p className="text-[13px] text-[#A79C8C] mb-4 line-clamp-2">{list.description || 'No description'}</p>
                  
                  <div className="flex items-center justify-between mt-auto">
                    <span className="text-[12px] text-[#8C8273] font-mono-ibm">{list.books.length} Books</span>
                    
                    {/* Avatars */}
                    <div className="flex -space-x-2">
                      {list.members.slice(0, 5).map((m, i) => (
                        <div key={i} className="w-6 h-6 rounded-full border border-[#1C1916] bg-[#2C251D] overflow-hidden flex items-center justify-center">
                          {m.photoURL ? (
                            <img src={m.photoURL} alt={m.displayName || 'User'} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-[10px] text-[#C9963F] font-bold uppercase">
                              {m.displayName ? m.displayName.charAt(0) : m.email ? m.email.charAt(0) : '?'}
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
                </div>
              ))}
              {lists.length === 0 && !isCreating && (
                <div className="col-span-full text-center py-12 text-[#8C8273]">
                  No shared lists yet. Create one to get started.
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="space-y-6">
          <button 
            onClick={() => setActiveListId(null)}
            className="flex items-center gap-1 text-[#A79C8C] hover:text-[#C9963F] transition-colors text-[13px] font-mono-ibm"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            BACK TO LISTS
          </button>
          
          <div className="bg-[#1C1916] rounded-xl p-6 border border-[#3A332A]">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="font-serif-literata text-[28px] text-[#F4EFE6]">{activeList.name}</h2>
                <p className="text-[#A79C8C]">{activeList.description}</p>
              </div>
              <div className="flex -space-x-2">
                {activeList.members.map((m, i) => (
                  <div key={i} className="w-8 h-8 rounded-full border-2 border-[#1C1916] bg-[#2C251D] overflow-hidden flex items-center justify-center" title={m.displayName || m.email}>
                    {m.photoURL ? (
                      <img src={m.photoURL} alt={m.displayName || 'User'} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[12px] text-[#C9963F] font-bold uppercase">
                        {m.displayName ? m.displayName.charAt(0) : m.email ? m.email.charAt(0) : '?'}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 border-t border-[#3A332A] pt-6">
              <h3 className="font-mono-ibm text-[12px] text-[#C9963F] mb-4 uppercase tracking-wider">Books in this list</h3>
              {activeList.books.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {activeList.books.map(b => (
                    <div key={b.id} className="opacity-90 hover:opacity-100 transition-opacity">
                      <BookCard book={b} onSelect={() => {}} />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[#8C8273]">No books added yet.</p>
              )}
            </div>

            <div className="mt-8 border-t border-[#3A332A] pt-6">
              <h3 className="font-mono-ibm text-[12px] text-[#C9963F] mb-4 uppercase tracking-wider">Add Books to List</h3>
              <div className="flex overflow-x-auto gap-4 pb-4 snap-x">
                {books.filter(b => !activeList.books.find(ab => ab.id === b.id)).map(b => (
                  <div key={b.id} className="min-w-[100px] snap-start flex flex-col items-center gap-2 cursor-pointer" onClick={() => handleAddBook(activeList.id, b)}>
                    <div className="w-[80px] h-[120px] rounded shadow bg-[#262119] overflow-hidden">
                      {b.coverUrl ? (
                        <img src={b.coverUrl} alt={b.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full p-2 text-[8px] text-[#A79C8C] break-words" style={{ backgroundColor: b.spineColor || '#2C251D' }}>
                          {b.title}
                        </div>
                      )}
                    </div>
                    <button className="text-[10px] bg-[#3A332A] hover:bg-[#C9963F] text-[#D4CDA8] hover:text-[#12100E] px-2 py-1 rounded-full transition-colors w-full">
                      ADD
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
