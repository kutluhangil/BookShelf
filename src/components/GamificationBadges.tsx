import React, { useMemo } from 'react';
import { Book } from '../types';

interface GamificationBadgesProps {
  books: Book[];
}

export const GamificationBadges: React.FC<GamificationBadgesProps> = ({ books }) => {
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

    if (currentStreak >= 7) {
      earned.push({ icon: 'local_fire_department', title: '7-Day Streak', desc: 'Read every day for a week', color: '#FF6B6B' });
    } else {
      earned.push({ icon: 'local_fire_department', title: '7-Day Streak', desc: 'Read every day for a week', color: '#3A332A', locked: true });
    }

    // Explorer Logic (Genres)
    const genres = new Set<string>();
    books.forEach(b => {
      b.tags?.forEach(t => genres.add(t.toLowerCase()));
    });
    
    if (genres.size >= 5) {
      earned.push({ icon: 'explore', title: 'Explorer', desc: 'Read 5 different genres', color: '#3498DB' });
    } else {
      earned.push({ icon: 'explore', title: 'Explorer', desc: 'Read 5 different genres', color: '#3A332A', locked: true });
    }

    // Night Owl
    let nightSessions = 0;
    books.forEach(b => {
      b.readingSessions?.forEach(s => {
        const h = new Date(s.date).getHours();
        if (h >= 22 || h < 4) nightSessions++;
      });
    });

    if (nightSessions >= 5) {
      earned.push({ icon: 'dark_mode', title: 'Night Owl', desc: '5 late night reading sessions', color: '#9B59B6' });
    } else {
      earned.push({ icon: 'dark_mode', title: 'Night Owl', desc: '5 late night reading sessions', color: '#3A332A', locked: true });
    }

    return earned;
  }, [books]);

  return (
    <div className="bg-[#1C1916] border border-[#3A332A] rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-serif-literata text-[#F4EFE6] font-bold text-[18px]">Achievements</h3>
          <p className="font-sans-inter text-[#A79C8C] text-[13px]">Your reader badges</p>
        </div>
        <span className="material-symbols-outlined text-[#C9963F] text-[24px]">workspace_premium</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {badges.map((badge, idx) => (
          <div key={idx} className={`p-4 rounded-xl border flex flex-col items-center text-center transition-all ${badge.locked ? 'bg-[#12100E] border-[#2C251D] opacity-60' : 'bg-[#151311] border-[#3A332A] shadow-md hover:border-[#C9963F]'}`}>
            <div 
              className="w-12 h-12 rounded-full flex items-center justify-center mb-3 shadow-inner"
              style={{ backgroundColor: badge.locked ? '#1C1916' : `${badge.color}20`, color: badge.locked ? '#5A5042' : badge.color }}
            >
              <span className="material-symbols-outlined text-[24px]">{badge.icon}</span>
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
