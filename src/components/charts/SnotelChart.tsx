'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { type SnotelDailyReading } from '@/lib/data-sources/snotel';

interface SnotelChartProps {
  readings: SnotelDailyReading[];
  stationName?: string;
}

interface ChartDataPoint {
  date: string;
  label: string;
  snowDepth: number | null;
  swe: number | null;
}

function formatDateLabel(dateStr: string): string {
  const [, month, day] = dateStr.split('-');
  return `${parseInt(month)}/${parseInt(day)}`;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number | null; dataKey: string; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-md border border-stone-200 bg-white px-3 py-2 shadow-sm">
      <p className="mb-1 text-xs font-medium text-stone-700">{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} className="text-xs" style={{ color: entry.color }}>
          {entry.dataKey === 'snowDepth' ? 'Depth' : 'SWE'}:{' '}
          {entry.value !== null ? `${entry.value}"` : '—'}
        </p>
      ))}
    </div>
  );
}

export function SnotelChart({ readings, stationName }: SnotelChartProps) {
  if (!readings.length) {
    return (
      <div className="flex h-48 items-center justify-center rounded-md bg-stone-50 text-xs text-stone-400">
        No chart data available
      </div>
    );
  }

  const chartData: ChartDataPoint[] = readings.map((r) => ({
    date: r.date,
    label: formatDateLabel(r.date),
    snowDepth: r.snowDepthIn,
    swe: r.sweIn,
  }));

  return (
    <div className="mt-3 space-y-1.5">
      {stationName && (
        <p className="text-[10px] font-medium uppercase tracking-wider text-stone-400">
          30-Day Snow Depth — {stationName}
        </p>
      )}
      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 4, right: 4, bottom: 0, left: -20 }}
          >
            <defs>
              <linearGradient id="snowDepthGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="sweGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: '#a8a29e' }}
              tickLine={false}
              axisLine={{ stroke: '#d6d3d1' }}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 10, fill: '#a8a29e' }}
              tickLine={false}
              axisLine={false}
              unit='"'
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="snowDepth"
              stroke="#3b82f6"
              strokeWidth={2}
              fill="url(#snowDepthGradient)"
              connectNulls
              name="Snow Depth"
            />
            <Area
              type="monotone"
              dataKey="swe"
              stroke="#06b6d4"
              strokeWidth={1.5}
              fill="url(#sweGradient)"
              connectNulls
              name="SWE"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center gap-4 text-[10px] text-stone-400">
        <span className="flex items-center gap-1">
          <span className="inline-block size-2 rounded-full bg-blue-500" />
          Snow Depth
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block size-2 rounded-full bg-cyan-500" />
          SWE
        </span>
      </div>
    </div>
  );
}
