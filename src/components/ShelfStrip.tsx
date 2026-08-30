import React from 'react';
import { motion } from 'motion/react';
import { haptic } from '../services/haptics';

interface ShelfStripProps {
  colors: string[];
  height?: number;
  variant?: 'compact' | 'hero' | 'empty';
  onBarClick?: (index: number) => void;
  className?: string;
}

export const ShelfStrip: React.FC<ShelfStripProps> = ({
  colors,
  height,
  variant = 'compact',
  onBarClick,
  className = '',
}) => {
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

  const defaultHeight = variant === 'hero' ? 96 : 40;
  const renderHeight = height || defaultHeight;

  // Use a balanced fallback palette if colors are empty
  const activeColors =
    colors.length > 0
      ? colors
      : ['#2C251D', '#8B2323', '#1E262B', '#C9963F', '#3B4238', '#1A1816', '#4A3224', '#D4CDA8', '#222222', '#C9963F', '#1C1916', '#521A1A', '#2A2B2D'];

  return (
    <div
      className={`w-full flex rounded-lg overflow-hidden border border-[#3A332A] bg-[#100E0C] relative group ${className}`}
      style={{ height: renderHeight }}
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
            title={`Spine volume #${idx + 1}`}
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
