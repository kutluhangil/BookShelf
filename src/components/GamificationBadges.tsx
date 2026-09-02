import React, { useMemo } from 'react';
import { Book } from '../types';
import { useT } from '../i18n/I18nProvider';

interface GamificationBadgesProps {
  books: Book[];
}

export const GamificationBadges: React.FC<GamificationBadgesProps> = ({ books }) => {
  const t = useT();

  const badges = useMemo(() => {
    const earned = [];
    
    // Streak logic
    let currentStreak = 0;
    // Basic logic for demonstration: check consecutive days read
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const readDates = new Set<string>();
    books.forEach(b => {
      b.readingSessions?.forEach(s => {
        readDates.add(new Date(s.date).toDateString());
      });
      if (b.readAt) readDates.add(new Date(b.readAt).toDateString());
    });

    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      if (readDates.has(d.toDateString())) {
        currentStreak++;
      } else if (i > 0) {
        break;
      }
    }

    const streakBadge = { icon: 'local_fire_department', ...t.badges.streak };
    earned.push(
      currentStreak >= 7
        ? { ...streakBadge, color: '#FF6B6B' }
        : { ...streakBadge, color: '#3A332A', locked: true }
    );

    // Explorer Logic (Genres)
    const genres = new Set<string>();
    books.forEach(b => {
      b.tags?.forEach(t => genres.add(t.toLowerCase()));
    });
    
    const explorerBadge = { icon: 'explore', ...t.badges.explorer };
    earned.push(
      genres.size >= 5
        ? { ...explorerBadge, color: '#3498DB' }
        : { ...explorerBadge, color: '#3A332A', locked: true }
    );

    // Night Owl
    let nightSessions = 0;
    books.forEach(b => {
      b.readingSessions?.forEach(s => {
        const h = new Date(s.date).getHours();
        if (h >= 22 || h < 4) nightSessions++;
      });
    });

    const nightOwlBadge = { icon: 'dark_mode', ...t.badges.nightOwl };
    earned.push(
      nightSessions >= 5
        ? { ...nightOwlBadge, color: '#9B59B6' }
        : { ...nightOwlBadge, color: '#3A332A', locked: true }
    );

    return earned;
  }, [books, t]);

  return (
    <div className="bg-[#1C1916] border border-[#3A332A] rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-serif-literata text-[#F4EFE6] font-bold text-[18px]">{t.badges.title}</h3>
          <p className="font-sans-inter text-[#A79C8C] text-[13px]">{t.badges.subtitle}</p>
        </div>
        <span className="material-symbols-outlined text-[#C9963F] text-[24px]" aria-hidden="true">workspace_premium</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {badges.map((badge, idx) => (
          <div key={idx} className={`p-4 rounded-xl border flex flex-col items-center text-center transition-all ${badge.locked ? 'bg-[#12100E] border-[#2C251D] opacity-60' : 'bg-[#151311] border-[#3A332A] shadow-md hover:border-[#C9963F]'}`}>
            <div 
              className="w-12 h-12 rounded-full flex items-center justify-center mb-3 shadow-inner"
              style={{ backgroundColor: badge.locked ? '#1C1916' : `${badge.color}20`, color: badge.locked ? '#5A5042' : badge.color }}
            >
              <span className="material-symbols-outlined text-[24px]" aria-hidden="true">{badge.icon}</span>
            </div>
            <h4 className={`font-mono-ibm text-[12px] font-bold uppercase tracking-wider ${badge.locked ? 'text-[#5A5042]' : 'text-[#F4EFE6]'}`}>
              {badge.title}
            </h4>
            <p className="font-sans-inter text-[11px] text-[#A79C8C] mt-1">{badge.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
