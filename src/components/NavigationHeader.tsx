import React, { useMemo } from 'react';
import { haptic } from '../services/haptics';
import { Book } from '../types';

interface NavigationHeaderProps {
  currentView: string;
  books?: Book[];
  onBack?: () => void;
  onOpenProfile?: () => void;
  onOpenSpikeDashboard?: () => void;
  onOpenOnboarding?: () => void;
  discardMode?: boolean;
}

export const NavigationHeader: React.FC<NavigationHeaderProps> = ({
  books = [],
  onBack,
  onOpenProfile,
  onOpenSpikeDashboard,
  onOpenOnboarding,
  discardMode = false,
}) => {
  const readerStats = useMemo(() => {
    if (books.length === 0) return null;

    const readCount = books.filter(b => b.status === 'read').length;
    
    let totalDuration = 0;
    let sessionCount = 0;
    
    // 0: Night (21-5), 1: Morning (5-12), 2: Afternoon (12-17), 3: Evening (17-21)
    const timeBuckets = {
      'Night (9p-5a)': 0,
      'Morning (5a-12p)': 0,
      'Afternoon (12p-5p)': 0,
      'Evening (5p-9p)': 0
    };

    books.forEach(b => {
      if (b.readingSessions) {
        b.readingSessions.forEach(session => {
          totalDuration += session.durationSeconds;
          sessionCount++;
          
          const hour = new Date(session.date).getHours();
          if (hour >= 5 && hour < 12) timeBuckets['Morning (5a-12p)']++;
          else if (hour >= 12 && hour < 17) timeBuckets['Afternoon (12p-5p)']++;
          else if (hour >= 17 && hour < 21) timeBuckets['Evening (5p-9p)']++;
          else timeBuckets['Night (9p-5a)']++;
        });
      }
    });

    const avgDurationSeconds = sessionCount > 0 ? totalDuration / sessionCount : 0;
    const avgMinutes = Math.round(avgDurationSeconds / 60);

    let mostActiveTime = 'N/A';
    let maxCount = -1;
    Object.entries(timeBuckets).forEach(([time, count]) => {
      if (count > maxCount && count > 0) {
        maxCount = count;
        mostActiveTime = time;
      }
    });

    return {
      readCount,
      avgMinutes,
      mostActiveTime
    };
  }, [books]);

  return (
    <header className="sticky top-0 z-40 bg-[#12100E]/95 backdrop-blur-md border-b border-[#3A332A] h-16 w-full transition-all">
      <div className="max-w-[1200px] mx-auto h-full px-4 sm:px-6 flex items-center justify-between">
        {discardMode ? (
          <button
            onClick={() => {
              haptic.lightImpact();
              if (onBack) onBack();
            }}
            className="flex items-center gap-2 text-[#C9963F] hover:opacity-80 transition-opacity font-mono-ibm text-[11px] font-semibold tracking-widest uppercase"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            <span>DISCARD SCAN</span>
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                haptic.lightImpact();
                if (onOpenOnboarding) onOpenOnboarding();
              }}
              className="text-[#A79C8C] hover:text-[#C9963F] hover:bg-[#1C1916] p-2 rounded-full transition-colors flex items-center justify-center"
              title="Guide & Onboarding"
            >
              <span className="material-symbols-outlined text-[22px]">menu_book</span>
            </button>

            <button
              onClick={() => {
                haptic.lightImpact();
                if (onOpenSpikeDashboard) onOpenSpikeDashboard();
              }}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#1C1916] hairline-border text-[#A79C8C] hover:text-[#C9963F] text-[11px] font-mono-ibm"
              title="Phase 0 Accuracy Spike Matrix"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#6E8F6A] animate-pulse" />
              <span>PHASE 0 EVAL (GO GATE)</span>
            </button>
          </div>
        )}

        {/* Center Serif Title & Reader Stats */}
        <div className="flex items-center justify-center flex-1">
          <div className="flex items-center gap-6">
            {/* Title */}
            <div className="flex items-center gap-2">
              <h1 className="font-serif-literata text-[24px] sm:text-[28px] text-[#C9963F] font-bold tracking-tight">
                Book Shelf
              </h1>
              <span className="hidden md:inline-block font-mono-ibm text-[9px] text-[#A79C8C] border border-[#3A332A] px-1.5 py-0.5 rounded tracking-widest">
                v1.0
              </span>
            </div>

            {/* Reader Profile Stats */}
            {!discardMode && readerStats && (
              <div className="hidden lg:flex items-center gap-4 border-l border-[#3A332A] pl-6 py-1">
                <div className="flex flex-col">
                  <span className="font-mono-ibm text-[9px] text-[#A79C8C] uppercase tracking-wider">Books Read</span>
                  <span className="font-sans-inter text-[13px] text-[#F4EFE6] font-semibold">{readerStats.readCount}</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-mono-ibm text-[9px] text-[#A79C8C] uppercase tracking-wider">Avg Session</span>
                  <span className="font-sans-inter text-[13px] text-[#F4EFE6] font-semibold">{readerStats.avgMinutes}m</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-mono-ibm text-[9px] text-[#A79C8C] uppercase tracking-wider">Active Time</span>
                  <span className="font-sans-inter text-[13px] text-[#F4EFE6] font-semibold">{readerStats.mostActiveTime}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              haptic.lightImpact();
              if (onOpenSpikeDashboard) onOpenSpikeDashboard();
            }}
            className="sm:hidden text-[#A79C8C] hover:text-[#C9963F] p-2 rounded-full transition-colors"
            title="Phase 0 Accuracy"
          >
            <span className="material-symbols-outlined text-[20px]">analytics</span>
          </button>

          <button
            onClick={() => {
              haptic.lightImpact();
              if (onOpenProfile) onOpenProfile();
            }}
            className="text-[#A79C8C] hover:text-[#C9963F] hover:bg-[#1C1916] p-2 rounded-full transition-colors flex items-center justify-center relative group"
            title="User Profile & Settings"
          >
            <span className="material-symbols-outlined text-[24px]">account_circle</span>
            {/* Hover Tooltip for mobile/tablets where the inline stats are hidden */}
            {!discardMode && readerStats && (
              <div className="absolute top-full right-0 mt-2 bg-[#1C1916] border border-[#3A332A] rounded-xl p-4 shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 w-48 lg:hidden flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <span className="font-mono-ibm text-[10px] text-[#A79C8C] uppercase tracking-wider">Books Read</span>
                  <span className="font-sans-inter text-[14px] text-[#F4EFE6] font-semibold">{readerStats.readCount}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-mono-ibm text-[10px] text-[#A79C8C] uppercase tracking-wider">Avg Session</span>
                  <span className="font-sans-inter text-[14px] text-[#F4EFE6] font-semibold">{readerStats.avgMinutes}m</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-mono-ibm text-[10px] text-[#A79C8C] uppercase tracking-wider">Active Time</span>
                  <span className="font-sans-inter text-[13px] text-[#F4EFE6] font-semibold text-right max-w-[80px] leading-tight">{readerStats.mostActiveTime}</span>
                </div>
              </div>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
