import type { KeyboardEvent } from 'react';

/**
 * Keyboard activation for an element that has to stay a `div`.
 *
 * A `<button>` is always the better answer, but several of these cards carry
 * their own buttons inside them, and a button may not nest interactive content.
 * Pair this with `role="button"` (or `role="checkbox"`) and `tabIndex={0}` so
 * the element is reachable by keyboard at all, not just clickable by mouse.
 */
export function activateOnKey(onActivate: () => void) {
  return (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    // A control inside the card handles its own key press; do not fire twice.
    if (event.target !== event.currentTarget) return;
    // Space would otherwise scroll the page.
    event.preventDefault();
    onActivate();
  };
}
