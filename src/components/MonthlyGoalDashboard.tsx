import React, { useMemo, useState } from 'react';
import { Book } from '../types';
import { useT } from '../i18n/I18nProvider';

interface MonthlyGoalDashboardProps {
  books: Book[];
  monthlyGoal: number;
  onUpdateGoal: (newGoal: number) => void;
}

export const MonthlyGoalDashboard: React.FC<MonthlyGoalDashboardProps> = ({
  books,
  monthlyGoal,
  onUpdateGoal,
}) => {
  const t = useT();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(monthlyGoal.toString());

  const currentMonthCount = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    return books.filter((b) => {
      if (b.status !== 'read' || !b.readAt) return false;
      const readDate = new Date(b.readAt);
      return (
        readDate.getFullYear() === currentYear &&
        readDate.getMonth() === currentMonth
      );
    }).length;
  }, [books]);

  const progressPercent = Math.min(
    100,
    monthlyGoal > 0 ? Math.round((currentMonthCount / monthlyGoal) * 100) : 0
  );

  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  const handleSave = () => {
    const val = parseInt(editValue, 10);
    if (!isNaN(val) && val > 0) {
      onUpdateGoal(val);
    } else {
      setEditValue(monthlyGoal.toString());
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') {
      setEditValue(monthlyGoal.toString());
      setIsEditing(false);
    }
  };

  return (
    <section className="bg-[#1C1916] rounded-2xl hairline-border p-5 sm:p-6 flex items-center justify-between">
      <div className="flex-1">
        <h3 className="font-serif-literata text-[20px] sm:text-[22px] text-[#F4EFE6] font-semibold">
          {t.monthlyGoal.title}
        </h3>
        <p className="font-mono-ibm text-[11px] text-[#A79C8C] mt-0.5 mb-4">
          {t.monthlyGoal.subtitle}
        </p>

        {isEditing ? (
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="1"
              max="999"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleSave}
              onKeyDown={handleKeyDown}
              autoFocus
              className="bg-[#262119] text-[#F4EFE6] border border-[#C9963F] rounded px-2 py-1 w-16 text-center font-mono-ibm focus:outline-none"
            />
            <span className="text-[#A79C8C] text-[12px] font-mono-ibm uppercase">{t.common.books}</span>
          </div>
        ) : (
          <div
            onClick={() => setIsEditing(true)}
            className="group cursor-pointer inline-flex flex-col items-start"
            title={t.monthlyGoal.editHint}
          >
            <div className="flex items-baseline gap-1.5">
              <span className="font-serif-literata text-[24px] sm:text-[28px] text-[#C9963F] font-bold leading-none">
                {currentMonthCount}
              </span>
              <span className="text-[#A79C8C] font-mono-ibm text-[14px]">
                / {monthlyGoal}
              </span>
            </div>
            <div className="text-[#5A5044] text-[10px] font-mono-ibm uppercase mt-1 group-hover:text-[#C9963F] transition-colors flex items-center gap-1">
              <span>{t.monthlyGoal.editGoal}</span>
              <span className="material-symbols-outlined text-[12px]">edit</span>
            </div>
          </div>
        )}
      </div>

      {/* Circular Progress */}
      <div className="relative flex items-center justify-center w-24 h-24 shrink-0">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="transparent"
            stroke="#262119"
            strokeWidth="8"
          />
          {/* Foreground progress circle */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="transparent"
            stroke={progressPercent === 100 ? '#6E8F6A' : '#C9963F'}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center flex-col">
          <span
            className={`font-mono-ibm font-bold text-[16px] ${
              progressPercent === 100 ? 'text-[#85E07D]' : 'text-[#F4EFE6]'
            }`}
          >
            {progressPercent}%
          </span>
        </div>
      </div>
    </section>
  );
};
