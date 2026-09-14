import React, { useMemo } from 'react';
import { Book } from '../types';
import { calculateReadingStreak, collectReadingDays, longestReadingStreak, toLocalDateKey } from '../utils/streak';
import { useI18n } from '../i18n/I18nProvider';

interface ReadingCalendarWidgetProps {
  books: Book[];
  reminderEnabled?: boolean;
  onToggleReminder?: (enabled: boolean) => void;
}

export const ReadingCalendarWidget: React.FC<ReadingCalendarWidgetProps> = ({ books, reminderEnabled = false, onToggleReminder }) => {
  const { t, locale } = useI18n();

  const { cells, currentStreak, maxStreak, activeDays } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const msPerDay = 1000 * 60 * 60 * 24;

    // How long each day was read for, which is what shades a cell. Whether a
    // day counts as read at all is the whole app's definition, in `streak`:
    // this widget used to count sessions only, so a reader who finishes books
    // without ever running the timer was shown a streak of zero while the
    // milestone toasts congratulated them on the same streak.
    const secondsPerDay: Record<string, number> = {};
    books.forEach((book) => {
      book.readingSessions?.forEach((session) => {
        const key = toLocalDateKey(session.date);
        secondsPerDay[key] = (secondsPerDay[key] || 0) + session.durationSeconds;
      });
    });

    const readingDays = collectReadingDays(books);

    // 20 weeks of history on desktop, scrollable on mobile.
    const WEEKS_TO_SHOW = 20;
    const totalCells = WEEKS_TO_SHOW * 7 + today.getDay() + 1;

    const generateCells = [];
    for (let i = totalCells - 1; i >= 0; i--) {
      const date = new Date(today.getTime() - i * msPerDay);
      const key = toLocalDateKey(date);
      generateCells.push({ date, key, duration: secondsPerDay[key] || 0, isReadingDay: readingDays.has(key) });
    }

    return {
      cells: generateCells,
      currentStreak: calculateReadingStreak(books),
      maxStreak: longestReadingStreak(books),
      activeDays: readingDays.size,
    };
  }, [books]);

  const getColor = (durationSeconds: number, isReadingDay: boolean) => {
    if (durationSeconds === 0) return isReadingDay ? 'bg-[#5c492a]' : 'bg-[#262119] opacity-40';
    if (durationSeconds < 900) return 'bg-[#5c492a]'; // < 15 min
    if (durationSeconds < 1800) return 'bg-[#917135]'; // < 30 min
    if (durationSeconds < 3600) return 'bg-[#ba903c]'; // < 60 min
    return 'bg-[#C9963F] shadow-[0_0_8px_rgba(201,150,63,0.3)]'; // >= 60 min
  };

  const getLabel = (durationSeconds: number, isReadingDay: boolean) => {
    if (durationSeconds === 0) return isReadingDay ? t.calendar.readNoTimer : t.calendar.noReading;
    return t.calendar.minutes(Math.round(durationSeconds / 60));
  };

  return (
    <section className="bg-[#1C1916] rounded-2xl hairline-border p-5 sm:p-6 space-y-5">
      {/* Header & Stats */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px] text-[#C9963F]" aria-hidden="true">calendar_month</span>
          <h3 className="font-serif-literata text-[20px] sm:text-[22px] text-[#F4EFE6] font-semibold flex items-center gap-3">
            {t.calendar.title}
            {onToggleReminder && (
              <button
                onClick={() => onToggleReminder(!reminderEnabled)}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-full border transition-colors ${
                  reminderEnabled 
                    ? 'border-[#C9963F] bg-[#C9963F]/10 text-[#C9963F]' 
                    : 'border-[#3A332A] bg-transparent text-[#A79C8C] hover:text-[#F4EFE6] hover:border-[#4F4537]'
                }`}
                title={reminderEnabled ? t.calendar.reminderActiveTooltip : t.calendar.reminderEnableTooltip}
              >
                <span className="material-symbols-outlined text-[12px]" aria-hidden="true">{reminderEnabled ? 'notifications_active' : 'notifications_off'}</span>
                <span className="text-[9px] font-mono-ibm uppercase tracking-wider">{reminderEnabled ? t.calendar.reminderOn : t.calendar.reminderOff}</span>
              </button>
            )}
          </h3>
        </div>
        <div className="flex gap-4 sm:gap-6 text-left sm:text-right w-full sm:w-auto overflow-hidden">
          <div>
            <p className="font-mono-ibm text-[10px] text-[#A79C8C] uppercase tracking-wider mb-0.5">{t.calendar.currentStreak}</p>
            <p className="font-sans-inter text-[18px] text-[#F4EFE6] font-bold leading-none">
              {currentStreak} <span className="text-[12px] font-normal text-[#A79C8C]">{t.calendar.days}</span>
            </p>
          </div>
          <div className="w-[1px] h-8 bg-[#3A332A]" />
          <div>
            <p className="font-mono-ibm text-[10px] text-[#A79C8C] uppercase tracking-wider mb-0.5">{t.calendar.maxStreak}</p>
            <p className="font-sans-inter text-[18px] text-[#F4EFE6] font-bold leading-none">
              {maxStreak} <span className="text-[12px] font-normal text-[#A79C8C]">{t.calendar.days}</span>
            </p>
          </div>
          <div className="w-[1px] h-8 bg-[#3A332A]" />
          <div>
            <p className="font-mono-ibm text-[10px] text-[#A79C8C] uppercase tracking-wider mb-0.5">{t.calendar.totalDays}</p>
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
              className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-[3px] sm:rounded-sm transition-colors cursor-default hover:border hover:border-[#F4EFE6]/30 ${getColor(cell.duration, cell.isReadingDay)}`}
              title={t.calendar.cellTooltip(
                getLabel(cell.duration, cell.isReadingDay),
                cell.date.toLocaleDateString(locale, { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })
              )}
            />
          ))}
        </div>
      </div>
    </section>
  );
};
