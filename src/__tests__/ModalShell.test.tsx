// @vitest-environment jsdom
import React from 'react';
import { describe, expect, it, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { ModalShell } from '../components/ModalShell';

afterEach(cleanup);

const Dialog: React.FC<{ onClose: () => void; isOpen?: boolean; closeOnBackdrop?: boolean }> = ({
  onClose,
  isOpen = true,
  closeOnBackdrop,
}) => (
  <ModalShell isOpen={isOpen} onClose={onClose} label="Test dialog" closeOnBackdrop={closeOnBackdrop} className="shell">
    <button>first</button>
    <button>second</button>
  </ModalShell>
);

describe('ModalShell', () => {
  it('exposes the dialog to assistive technology', () => {
    render(<Dialog onClose={() => {}} />);
    const dialog = screen.getByRole('dialog', { name: 'Test dialog' });
    expect(dialog.getAttribute('aria-modal')).toBe('true');
  });

  it('renders nothing when closed', () => {
    render(<Dialog onClose={() => {}} isOpen={false} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('closes on Escape', () => {
    const onClose = vi.fn();
    render(<Dialog onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('locks body scroll while open and restores it on close', () => {
    const { unmount } = render(<Dialog onClose={() => {}} />);
    expect(document.body.style.overflow).toBe('hidden');
    unmount();
    expect(document.body.style.overflow).toBe('');
  });

  it('moves focus into the dialog and restores it afterwards', () => {
    const opener = document.createElement('button');
    document.body.appendChild(opener);
    opener.focus();
    expect(document.activeElement).toBe(opener);

    const { unmount } = render(<Dialog onClose={() => {}} />);
    expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(true);

    unmount();
    expect(document.activeElement).toBe(opener);
    opener.remove();
  });

  it('wraps focus from the last element back to the first', () => {
    render(<Dialog onClose={() => {}} />);
    const [first, second] = screen.getAllByRole('button');
    second.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(first);
  });

  it('wraps backwards from the first element to the last', () => {
    render(<Dialog onClose={() => {}} />);
    const [first, second] = screen.getAllByRole('button');
    first.focus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(second);
  });

  it('closes on a backdrop click only when asked to', () => {
    const onClose = vi.fn();
    const { rerender } = render(<Dialog onClose={onClose} closeOnBackdrop />);
    fireEvent.mouseDown(screen.getByRole('dialog'));
    expect(onClose).toHaveBeenCalledTimes(1);

    onClose.mockClear();
    rerender(<Dialog onClose={onClose} closeOnBackdrop={false} />);
    fireEvent.mouseDown(screen.getByRole('dialog'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('ignores clicks that started on the content, not the backdrop', () => {
    const onClose = vi.fn();
    render(<Dialog onClose={onClose} closeOnBackdrop />);
    fireEvent.mouseDown(screen.getAllByRole('button')[0]);
    expect(onClose).not.toHaveBeenCalled();
  });
});
