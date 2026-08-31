import React, { useMemo } from 'react';
import { Book } from '../types';
import { useI18n } from '../i18n/I18nProvider';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';

interface WeeklyReadingChartProps {
  books: Book[];
}

export const WeeklyReadingChart: React.FC<WeeklyReadingChartProps> = ({ books }) => {
  const { t, locale } = useI18n();

  const data = useMemo(() => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    // Create 4 weekly buckets (0 is oldest, 3 is current)
    const buckets = Array.from({ length: 4 }).map((_, i) => {
      const end = new Date(today.getTime() - (i * 7 * 24 * 60 * 60 * 1000));
      const start = new Date(end.getTime() - (6 * 24 * 60 * 60 * 1000));
      start.setHours(0, 0, 0, 0);
      
      const startStr = start.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
      const endStr = end.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
      
      return {
        start,
        end,
        label: i === 0 ? t.weeklyChart.thisWeek : `${startStr} - ${endStr}`,
        seconds: 0,
        minutes: 0
      };
    }).reverse();

    // Aggregate sessions
    books.forEach(book => {
      book.readingSessions?.forEach(session => {
        const sessionDate = new Date(session.date);
        
        // Find which bucket this session belongs to
        for (const bucket of buckets) {
          if (sessionDate >= bucket.start && sessionDate <= bucket.end) {
            bucket.seconds += session.durationSeconds;
            break;
          }
        }
      });
    });

    // Convert seconds to minutes for display
    return buckets.map(b => ({
      ...b,
      minutes: Math.round(b.seconds / 60)
    }));
  }, [books, locale, t]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#151311] border border-[#3A332A] p-3 rounded-xl shadow-lg">
          <p className="font-mono-ibm text-[11px] text-[#A79C8C] uppercase tracking-wider mb-1">{label}</p>
          <p className="font-sans-inter text-[14px] text-[#F4EFE6] font-bold">
            {payload[0].value} <span className="text-[12px] font-normal text-[#A79C8C]">{t.weeklyChart.minutesUnit}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <section className="bg-[#1C1916] rounded-2xl hairline-border p-5 sm:p-6 space-y-5">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-[16px] text-[#C9963F]">bar_chart</span>
        <h3 className="font-serif-literata text-[20px] sm:text-[22px] text-[#F4EFE6] font-semibold">
          {t.weeklyChart.title}
        </h3>
      </div>
      
      <div className="h-[220px] w-full mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <XAxis 
              dataKey="label" 
              stroke="#A79C8C" 
              fontSize={11} 
              fontFamily="var(--font-ibm)"
              tickLine={false} 
              axisLine={false} 
              dy={10}
            />
            <YAxis 
              stroke="#A79C8C" 
              fontSize={11} 
              fontFamily="var(--font-ibm)"
              tickLine={false} 
              axisLine={false} 
              tickFormatter={(val) => t.common.minutesShort(val)} 
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#262119', opacity: 0.5 }} />
            <Bar dataKey="minutes" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={index === data.length - 1 ? '#C9963F' : '#5c492a'} 
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
};
