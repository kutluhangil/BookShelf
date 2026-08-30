import React, { useMemo } from 'react';
import { Book } from '../types';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface ReadingAnalyticsDashboardProps {
  books: Book[];
}

export const ReadingAnalyticsDashboard: React.FC<ReadingAnalyticsDashboardProps> = ({ books }) => {
  const analytics = useMemo(() => {
    let totalSeconds = 0;
    let totalPagesRead = 0;
    
    // Group sessions by day for the chart
    const last7Days: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      last7Days[d.toLocaleDateString('en-US', { weekday: 'short' })] = 0;
    }

    const timeBuckets = { Morning: 0, Afternoon: 0, Evening: 0, Night: 0 };

    books.forEach(book => {
      const isFinished = book.status === 'read';
      const progress = book.progress || (isFinished ? 100 : 0);
      const estimatedPagesRead = Math.round((book.pageCount * progress) / 100);
      
      let bookTimeSeconds = 0;

      book.readingSessions?.forEach(session => {
        bookTimeSeconds += session.durationSeconds;
        
        // Chart data
        const sessionDate = new Date(session.date);
        const dayKey = sessionDate.toLocaleDateString('en-US', { weekday: 'short' });
        if (last7Days[dayKey] !== undefined) {
          last7Days[dayKey] += Math.round(session.durationSeconds / 60);
        }

        // Time of day
        const hour = sessionDate.getHours();
        if (hour >= 5 && hour < 12) timeBuckets.Morning += session.durationSeconds;
        else if (hour >= 12 && hour < 17) timeBuckets.Afternoon += session.durationSeconds;
        else if (hour >= 17 && hour < 21) timeBuckets.Evening += session.durationSeconds;
        else timeBuckets.Night += session.durationSeconds;
      });

      // Only count pages/speed for books that have actual tracked reading sessions
      if (bookTimeSeconds > 0) {
        totalSeconds += bookTimeSeconds;
        totalPagesRead += estimatedPagesRead;
      }
    });

    const chartData = Object.entries(last7Days).map(([day, minutes]) => ({ day, minutes }));
    
    // Speed: pages per hour
    const hoursRead = totalSeconds / 3600;
    const speedPPH = hoursRead > 0 ? Math.round(totalPagesRead / hoursRead) : 0;
    const speedPPM = speedPPH > 0 ? (speedPPH / 60).toFixed(1) : '0';

    // Best time of day
    const mostActiveBucket = Object.entries(timeBuckets).reduce((a, b) => a[1] > b[1] ? a : b);
    const bestTime = mostActiveBucket[1] > 0 ? mostActiveBucket[0] : 'Not enough data';

    return {
      totalHours: hoursRead.toFixed(1),
      speedPPH,
      speedPPM,
      bestTime,
      chartData
    };
  }, [books]);

  return (
    <div className="bg-[#1C1916] border border-[#3A332A] rounded-2xl p-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
        <span className="material-symbols-outlined text-[120px]">speed</span>
      </div>

      <div className="relative z-10 space-y-6">
        <div>
          <h3 className="font-serif-literata text-[#F4EFE6] font-bold text-[18px]">Deep Analytics</h3>
          <p className="font-sans-inter text-[#A79C8C] text-[13px]">Your reading speed and habits</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[#12100E] p-4 rounded-xl border border-[#3A332A]">
            <p className="font-mono-ibm text-[#A79C8C] text-[10px] uppercase tracking-wider mb-1">Avg Speed</p>
            <p className="font-sans-inter text-[#F4EFE6] text-[24px] font-bold">{analytics.speedPPH} <span className="text-[12px] text-[#A79C8C] font-normal">pg/hr</span></p>
            <p className="text-[11px] text-[#C9963F] mt-1">~{analytics.speedPPM} pages/min</p>
          </div>
          <div className="bg-[#12100E] p-4 rounded-xl border border-[#3A332A]">
            <p className="font-mono-ibm text-[#A79C8C] text-[10px] uppercase tracking-wider mb-1">Peak Time</p>
            <p className="font-sans-inter text-[#F4EFE6] text-[18px] font-bold truncate">{analytics.bestTime}</p>
            <p className="text-[11px] text-[#C9963F] mt-1">Most focused</p>
          </div>
          <div className="bg-[#12100E] p-4 rounded-xl border border-[#3A332A] md:col-span-2">
            <p className="font-mono-ibm text-[#A79C8C] text-[10px] uppercase tracking-wider mb-1">This Week's Activity (Mins)</p>
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
