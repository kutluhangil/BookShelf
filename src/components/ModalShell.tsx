import React, { useCallback, useEffect, useRef } from 'react';

interface ModalShellProps {
  isOpen: boolean;
  onClose: () => void;
  /** Accessible name for the dialog. */
  label: string;
  children: React.ReactNode;
  className?: string;
  /** Set false for sheets where a backdrop tap should not dismiss. */
  closeOnBackdrop?: boolean;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Deliberately avoids `offsetParent`, which is null for position: fixed elements
 * and always null without layout, and so silently emptied the focus list.
 */
function isVisible(element: HTMLElement): boolean {
  if (element.hasAttribute('hidden') || element.getAttribute('aria-hidden') === 'true') return false;
  if (element.closest('[hidden], [aria-hidden="true"]')) return false;
  if (typeof window !== 'undefined' && typeof window.getComputedStyle === 'function') {
    const style = window.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
  }
  return true;
}

/**
 * Shared dialog behaviour: Escape to close, a focus trap, focus restoration and
 * a body scroll lock. None of the modals had any of this, so keyboard users
 * could tab out of an open dialog into the page behind it.
 */
export const ModalShell: React.FC<ModalShellProps> = ({
  isOpen,
  onClose,
  label,
  children,
  className = '',
  closeOnBackdrop = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
        return;
      }

      if (event.key !== 'Tab') return;

      const container = containerRef.current;
      if (!container) return;

      const focusable = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(isVisible);
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (event.shiftKey && (active === first || !container.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (!isOpen) return;

    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;

    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown, true);

    // Move focus into the dialog, preferring anything the content auto-focused.
    const container = containerRef.current;
    const autoFocused = container?.querySelector<HTMLElement>('[autofocus]');
    const firstFocusable = container
      ? Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).find(isVisible)
      : undefined;
    const target = autoFocused ?? firstFocusable ?? container;
    target?.focus({ preventScroll: true });

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      document.body.style.overflow = overflow;
      previouslyFocusedRef.current?.focus?.({ preventScroll: true });
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- clicking the backdrop is a mouse shortcut for dismissal; Escape, handled above, is its keyboard equivalent.
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-label={label}
      tabIndex={-1}
      className={className}
      onMouseDown={(event) => {
        if (closeOnBackdrop && event.target === event.currentTarget) onClose();
      }}
    >
      {children}
    </div>
  );
};
