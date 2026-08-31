import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shelf, Book } from '../types';
import { ShelfStrip } from './ShelfStrip';
import { haptic } from '../services/haptics';
import { useT } from '../i18n/I18nProvider';

const SHELF_COLORS = ['#C9963F', '#304E2E', '#2C251D', '#8B2323', '#4A5B69', '#63456B', '#4D4336', '#3E5C76', '#E29578'];
/**
 * Texture identifiers are persisted on the shelf record, so they stay in
 * English; only their labels come from the catalog.
 */
const SHELF_TEXTURES = ['Solid', 'Oak', 'Minimalist Metal', 'Dark Walnut'] as const;

type ShelfTexture = (typeof SHELF_TEXTURES)[number];
const SHELF_MAX_PAGES = 5000; // Estimated linear capacity per shelf

const getShelfBackgroundStyle = (themeColor?: string, texture?: string): React.CSSProperties => {
  const baseBg = '#1C1916';
  let backgroundStyle: React.CSSProperties = { backgroundColor: baseBg };

  const colorPrefix = themeColor ? `linear-gradient(to bottom right, ${themeColor}15, ${themeColor}05), ` : '';

  if (texture === 'Oak' || texture === 'wood') {
    backgroundStyle.backgroundImage = `${colorPrefix}repeating-linear-gradient(45deg, rgba(255,255,255,0.02) 0px, rgba(255,255,255,0.02) 1px, transparent 1px, transparent 6px), repeating-linear-gradient(-45deg, rgba(0,0,0,0.1) 0px, rgba(0,0,0,0.1) 2px, transparent 2px, transparent 8px)`;
  } else if (texture === 'Minimalist Metal' || texture === 'metal') {
    backgroundStyle.backgroundImage = `${colorPrefix}linear-gradient(90deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0) 20%, rgba(0,0,0,0.1) 50%, rgba(255,255,255,0) 80%, rgba(255,255,255,0.02) 100%), repeating-linear-gradient(0deg, rgba(255,255,255,0.02) 0px, rgba(255,255,255,0.02) 1px, transparent 1px, transparent 3px)`;
  } else if (texture === 'Dark Walnut') {
    backgroundStyle.backgroundImage = `${colorPrefix}repeating-linear-gradient(45deg, rgba(0,0,0,0.15) 0px, rgba(0,0,0,0.15) 1px, transparent 1px, transparent 4px), repeating-linear-gradient(-45deg, rgba(0,0,0,0.2) 0px, rgba(0,0,0,0.2) 2px, transparent 2px, transparent 6px)`;
    backgroundStyle.backgroundColor = '#15110E';
  } else if (texture === 'fabric') {
    backgroundStyle.backgroundImage = `${colorPrefix}repeating-linear-gradient(0deg, rgba(255,255,255,0.02) 0px, rgba(255,255,255,0.02) 1px, transparent 1px, transparent 4px), repeating-linear-gradient(90deg, rgba(255,255,255,0.02) 0px, rgba(255,255,255,0.02) 1px, transparent 1px, transparent 4px)`;
  } else if (themeColor) {
    backgroundStyle.backgroundImage = `linear-gradient(to bottom right, ${themeColor}15, transparent)`;
  }

  return backgroundStyle;
};

interface YourShelvesViewProps {
  shelves: Shelf[];
  books: Book[];
  onSelectShelf: (shelfId: string) => void;
  onCreateShelf: (name: string, color?: string, texture?: string) => void;
  onUpdateShelf?: (shelfId: string, updates: Partial<Shelf>) => void;
  onShareShelf: (shelf: Shelf) => void;
  onReorderShelves?: (newShelves: Shelf[]) => void;
  onAutoSort?: () => void;
  onDeleteShelf?: (shelfId: string) => void;
}

