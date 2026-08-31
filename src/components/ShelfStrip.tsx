import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { haptic } from '../services/haptics';
import { useT } from '../i18n/I18nProvider';

interface ShelfStripProps {
  colors: string[];
  height?: number;
  variant?: 'compact' | 'hero' | 'empty' | 'coordinate';
  onBarClick?: (index: number) => void;
  className?: string;
  coordinates?: { id: string; x: number; y: number; color: string; title?: string; author?: string }[];
  gridDimensions?: { cols: number; rows: number };
  themeColor?: string;
  texture?: string;
}

const getShelfStripBackgroundStyle = (themeColor?: string, texture?: string): React.CSSProperties => {
  const baseBg = '#100E0C';
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

export const ShelfStrip: React.FC<ShelfStripProps> = ({
  colors,
  height,
  variant = 'compact',
  onBarClick,
  className = '',
  coordinates = [],
  gridDimensions = { cols: 4, rows: 3 },
  themeColor,
  texture,
}) => {
  const t = useT();

  if (variant === 'empty') {
    return (
      <div
        className={`w-full flex items-end justify-center gap-1.5 opacity-25 max-w-md mx-auto border-b border-[#3A332A] pb-[1px] ${className}`}
        style={{ height: height || 96 }}
      >
        {[16, 24, 20, 28, 14, 22, 26, 18, 24, 20].map((h, i) => (
          <div
            key={i}
            className="border border-[#4F4537] rounded-t-sm transition-all hover:border-[#C9963F]"
            style={{
              width: `${(i % 3 === 0 ? 20 : i % 2 === 0 ? 14 : 26)}px`,
              height: `${h * 2.8}px`,
            }}
          />
        ))}
      </div>
    );
  }

  if (variant === 'coordinate') {
    const { cols, rows } = gridDimensions;
    const gridCells = [];
    for (let y = 1; y <= rows; y++) {
      for (let x = 1; x <= cols; x++) {
        const colLetter = String.fromCharCode(64 + x);
        const coordLabel = `${colLetter}${y}`;
        const match = coordinates.find((item) => item.x === x && item.y === y);
        gridCells.push({ coord: coordLabel, match });
      }
    }

    return (
      <div className={`w-full flex flex-col gap-1.5 ${className}`}>
        <div
          className="grid gap-1.5 w-full p-2 rounded-lg border border-[#3A332A]"
          style={{ ...getShelfStripBackgroundStyle(themeColor, texture), gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        >
          <AnimatePresence>
            {gridCells.map((cell, idx) => (
              <div
                key={cell.coord}
                onClick={() => {
                  haptic.lightImpact();
                }}
                className="relative aspect-square rounded-md border border-[#3A332A]/50 flex items-center justify-center overflow-hidden hover:border-[#C9963F] cursor-pointer transition-colors bg-transparent"
                title={t.shelfStrip.bin(cell.coord)}
              >
                {/* Empty cell text layer (always rendered) */}
                <span className="text-[10px] sm:text-[11px] font-mono-ibm font-semibold text-[#A79C8C]">
                  {cell.coord}
                </span>

                {/* Animated book element */}
                {cell.match && (
                  <motion.div
                    layout
                    layoutId={`book-${cell.match.id}`}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                    className="absolute inset-0 z-10 flex items-center justify-center group/book"
                    style={{ backgroundColor: cell.match.color }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-tr from-black/20 to-transparent pointer-events-none" />
                    <span className="text-[10px] sm:text-[11px] font-mono-ibm font-semibold text-black/60 mix-blend-overlay z-20">
                      {cell.coord}
                    </span>
                    
                    {(cell.match.title || cell.match.author) && (
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-[#100E0C] text-[#F4EFE6] rounded-lg border border-[#3A332A] whitespace-nowrap opacity-0 group-hover/book:opacity-100 pointer-events-none transition-opacity duration-200 z-50 shadow-[0_8px_16px_rgba(0,0,0,0.5)] flex flex-col items-center">
                        {cell.match.title && (
                          <span className="text-[11px] font-sans-inter font-medium leading-tight">
                            {cell.match.title}
                          </span>
                        )}
                        {cell.match.author && (
                          <span className="text-[9px] font-mono-ibm text-[#A79C8C] mt-0.5 uppercase tracking-wider">
                            {cell.match.author}
                          </span>
                        )}
                        <div className="absolute -bottom-[5px] left-1/2 -translate-x-1/2 w-2 h-2 bg-[#100E0C] border-b border-r border-[#3A332A] rotate-45" />
                      </div>
                    )}
                  </motion.div>
                )}
              </div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  const defaultHeight = variant === 'hero' ? 96 : 40;
  const renderHeight = height || defaultHeight;

  // Use a balanced fallback palette if colors are empty
  const activeColors =
    colors.length > 0
      ? colors
      : ['#2C251D', '#8B2323', '#1E262B', '#C9963F', '#3B4238', '#1A1816', '#4A3224', '#D4CDA8', '#222222', '#C9963F', '#1C1916', '#521A1A', '#2A2B2D'];

  return (
    <div
      className={`w-full flex rounded-lg overflow-hidden border border-[#3A332A] relative group ${className}`}
      style={{ ...getShelfStripBackgroundStyle(themeColor, texture), height: renderHeight }}
    >
      {/* Decorative ambient sheen */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[rgba(255,255,255,0.03)] to-transparent pointer-events-none z-10" />

      {activeColors.map((color, idx) => {
        // Pseudo-random varying width ratios for physical spine feel
        const flexWeights = [1, 1.4, 0.8, 1.2, 1.6, 0.9, 1.1, 0.7, 1.3, 1, 1.2];
        const flexVal = flexWeights[idx % flexWeights.length];

        return (
          <motion.div
            key={idx}
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{
              duration: 0.26,
              delay: idx * 0.012,
              ease: [0.33, 1, 0.68, 1],
            }}
            onClick={() => {
              haptic.selectionClick();
              if (onBarClick) onBarClick(idx);
            }}
            className="h-full border-r border-[#3A332A]/80 cursor-pointer origin-bottom transition-all duration-200 hover:brightness-125 hover:scale-y-105 relative"
            style={{
              backgroundColor: color,
              flex: flexVal,
            }}
            title={t.shelfStrip.spineVolume(idx + 1)}
          >
            {/* Subtle inner spine highlight */}
            <div className="absolute inset-x-0 top-0 h-1 bg-white/10" />
            <div className="absolute inset-x-0 bottom-0 h-1 bg-black/30" />
          </motion.div>
        );
      })}
    </div>
  );
};
