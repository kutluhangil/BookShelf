import React, { useMemo } from 'react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { Book } from '../types';

interface LibraryGrowthDashboardProps {
  books: Book[];
}

export const LibraryGrowthDashboard: React.FC<LibraryGrowthDashboardProps> = ({ books }) => {
  const chartData = useMemo(() => {
    // Sort books by addedAt date
    const sortedBooks = [...books].sort(
      (a, b) => new Date(a.addedAt).getTime() - new Date(b.addedAt).getTime()
    );

    // Group by date and calculate cumulative total
    const grouped: Record<string, number> = {};
    let cumulative = 0;

    sortedBooks.forEach((book) => {
      if (!book.addedAt) return;
      const dateObj = new Date(book.addedAt);
      const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      grouped[dateStr] = (grouped[dateStr] || 0) + 1;
    });

    const data = [];
    for (const [date, count] of Object.entries(grouped)) {
      cumulative += count;
      data.push({
        date,
        total: cumulative,
        added: count,
      });
    }

    // Ensure we have some data even if empty or single point
    if (data.length === 1) {
      data.unshift({ date: 'Start', total: 0, added: 0 });
    } else if (data.length === 0) {
      data.push({ date: 'No Data', total: 0, added: 0 });
    }

    return data;
  }, [books]);

  return (
    <section className="bg-[#1C1916] rounded-2xl hairline-border p-5 sm:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-serif-literata text-[20px] sm:text-[22px] text-[#F4EFE6] font-semibold">
            Library Growth
          </h3>
          <p className="font-mono-ibm text-[11px] text-[#A79C8C] mt-0.5">
            CUMULATIVE ARCHIVE VOLUME OVER TIME
          </p>
        </div>
        <div className="text-right">
          <span className="font-serif-literata text-[24px] sm:text-[28px] text-[#C9963F] font-bold">
            {books.length}
          </span>
          <p className="font-mono-ibm text-[10px] text-[#A79C8C] uppercase tracking-wider">
            Total Volumes
          </p>
        </div>
      </div>

      <div className="h-[220px] w-full pt-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#C9963F" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#C9963F" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#3A332A" vertical={false} />
            <XAxis 
              dataKey="date" 
              stroke="#A79C8C" 
              fontSize={10} 
              tickLine={false}
              axisLine={false}
              dy={10}
            />
            <YAxis 
              stroke="#A79C8C" 
              fontSize={10} 
              tickLine={false} 
              axisLine={false}
              dx={-10}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#12100E',
                border: '1px solid #3A332A',
                borderRadius: '8px',
                color: '#F4EFE6',
                fontSize: '12px',
                fontFamily: 'monospace',
              }}
              itemStyle={{ color: '#C9963F' }}
              labelStyle={{ color: '#A79C8C', marginBottom: '4px' }}
              cursor={{ stroke: '#5A5044', strokeWidth: 1, strokeDasharray: '4 4' }}
            />
            <Area
              type="monotone"
              dataKey="total"
              name="Books Cataloged"
              stroke="#C9963F"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorTotal)"
              activeDot={{ r: 6, fill: '#12100E', stroke: '#C9963F', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
};
