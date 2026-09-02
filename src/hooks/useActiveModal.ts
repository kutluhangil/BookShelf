import { useCallback, useState } from 'react';

/**
 * Which overlay is on screen.
 *
 * There used to be ten independent booleans plus three "active record" fields,
 * so nothing stopped two dialogs opening at once — and one path actually did
 * it: opening the profile share reused the sheet without clearing the shelf a
 * previous share had left behind, so the profile showed someone's bookshelf.
 * One value makes that unrepresentable.
 *
 * The record-bound variants hold an id rather than a copy of the record. A copy
 * has to be patched in step with the list it came from; an id cannot go stale.
 */
export type ActiveModal =
  | { kind: 'none' }
  | { kind: 'scanner' }
  | { kind: 'bookDetail'; bookId: string }
  | { kind: 'reviewCandidate'; candidateId: string }
  | { kind: 'manualSearch'; candidateId: string }
  | { kind: 'manualAdd' }
  | { kind: 'import' }
  /** `shelfId: null` shares the whole profile rather than one shelf. */
  | { kind: 'share'; shelfId: string | null }
  | { kind: 'recommendations' }
  | { kind: 'spikeDashboard' }
  | { kind: 'onboarding' }
  | { kind: 'readingGoals' }
  | { kind: 'compare' };

export interface ActiveModalApi {
  modal: ActiveModal;
  openModal: (modal: Exclude<ActiveModal, { kind: 'none' }>) => void;
  closeModal: () => void;
  /** Closes only if the named dialog is the one currently open. */
  closeIf: (kind: ActiveModal['kind']) => void;
  isOpen: (kind: ActiveModal['kind']) => boolean;
}

const CLOSED: ActiveModal = { kind: 'none' };

export function useActiveModal(): ActiveModalApi {
  const [modal, setModal] = useState<ActiveModal>(CLOSED);

  const openModal = useCallback<ActiveModalApi['openModal']>((next) => setModal(next), []);
  const closeModal = useCallback(() => setModal(CLOSED), []);

  // A dialog's own onClose can arrive after something else has already taken
  // over the slot; closing blindly would then dismiss the wrong thing.
  const closeIf = useCallback((kind: ActiveModal['kind']) => {
    setModal((current) => (current.kind === kind ? CLOSED : current));
  }, []);

  const isOpen = useCallback((kind: ActiveModal['kind']) => modal.kind === kind, [modal]);

  return { modal, openModal, closeModal, closeIf, isOpen };
}
