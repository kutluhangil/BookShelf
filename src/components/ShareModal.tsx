import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shelf, Book } from '../types';
import { ShelfStrip } from './ShelfStrip';
import { haptic } from '../services/haptics';
import { renderShelfCard, canvasToBlob, downloadBlob } from '../services/shelfCard';
import { ModalShell } from './ModalShell';

interface ShareModalProps {
  shelf?: Shelf;
  books: Book[];
  isOpen: boolean;
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  shelf,
  books,
  isOpen,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const booksInScope = useMemo(
    () => (shelf ? books.filter((b) => b.shelfId === shelf.id) : books),
    [books, shelf]
  );

  const topCategories = useMemo(() => {
    const counts = new Map<string, number>();
    booksInScope.forEach((book) => {
      const category = book.category?.trim();
      if (category) counts.set(category, (counts.get(category) ?? 0) + 1);
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([category]) => category);
  }, [booksInScope]);

  if (!isOpen) return null;

  const totalCount = booksInScope.length;
  const shelfName = shelf ? shelf.name : 'Physical Library';
  const colors = (shelf ? shelf.dominantColors : booksInScope.map((b) => b.spineColor || '#C9963F')).slice(0, 60);

  const flash = (message: string) => {
    setError(null);
    setStatus(message);
    window.setTimeout(() => setStatus(null), 2500);
  };

  const fail = (thrown: unknown) => {
    setStatus(null);
    setError(thrown instanceof Error ? thrown.message : String(thrown));
  };

  const buildCard = (format: 'card' | 'story') =>
    renderShelfCard({
      title: shelfName,
      subtitle: `${totalCount} books • physical archive`,
      colors: colors.length > 0 ? colors : ['#C9963F'],
      footnote: new Date().toLocaleDateString(),
      format,
    });

  const handleCopyLink = async () => {
    haptic.selectionClick();
    try {
      if (!navigator.clipboard) throw new Error('Clipboard access is not available in this browser.');
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch (thrown) {
      fail(thrown);
    }
  };

  const handleSaveImage = async (format: 'card' | 'story') => {
    haptic.lightImpact();
    try {
      const blob = await canvasToBlob(buildCard(format));
      downloadBlob(blob, `${shelfName.replace(/\s+/g, '_').toLowerCase()}_${format}.png`);
      flash(format === 'story' ? 'Story image saved' : 'Shelf card saved');
    } catch (thrown) {
      fail(thrown);
    }
  };

  const handleShare = async () => {
    haptic.lightImpact();
    const text = `${shelfName} — ${totalCount} books in my physical library.`;
    try {
      const blob = await canvasToBlob(buildCard('card'));
      const file = new File([blob], 'shelf-card.png', { type: 'image/png' });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: shelfName, text, files: [file] });
        flash('Shared');
        return;
      }
      if (navigator.share) {
        await navigator.share({ title: shelfName, text, url: window.location.href });
        flash('Shared');
        return;
      }
      if (!navigator.clipboard) throw new Error('Sharing and clipboard are both unavailable in this browser.');
      await navigator.clipboard.writeText(`${text} ${window.location.href}`);
      flash('Summary copied to clipboard');
    } catch (thrown) {
      if (thrown instanceof DOMException && thrown.name === 'AbortError') return;
      fail(thrown);
    }
  };

  const handleExportCSV = () => {
    haptic.selectionClick();
    
    const booksToExport = booksInScope;
    
    const headers = ['Title', 'Author', 'ISBN', 'Publisher', 'Publish Year', 'Page Count', 'Status', 'Progress (%)', 'Tags', 'Notes'];
    
    const rows = booksToExport.map(b => [
      `"${(b.title || '').replace(/"/g, '""')}"`,
      `"${(b.author || '').replace(/"/g, '""')}"`,
      `"${b.isbn || ''}"`,
      `"${(b.publisher || '').replace(/"/g, '""')}"`,
      b.publishYear || '',
      b.pageCount || '',
      `"${b.status || ''}"`,
      b.progress || 0,
      `"${(b.tags || []).join(', ')}"`,
      `"${(b.notes || '').replace(/"/g, '""')}"`
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${shelfName.replace(/\s+/g, '_').toLowerCase()}_collection.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    flash(`Exported ${booksToExport.length} volumes as CSV`);
  };

  return (
    <AnimatePresence>
      <ModalShell isOpen={isOpen} onClose={onClose} label="Export and share collection" closeOnBackdrop={false} className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/85 backdrop-blur-md"
        />

        {/* Modal Window (Image 13 layout) */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative z-10 w-full max-w-[480px] bg-[#1C1916] rounded-2xl hairline-border flex flex-col shadow-[0_16px_48px_rgba(0,0,0,0.9)] overflow-hidden"
        >
          {/* Top Bar */}
          <div className="p-4 px-6 border-b border-[#3A332A] flex justify-between items-center bg-[#181512]">
            <span className="font-mono-ibm text-[11px] font-semibold text-[#A79C8C] tracking-widest uppercase">
              EXPORT & SHARE SHELF
            </span>
            <button
              onClick={() => {
                haptic.lightImpact();
                onClose();
              }}
              className="text-[#A79C8C] hover:text-[#F4EFE6] p-1 rounded-full"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          <div className="p-6 flex flex-col items-center">
            {/* The Shareable Shelf Card (Image 13) */}
            <div className="w-full bg-[#12100E] p-6 rounded-xl hairline-border brass-glow relative overflow-hidden flex flex-col items-center text-center mb-6">
              {/* Subtle grid background */}
              <div className="absolute inset-0 bg-[radial-gradient(#3A332A_1px,transparent_1px)] [background-size:16px_16px] opacity-20 pointer-events-none" />

              {/* Title & Volume Tag */}
              <p className="font-mono-ibm text-[11px] text-[#C9963F] font-semibold tracking-widest uppercase mb-1">
                {totalCount} BOOKS • PHYSICAL ARCHIVE
              </p>
              <h3 className="font-serif-literata text-[24px] sm:text-[26px] text-[#F4EFE6] font-bold mb-4">
                {shelfName}
              </h3>

              {/* Signature Hero Multicolored ShelfStrip */}
              <div className="w-full my-2">
                <ShelfStrip
                  colors={colors}
                  variant="hero"
                  height={80}
                  themeColor={shelf?.themeColor}
                  texture={shelf?.texture}
                  className="shadow-[0_8px_20px_rgba(0,0,0,0.8)]"
                />
              </div>

              {/* Category tags */}
              {topCategories.length > 0 && (
                <div className="mt-4 flex flex-wrap justify-center gap-2 font-mono-ibm text-[10px] text-[#A79C8C] tracking-widest uppercase">
                  {topCategories.map((category, index) => (
                    <React.Fragment key={category}>
                      {index > 0 && <span>•</span>}
                      <span>{category}</span>
                    </React.Fragment>
                  ))}
                </div>
              )}

              {/* Book Shelf Watermark Branding */}
              <div className="mt-6 pt-4 border-t border-[#3A332A]/50 w-full flex justify-between items-center font-mono-ibm text-[10px] text-[#9C8F7E]">
                <span className="text-[#C9963F] font-serif-literata font-bold text-[14px]">Book Shelf</span>
                <span>{new Date().toLocaleDateString()}</span>
              </div>
            </div>

            {/* Share Target Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full mb-3">
              <button
                onClick={() => void handleCopyLink()}
                className="p-3 bg-[#262119] hover:bg-[#304E2E]/30 hairline-border rounded-xl flex flex-col items-center justify-center gap-1.5 text-[#F4EFE6] transition-colors"
              >
                <span className="material-symbols-outlined text-[#C9963F] text-[22px]">link</span>
                <span className="font-mono-ibm text-[10px] tracking-wider uppercase">
                  {copied ? 'Copied!' : 'Copy Link'}
                </span>
              </button>

              <button
                onClick={() => void handleSaveImage('card')}
                className="p-3 bg-[#262119] hover:bg-[#304E2E]/30 hairline-border rounded-xl flex flex-col items-center justify-center gap-1.5 text-[#F4EFE6] transition-colors"
              >
                <span className="material-symbols-outlined text-[#C9963F] text-[22px]">download</span>
                <span className="font-mono-ibm text-[10px] tracking-wider uppercase">Save Image</span>
              </button>

              <button
                onClick={() => void handleSaveImage('story')}
                className="p-3 bg-[#262119] hover:bg-[#304E2E]/30 hairline-border rounded-xl flex flex-col items-center justify-center gap-1.5 text-[#F4EFE6] transition-colors"
              >
                <span className="material-symbols-outlined text-[#C9963F] text-[22px]">auto_stories</span>
                <span className="font-mono-ibm text-[10px] tracking-wider uppercase">Story 9:16</span>
              </button>

              <button
                onClick={() => void handleShare()}
                className="p-3 bg-[#262119] hover:bg-[#304E2E]/30 hairline-border rounded-xl flex flex-col items-center justify-center gap-1.5 text-[#F4EFE6] transition-colors"
              >
                <span className="material-symbols-outlined text-[#C9963F] text-[22px]">send</span>
                <span className="font-mono-ibm text-[10px] tracking-wider uppercase">Share</span>
              </button>
            </div>

            {(status || error) && (
              <p
                className={`w-full text-center font-mono-ibm text-[11px] mb-3 ${
                  error ? 'text-[#FF6B6B]' : 'text-[#85E07D]'
                }`}
              >
                {error ?? status}
              </p>
            )}

            {/* CSV Export Button */}
            <button
              onClick={handleExportCSV}
              className="w-full p-3.5 bg-[#1C1916] hover:bg-[#C9963F]/10 border border-[#3A332A] hover:border-[#C9963F]/50 rounded-xl flex items-center justify-center gap-2 text-[#C9963F] transition-all group"
            >
              <span className="material-symbols-outlined text-[18px]">table_view</span>
              <span className="font-mono-ibm text-[11px] font-bold tracking-widest uppercase">
                Export Collection as CSV
              </span>
            </button>
          </div>
        </motion.div>
      </ModalShell>
    </AnimatePresence>
  );
};