export const YourShelvesView: React.FC<YourShelvesViewProps> = ({
  shelves,
  books,
  onSelectShelf,
  onCreateShelf,
  onUpdateShelf,
  onShareShelf,
  onReorderShelves,
  onAutoSort,
  onDeleteShelf,
}) => {
  const t = useT();
  const [isCreating, setIsCreating] = useState(false);
  const [newShelfName, setNewShelfName] = useState('');
  const [newShelfColor, setNewShelfColor] = useState<string>(SHELF_COLORS[0]);
  const [newShelfTexture, setNewShelfTexture] = useState<ShelfTexture>(SHELF_TEXTURES[0]);
  const [editingColorShelfId, setEditingColorShelfId] = useState<string | null>(null);

  const [pendingDeleteShelfId, setPendingDeleteShelfId] = useState<string | null>(null);
  const [draggedShelfId, setDraggedShelfId] = useState<string | null>(null);
  const [dragOverShelfId, setDragOverShelfId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<'before' | 'after' | null>(null);
  const lastOverRef = useRef<string | null>(null);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newShelfName.trim()) {
      haptic.mediumImpact();
      onCreateShelf(newShelfName.trim(), newShelfColor, newShelfTexture);
      setNewShelfName('');
      setNewShelfColor(SHELF_COLORS[0]);
      setNewShelfTexture(SHELF_TEXTURES[0]);
      setIsCreating(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, shelfId: string) => {
    e.dataTransfer.setData('text/plain', shelfId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedShelfId(shelfId);
    haptic.selectionClick();
  };

  const handleDragOver = (e: React.DragEvent, targetShelfId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    if (!draggedShelfId || draggedShelfId === targetShelfId) {
      return;
    }

    const targetRect = e.currentTarget.getBoundingClientRect();
    const midPoint = targetRect.top + targetRect.height / 2;
    const pos = e.clientY < midPoint ? 'before' : 'after';

    if (dragOverShelfId !== targetShelfId || dropPosition !== pos) {
      setDragOverShelfId(targetShelfId);
      setDropPosition(pos);
      if (lastOverRef.current !== `${targetShelfId}-${pos}`) {
        haptic.lightImpact();
        lastOverRef.current = `${targetShelfId}-${pos}`;
      }
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only reset if leaving the bounding container
    const currentTarget = e.currentTarget;
    const relatedTarget = e.relatedTarget as Node | null;
    if (!currentTarget.contains(relatedTarget)) {
      setDragOverShelfId(null);
      setDropPosition(null);
      lastOverRef.current = null;
    }
  };

  const handleDrop = (e: React.DragEvent, targetShelfId: string) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData('text/plain') || draggedShelfId;

    if (sourceId && sourceId !== targetShelfId && onReorderShelves) {
      const sourceIndex = shelves.findIndex((s) => s.id === sourceId);
      const targetIndex = shelves.findIndex((s) => s.id === targetShelfId);

      if (sourceIndex !== -1 && targetIndex !== -1) {
        const reordered = [...shelves];
        const [movedItem] = reordered.splice(sourceIndex, 1);
        
        let insertIndex = targetIndex;
        if (dropPosition === 'after') {
          insertIndex = sourceIndex < targetIndex ? targetIndex : targetIndex + 1;
        } else {
          insertIndex = sourceIndex < targetIndex ? targetIndex - 1 : targetIndex;
        }
        
        // Clamp insertion index
        insertIndex = Math.max(0, Math.min(reordered.length, insertIndex));
        reordered.splice(insertIndex, 0, movedItem);

        // Update sort order attributes
        const updated = reordered.map((s, idx) => ({ ...s, sortOrder: idx + 1 }));
        onReorderShelves(updated);
        haptic.mediumImpact();
      }
    }

    setDraggedShelfId(null);
    setDragOverShelfId(null);
    setDropPosition(null);
    lastOverRef.current = null;
  };

  const handleDragEnd = () => {
    setDraggedShelfId(null);
    setDragOverShelfId(null);
    setDropPosition(null);
    lastOverRef.current = null;
  };

  // Move shelf up or down by 1 index (touch / keyboard accessibility)
  const handleMoveShelf = (shelfId: string, direction: 'up' | 'down') => {
    if (!onReorderShelves) return;
    const currentIndex = shelves.findIndex((s) => s.id === shelfId);
    if (currentIndex === -1) return;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= shelves.length) return;

    haptic.selectionClick();
    const reordered = [...shelves];
    const [item] = reordered.splice(currentIndex, 1);
    reordered.splice(targetIndex, 0, item);

    const updated = reordered.map((s, idx) => ({ ...s, sortOrder: idx + 1 }));
    onReorderShelves(updated);
  };

  return (
    <div className="max-w-[1000px] mx-auto w-full px-4 sm:px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-[#3A332A] pb-4">
        <div>
          <h2 className="font-serif-literata text-[26px] sm:text-[30px] text-[#F4EFE6] font-bold">
            {t.shelves.title}
          </h2>
          <p className="font-sans-inter text-[13px] text-[#A79C8C] flex items-center gap-2 mt-0.5">
            <span>{t.shelves.summary(shelves.length, books.length)}</span>
            <span className="hidden sm:inline text-[#C9963F]/70">•</span>
            <span className="hidden sm:inline text-[#C9963F] font-mono-ibm text-[11px]">
              {t.shelves.dragHint}
            </span>
          </p>
        </div>

        <div className="flex gap-2">
          {onAutoSort && (
            <button
              onClick={() => {
                haptic.mediumImpact();
                onAutoSort();
              }}
              className="px-4 py-2 bg-[#2C251D] hover:bg-[#3A332A] text-[#C9963F] font-mono-ibm text-[12px] font-bold rounded-xl tracking-wider transition-all flex items-center gap-1.5 border border-[#C9963F]/30 hover:border-[#C9963F]"
            >
              <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
              <span className="hidden sm:inline">{t.shelves.autoSort}</span>
            </button>
          )}
          <button
            onClick={() => {
              haptic.lightImpact();
              setIsCreating(true);
            }}
            className="px-4 py-2 bg-[#C9963F] hover:bg-[#b58332] text-[#12100E] font-mono-ibm text-[12px] font-bold rounded-xl tracking-wider transition-all flex items-center gap-1.5 shadow-[0_4px_16px_rgba(201,150,63,0.3)]"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>{t.shelves.newShelf}</span>
          </button>
        </div>
      </div>

      {/* New Shelf Creator Inline Card */}
      {isCreating && (
        <form
          onSubmit={handleCreate}
          className="bg-[#1C1916] rounded-xl p-4 sm:p-5 hairline-border border-[#C9963F]/50 flex flex-col sm:flex-row gap-3 items-center"
        >
          <div className="flex-1 w-full space-y-3">
            <input
              type="text"
              value={newShelfName}
              onChange={(e) => setNewShelfName(e.target.value)}
              placeholder={t.shelves.namePlaceholder}
              autoFocus
              className="w-full bg-[#12100E] text-[#F4EFE6] hairline-border rounded-xl px-4 py-2.5 text-[14px] font-sans-inter focus:outline-none focus:border-[#C9963F]"
            />
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[#A79C8C] font-mono-ibm uppercase tracking-wider">
                {t.shelves.themeColor}
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {SHELF_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      haptic.selectionClick();
                      setNewShelfColor(c);
                    }}
                    className={`w-6 h-6 rounded-full transition-transform ${newShelfColor === c ? 'scale-110 ring-2 ring-offset-2 ring-offset-[#1C1916] ring-[#C9963F]' : 'hover:scale-110 opacity-70 hover:opacity-100'}`}
                    style={{ backgroundColor: c }}
                    title={t.shelves.selectColor(c)}
                  />
                ))}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[#A79C8C] font-mono-ibm uppercase tracking-wider">
                {t.shelves.texture}
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {SHELF_TEXTURES.map((texture) => (
                  <button
                    key={texture}
                    type="button"
                    onClick={() => {
                      haptic.selectionClick();
                      setNewShelfTexture(texture);
                    }}
                    className={`px-3 py-1 rounded-lg text-[10px] uppercase font-mono-ibm transition-colors ${newShelfTexture === texture ? 'bg-[#C9963F] text-[#12100E] font-bold' : 'bg-[#12100E] text-[#A79C8C] border border-[#3A332A] hover:text-[#F4EFE6]'}`}
                  >
                    {t.shelves.textures[texture]}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-2 w-full sm:w-auto self-start sm:self-center mt-2 sm:mt-0">
            <button
              type="submit"
              className="flex-1 sm:flex-none px-4 py-2.5 bg-[#C9963F] text-[#12100E] font-mono-ibm text-[11px] font-bold rounded-lg uppercase tracking-wider"
            >
              {t.shelves.create}
            </button>
            <button
              type="button"
              onClick={() => {
                haptic.lightImpact();
                setIsCreating(false);
              }}
              className="flex-1 sm:flex-none px-4 py-2.5 hairline-border text-[#A79C8C] hover:text-[#F4EFE6] font-mono-ibm text-[11px] rounded-lg uppercase tracking-wider"
            >
              {t.common.cancel}
            </button>
          </div>
        </form>
      )}

      {/* Shelves List with Drag-and-Drop Reordering */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        <AnimatePresence>
          {shelves.map((shelf, index) => {
            const shelfBooks = books.filter((b) => b.shelfId === shelf.id);
            const colors =
              shelfBooks.length > 0
                ? shelfBooks.map((b) => b.spineColor || '#C9963F')
                : shelf.dominantColors;
            const isDragging = draggedShelfId === shelf.id;
            const isOver = dragOverShelfId === shelf.id;

            const totalPages = shelfBooks.reduce((sum, b) => sum + (b.pageCount || 250), 0);
            const capacityPercentage = Math.min(100, Math.round((totalPages / SHELF_MAX_PAGES) * 100));
            const isNearCapacity = capacityPercentage > 85;

            return (
              <motion.div
                key={shelf.id}
                layout
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                draggable
                onDragStart={(e) => handleDragStart(e as unknown as React.DragEvent, shelf.id)}
                onDragOver={(e) => handleDragOver(e as unknown as React.DragEvent, shelf.id)}
                onDragLeave={(e) => handleDragLeave(e as unknown as React.DragEvent)}
                onDrop={(e) => handleDrop(e as unknown as React.DragEvent, shelf.id)}
                onDragEnd={handleDragEnd}
                onClick={() => {
                  haptic.lightImpact();
                  onSelectShelf(shelf.id);
                }}
                style={getShelfBackgroundStyle(shelf.themeColor, shelf.texture)}
                className={`rounded-2xl p-5 sm:p-6 hairline-border paper-glow transition-all duration-200 cursor-pointer group flex flex-col justify-between relative ${
                  isDragging
                    ? 'opacity-40 scale-[0.98] border-dashed border-[#C9963F]'
                    : isOver
                    ? 'border-[#C9963F] shadow-[0_0_20px_rgba(201,150,63,0.25)] bg-[#221F1D]'
                    : 'border-[#3A332A] hover:bg-[#221F1D]'
                }`}
              >
                {/* Visual Drop Insertion Indicators */}
                {isOver && dropPosition === 'before' && (
                  <div className="absolute -top-2.5 left-4 right-4 h-1 bg-[#C9963F] rounded-full shadow-[0_0_8px_#C9963F] pointer-events-none z-30" />
                )}
                {isOver && dropPosition === 'after' && (
                  <div className="absolute -bottom-2.5 left-4 right-4 h-1 bg-[#C9963F] rounded-full shadow-[0_0_8px_#C9963F] pointer-events-none z-30" />
                )}

                <div>
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-start gap-2.5">
                      {/* Drag Handle */}
                      <div
                        className="cursor-grab active:cursor-grabbing p-1 -ml-1 text-[#A79C8C] hover:text-[#C9963F] rounded transition-colors touch-none"
                        title={t.shelves.dragHandle}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="material-symbols-outlined text-[20px] select-none">
                          drag_indicator
                        </span>
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 bg-[#262119] text-[#C9963F] border border-[#3A332A] rounded text-[9px] font-mono-ibm font-bold tracking-wider">
                            {t.shelves.shelfIndex(index + 1)}
                          </span>
                          <h3 className="font-serif-literata text-[20px] sm:text-[22px] text-[#F4EFE6] group-hover:text-[#C9963F] transition-colors font-semibold leading-tight">
                            {shelf.name}
                          </h3>
                        </div>
                        <p className="font-mono-ibm text-[11px] text-[#A79C8C] mt-1">
                          {t.shelves.physicalVolumes(shelfBooks.length > 0 ? shelfBooks.length : shelf.volumeCount)}
                        </p>
                        
                        {/* Capacity Indicator moved to bottom of card */}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {/* Reorder Stepper Buttons (Up/Down) for Quick / Touch Reordering */}
                      {onReorderShelves && (
                        <div className="flex items-center bg-[#262119] rounded-lg border border-[#3A332A] overflow-hidden mr-1">
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMoveShelf(shelf.id, 'up');
                            }}
                            className={`p-1.5 transition-colors ${
                              index === 0
                                ? 'text-[#5A5044] cursor-not-allowed'
                                : 'text-[#A79C8C] hover:text-[#F4EFE6] hover:bg-[#322B22]'
                            }`}
                            title={t.shelves.moveUp}
                          >
                            <span className="material-symbols-outlined text-[16px] leading-none">
                              arrow_upward
                            </span>
                          </button>
                          <div className="w-[1px] h-3.5 bg-[#3A332A]" />
                          <button
                            type="button"
                            disabled={index === shelves.length - 1}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMoveShelf(shelf.id, 'down');
                            }}
                            className={`p-1.5 transition-colors ${
                              index === shelves.length - 1
                                ? 'text-[#5A5044] cursor-not-allowed'
                                : 'text-[#A79C8C] hover:text-[#F4EFE6] hover:bg-[#322B22]'
                            }`}
                            title={t.shelves.moveDown}
                          >
                            <span className="material-symbols-outlined text-[16px] leading-none">
                              arrow_downward
                            </span>
                          </button>
                        </div>
                      )}

                      {onUpdateShelf && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            haptic.lightImpact();
                            setEditingColorShelfId(editingColorShelfId === shelf.id ? null : shelf.id);
                          }}
                          className={`p-1.5 rounded-lg transition-colors ${editingColorShelfId === shelf.id ? 'text-[#C9963F] bg-[#262119]' : 'text-[#A79C8C] hover:text-[#C9963F] hover:bg-[#262119]'}`}
                          title={t.shelves.changeColor}
                        >
                          <span className="material-symbols-outlined text-[20px]">palette</span>
                        </button>
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          haptic.lightImpact();
                          onShareShelf(shelf);
                        }}
                        className="text-[#A79C8C] hover:text-[#C9963F] p-1.5 rounded-lg hover:bg-[#262119] transition-colors"
                        title={t.shelves.exportCard}
                      >
                        <span className="material-symbols-outlined text-[20px]">share</span>
                      </button>

                      {onDeleteShelf && (
                        pendingDeleteShelfId === shelf.id ? (
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                haptic.heavyImpact();
                                onDeleteShelf(shelf.id);
                                setPendingDeleteShelfId(null);
                              }}
                              className="px-2 py-1 bg-[#A9503F] text-white rounded text-[10px] font-mono-ibm font-bold uppercase"
                            >
                              {t.common.delete}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setPendingDeleteShelfId(null);
                              }}
                              className="px-1.5 text-[#A79C8C] text-[10px] font-mono-ibm"
                            >
                              {t.common.cancel}
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              haptic.lightImpact();
                              setPendingDeleteShelfId(shelf.id);
                            }}
                            className="text-[#A79C8C] hover:text-[#FF6B6B] p-1.5 rounded-lg hover:bg-[#262119] transition-colors"
                            title={shelfBooks.length > 0 ? t.shelves.deleteWithBooks(shelfBooks.length) : t.shelves.deleteEmpty}
                          >
                            <span className="material-symbols-outlined text-[20px]">delete</span>
                          </button>
                        )
                      )}
                    </div>
                  </div>

                  <AnimatePresence>
                    {editingColorShelfId === shelf.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                        animate={{ opacity: 1, height: 'auto', marginBottom: 12 }}
                        exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                        onClick={(e) => e.stopPropagation()}
                        className="overflow-hidden"
                      >
                        <div className="flex flex-col gap-2 p-3 bg-[#12100E] rounded-lg border border-[#3A332A]">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-[#A79C8C] font-mono-ibm uppercase tracking-wider min-w-[50px]">
                              {t.shelves.color}
                            </span>
                            <div className="flex flex-wrap items-center gap-2">
                              {SHELF_COLORS.map((c) => (
                                <button
                                  key={c}
                                  type="button"
                                  onClick={() => {
                                    haptic.selectionClick();
                                    onUpdateShelf?.(shelf.id, { 
                                      themeColor: c, 
                                      dominantColors: [c, c, c, c] 
                                    });
                                  }}
                                  className={`w-5 h-5 rounded-full transition-transform ${shelf.themeColor === c ? 'scale-110 ring-2 ring-offset-2 ring-offset-[#12100E] ring-[#C9963F]' : 'hover:scale-110 opacity-70 hover:opacity-100'}`}
                                  style={{ backgroundColor: c }}
                                  title={t.shelves.setColor(c)}
                                />
                              ))}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-[#A79C8C] font-mono-ibm uppercase tracking-wider min-w-[50px]">
                              {t.shelves.texture}
                            </span>
                            <div className="flex flex-wrap items-center gap-1.5">
                              {SHELF_TEXTURES.map((texture) => (
                                <button
                                  key={texture}
                                  type="button"
                                  onClick={() => {
                                    haptic.selectionClick();
                                    onUpdateShelf?.(shelf.id, { texture });
                                  }}
                                  className={`px-2 py-1 rounded text-[10px] uppercase font-mono-ibm transition-colors ${(shelf.texture || 'Solid') === texture ? 'bg-[#C9963F] text-[#12100E] font-bold' : 'bg-[#1C1916] text-[#A79C8C] border border-[#3A332A] hover:text-[#F4EFE6]'}`}
                                >
                                  {t.shelves.textures[texture]}
                                </button>
                              ))}
                            </div>
                          </div>
                          
                          <div className="flex justify-end mt-1">
                            <button
                               onClick={() => setEditingColorShelfId(null)}
                               className="text-[10px] font-mono-ibm text-[#C9963F] hover:text-[#E8B660] transition-colors"
                            >
                               {t.shelves.done}
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* ShelfStrip Signature visualization */}
                  <div className="my-4">
                    <div className="flex flex-col gap-3">
                      <div className="flex justify-between items-end">
                         <span className="text-[10px] text-[#A79C8C] font-mono-ibm uppercase tracking-wider">
                           {shelf.layout === 'coordinate' ? t.shelves.coordinateLayout : t.shelves.compactLayout}
                         </span>
                         <button
                            onClick={(e) => {
                              e.stopPropagation();
                              haptic.selectionClick();
                              const cols = shelf.gridDimensions?.cols || 6;
                              const rows = shelf.gridDimensions?.rows || Math.max(3, Math.ceil(shelfBooks.length / (shelf.gridDimensions?.cols || 6)));
                              const newCoords: Record<string, {x: number, y: number}> = {};
                              
                              const booksPerRow = Math.ceil(shelfBooks.length / rows);
                              let currentBook = 0;

                              for (let y = 1; y <= rows; y++) {
                                const booksInThisRow = Math.min(booksPerRow, shelfBooks.length - currentBook);
                                if (booksInThisRow <= 0) break;
                                
                                const step = cols / booksInThisRow;
                                for (let i = 0; i < booksInThisRow; i++) {
                                  const x = Math.max(1, Math.min(cols, Math.round((i * step) + (step / 2))));
                                  const book = shelfBooks[currentBook];
                                  if (book) {
                                    newCoords[book.id] = { x, y };
                                  }
                                  currentBook++;
                                }
                              }

                              onUpdateShelf?.(shelf.id, { 
                                layout: 'coordinate',
                                gridDimensions: { cols, rows },
                                coordinates: newCoords 
                              });
                            }}
                            className="text-[10px] font-mono-ibm text-[#C9963F] hover:text-[#E8B660] transition-colors border border-[#C9963F]/30 hover:border-[#C9963F] rounded px-2 py-1 bg-[#100E0C] flex items-center gap-1"
                         >
                           <span className="material-symbols-outlined text-[12px]">grid_view</span>
                           {t.shelves.bulkArrange}
                         </button>
                      </div>
                      <div className="relative">
                        {/* Ambient Glow */}
                        <div 
                          className="absolute inset-0 blur-[32px] opacity-20 group-hover:opacity-40 transition-opacity duration-700 pointer-events-none mix-blend-screen"
                          style={{ backgroundColor: shelf.themeColor || '#C9963F' }}
                        />
                        <div className="relative z-10">
                          {shelf.layout === 'coordinate' ? (
                            <ShelfStrip 
                              colors={colors}
                              variant="coordinate"
                              themeColor={shelf.themeColor}
                              texture={shelf.texture}
                              gridDimensions={shelf.gridDimensions || { cols: 6, rows: 3 }}
                              coordinates={shelfBooks.filter(b => shelf.coordinates?.[b.id]).map(b => ({
                                id: b.id,
                                x: shelf.coordinates![b.id].x,
                                y: shelf.coordinates![b.id].y,
                                color: b.spineColor || '#C9963F',
                                title: b.title,
                                author: b.author
                              }))}
                            />
                          ) : (
                            <ShelfStrip colors={colors} variant="compact" height={44} themeColor={shelf.themeColor} texture={shelf.texture} />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Capacity Progress Bar (Full Width) */}
                  <div className="mt-5 bg-[#12100E] rounded-xl border border-[#3A332A] p-3.5 flex flex-col gap-2.5">
                    <div className="flex justify-between items-center text-[10px] font-mono-ibm tracking-wider">
                      <span className="text-[#A79C8C] flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[14px]">align_horizontal_left</span>
                        {t.shelves.capacity(totalPages.toLocaleString(), SHELF_MAX_PAGES.toLocaleString())}
                      </span>
                      <span className={isNearCapacity ? "text-[#E57373] font-bold" : "text-[#C9963F] font-bold"}>{capacityPercentage}%</span>
                    </div>
                    <div className="h-2 w-full bg-[#1C1916] rounded-full overflow-hidden border border-[#2C251D]">
                      <div 
                        className={`h-full rounded-full transition-all duration-700 ${isNearCapacity ? 'bg-gradient-to-r from-[#8B2323] to-[#E57373]' : 'bg-gradient-to-r from-[#4A5B69] to-[#C9963F]'}`}
                        style={{ width: `${capacityPercentage}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#3A332A]/70 flex justify-between items-center text-[12px] font-mono-ibm text-[#9C8F7E]">
                  <span className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[15px] text-[#C9963F]">
                      menu_book
                    </span>
                    <span>{t.shelves.viewArchive}</span>
                  </span>
                  <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform text-[#C9963F]">
                    arrow_forward
                  </span>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};

