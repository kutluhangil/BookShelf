import React, { useMemo } from 'react';
import { Book } from '../types';

interface ReadingCalendarWidgetProps {
  books: Book[];
}

export const ReadingCalendarWidget: React.FC<ReadingCalendarWidgetProps> = ({ books }) => {
  const { activityMap, cells, currentStreak, maxStreak, activeDays } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const msPerDay = 1000 * 60 * 60 * 24;

    // 1. Build Activity Map
    const map: Record<string, number> = {};
    books.forEach(b => {
      b.readingSessions?.forEach(s => {
        const d = new Date(s.date);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        map[key] = (map[key] || 0) + s.durationSeconds;
      });
    });

    // 2. Calculate Current Streak
    let cStreak = 0;
    let checkDate = new Date(today.getTime());
    let checkKey = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;
    
    if (map[checkKey] > 0) {
      // Read today
      while (map[checkKey] > 0) {
        cStreak++;
        checkDate = new Date(checkDate.getTime() - msPerDay);
        checkKey = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;
      }
    } else {
      // Check yesterday
      checkDate = new Date(checkDate.getTime() - msPerDay);
      checkKey = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;
      while (map[checkKey] > 0) {
        cStreak++;
        checkDate = new Date(checkDate.getTime() - msPerDay);
        checkKey = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;
      }
    }

    // 3. Calculate Max Streak & Total Active Days (looking back 2 years max to keep it bound)
    let mStreak = 0;
    let currentRun = 0;
    let activeDaysCount = 0;
    for (let i = 365 * 2; i >= 0; i--) {
      const d = new Date(today.getTime() - i * msPerDay);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (map[key] > 0) {
        currentRun++;
        activeDaysCount++;
        if (currentRun > mStreak) mStreak = currentRun;
      } else {
        currentRun = 0;
      }
    }

    // 4. Generate Display Cells (20 weeks to show a good history on desktop, scrollable on mobile)
    const WEEKS_TO_SHOW = 20;
    const dayOfWeek = today.getDay();
    const totalCells = (WEEKS_TO_SHOW * 7) + dayOfWeek + 1;
    
    const generateCells = [];
    for (let i = totalCells - 1; i >= 0; i--) {
      const d = new Date(today.getTime() - i * msPerDay);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const duration = map[key] || 0;
      generateCells.push({ date: d, duration, key });
    }

    return { activityMap: map, cells: generateCells, currentStreak: cStreak, maxStreak: mStreak, activeDays: activeDaysCount };
  }, [books]);

  const getColor = (durationSeconds: number) => {
    if (durationSeconds === 0) return 'bg-[#262119] opacity-40';
    if (durationSeconds < 900) return 'bg-[#5c492a]'; // < 15 min
    if (durationSeconds < 1800) return 'bg-[#917135]'; // < 30 min
    if (durationSeconds < 3600) return 'bg-[#ba903c]'; // < 60 min
    return 'bg-[#C9963F] shadow-[0_0_8px_rgba(201,150,63,0.3)]'; // >= 60 min
  };

  const getLabel = (durationSeconds: number) => {
    if (durationSeconds === 0) return 'No reading';
    const m = Math.round(durationSeconds / 60);
    return `${m} min${m !== 1 ? 's' : ''}`;
  };

  return (
    <section className="bg-[#1C1916] rounded-2xl hairline-border p-5 sm:p-6 space-y-5">
      {/* Header & Stats */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px] text-[#C9963F]">calendar_month</span>
          <h3 className="font-serif-literata text-[20px] sm:text-[22px] text-[#F4EFE6] font-semibold">
            Reading Habit
          </h3>
        </div>
        <div className="flex gap-4 sm:gap-6 text-left sm:text-right w-full sm:w-auto overflow-hidden">
          <div>
            <p className="font-mono-ibm text-[10px] text-[#A79C8C] uppercase tracking-wider mb-0.5">Current Streak</p>
            <p className="font-sans-inter text-[18px] text-[#F4EFE6] font-bold leading-none">
              {currentStreak} <span className="text-[12px] font-normal text-[#A79C8C]">Days</span>
            </p>
          </div>
          <div className="w-[1px] h-8 bg-[#3A332A]" />
          <div>
            <p className="font-mono-ibm text-[10px] text-[#A79C8C] uppercase tracking-wider mb-0.5">Max Streak</p>
            <p className="font-sans-inter text-[18px] text-[#F4EFE6] font-bold leading-none">
              {maxStreak} <span className="text-[12px] font-normal text-[#A79C8C]">Days</span>
            </p>
          </div>
          <div className="w-[1px] h-8 bg-[#3A332A]" />
          <div>
            <p className="font-mono-ibm text-[10px] text-[#A79C8C] uppercase tracking-wider mb-0.5">Total Days</p>
            <p className="font-sans-inter text-[18px] text-[#F4EFE6] font-bold leading-none">
              {activeDays}
            </p>
          </div>
        </div>
      </div>
      
      {/* Calendar Grid */}
      <div className="overflow-x-auto pb-2 scrollbar-thin flex sm:justify-end">
        <div 
          className="grid gap-[3px]" 
          style={{ 
            gridTemplateRows: 'repeat(7, minmax(0, 1fr))', 
            gridAutoFlow: 'column',
            gridAutoColumns: 'max-content'
          }}
        >
          {cells.map((cell) => (
            <div 
              key={cell.key}
              className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-[3px] sm:rounded-sm transition-colors cursor-default hover:border hover:border-[#F4EFE6]/30 ${getColor(cell.duration)}`}
              title={`${getLabel(cell.duration)} on ${cell.date.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
};
