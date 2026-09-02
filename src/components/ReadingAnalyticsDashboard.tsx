import React, { useMemo } from 'react';
import { Book } from '../types';
import { toLocalDateKey } from '../utils/streak';
import { useI18n } from '../i18n/I18nProvider';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface ReadingAnalyticsDashboardProps {
  books: Book[];
}

export const ReadingAnalyticsDashboard: React.FC<ReadingAnalyticsDashboardProps> = ({ books }) => {
  const { t, locale } = useI18n();

  const analytics = useMemo(() => {
    let totalSeconds = 0;
    let totalPagesRead = 0;
    
    // Group sessions by actual calendar day; keying on the weekday name alone
    // would fold sessions from previous weeks into this week's chart.
    const last7Days = new Map<string, { label: string; minutes: number }>();
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      last7Days.set(toLocalDateKey(d), { label: d.toLocaleDateString(locale, { weekday: 'short' }), minutes: 0 });
    }

    const timeBuckets = { morning: 0, afternoon: 0, evening: 0, night: 0 };

    books.forEach(book => {
      const isFinished = book.status === 'read';
      const progress = book.progress || (isFinished ? 100 : 0);
      const estimatedPagesRead = Math.round((book.pageCount * progress) / 100);
      
      let bookTimeSeconds = 0;

      book.readingSessions?.forEach(session => {
        bookTimeSeconds += session.durationSeconds;
        
        // Chart data
        const sessionDate = new Date(session.date);
        const entry = last7Days.get(toLocalDateKey(sessionDate));
        if (entry) {
          entry.minutes += Math.round(session.durationSeconds / 60);
        }

        // Time of day
        const hour = sessionDate.getHours();
        if (hour >= 5 && hour < 12) timeBuckets.morning += session.durationSeconds;
        else if (hour >= 12 && hour < 17) timeBuckets.afternoon += session.durationSeconds;
        else if (hour >= 17 && hour < 21) timeBuckets.evening += session.durationSeconds;
        else timeBuckets.night += session.durationSeconds;
      });

      // Only count pages/speed for books that have actual tracked reading sessions
      if (bookTimeSeconds > 0) {
        totalSeconds += bookTimeSeconds;
        totalPagesRead += estimatedPagesRead;
      }
    });

    const chartData = Array.from(last7Days.values()).map(({ label, minutes }) => ({ day: label, minutes }));
    
    // Speed: pages per hour
    const hoursRead = totalSeconds / 3600;
    const speedPPH = hoursRead > 0 ? Math.round(totalPagesRead / hoursRead) : 0;
    const speedPPM = speedPPH > 0 ? (speedPPH / 60).toFixed(1) : '0';

    // Best time of day
    const mostActiveBucket = (Object.entries(timeBuckets) as [keyof typeof timeBuckets, number][])
      .reduce((a, b) => (a[1] > b[1] ? a : b));
    const bestTime = mostActiveBucket[1] > 0 ? t.analytics.timeBuckets[mostActiveBucket[0]] : t.analytics.notEnoughData;

    return {
      totalHours: hoursRead.toFixed(1),
      speedPPH,
      speedPPM,
      bestTime,
      chartData
    };
  }, [books, locale, t]);

  return (
    <div className="bg-[#1C1916] border border-[#3A332A] rounded-2xl p-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
        <span className="material-symbols-outlined text-[120px]" aria-hidden="true">speed</span>
      </div>

      <div className="relative z-10 space-y-6">
        <div>
          <h3 className="font-serif-literata text-[#F4EFE6] font-bold text-[18px]">{t.analytics.title}</h3>
          <p className="font-sans-inter text-[#A79C8C] text-[13px]">{t.analytics.subtitle}</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[#12100E] p-4 rounded-xl border border-[#3A332A]">
            <p className="font-mono-ibm text-[#A79C8C] text-[10px] uppercase tracking-wider mb-1">{t.analytics.avgSpeed}</p>
            <p className="font-sans-inter text-[#F4EFE6] text-[24px] font-bold">{analytics.speedPPH} <span className="text-[12px] text-[#A79C8C] font-normal">{t.analytics.pagesPerHour}</span></p>
            <p className="text-[11px] text-[#C9963F] mt-1">{t.analytics.pagesPerMinute(analytics.speedPPM)}</p>
          </div>
          <div className="bg-[#12100E] p-4 rounded-xl border border-[#3A332A]">
            <p className="font-mono-ibm text-[#A79C8C] text-[10px] uppercase tracking-wider mb-1">{t.analytics.peakTime}</p>
            <p className="font-sans-inter text-[#F4EFE6] text-[18px] font-bold truncate">{analytics.bestTime}</p>
            <p className="text-[11px] text-[#C9963F] mt-1">{t.analytics.mostFocused}</p>
          </div>
          <div className="bg-[#12100E] p-4 rounded-xl border border-[#3A332A] md:col-span-2">
            <p className="font-mono-ibm text-[#A79C8C] text-[10px] uppercase tracking-wider mb-1">{t.analytics.weekActivity}</p>
            <div className="h-[60px] w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.chartData}>
                  <defs>
                    <linearGradient id="colorMins" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#C9963F" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#C9963F" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1C1916', borderColor: '#3A332A', borderRadius: '8px', fontSize: '12px' }}
                    itemStyle={{ color: '#F4EFE6' }}
                    labelStyle={{ color: '#A79C8C', marginBottom: '4px' }}
                  />
                  <XAxis dataKey="day" hide />
                  <YAxis hide />
                  <Area type="monotone" dataKey="minutes" stroke="#C9963F" fillOpacity={1} fill="url(#colorMins)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
