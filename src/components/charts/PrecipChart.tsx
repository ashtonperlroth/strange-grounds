'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import type { NWSForecastPeriod } from '@/lib/data-sources/nws';

interface PrecipPoint {
  time: string;
  label: string;
  precip: number;
}

function buildChartData(hourly: NWSForecastPeriod[]): PrecipPoint[] {
  // Use 6-hour blocks to reduce chart clutter
  return hourly.slice(0, 48).filter((_, i) => i % 6 === 0).map((p) => {
    const date = parseISO(p.startTime);
    return {
      time: p.startTime,
      label: format(date, 'ha EEE'),
      precip: p.probabilityOfPrecipitation?.value ?? 0,
    };
  });
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: PrecipPoint }>;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  const date = parseISO(point.time);
  return (
    <div className="rounded-md border border-stone-200 bg-white px-3 py-2 text-xs shadow-sm">
      <p className="font-medium text-stone-700">{format(date, 'EEE, MMM d · h a')}</p>
      <p className="text-sky-600">Precip chance: {point.precip}%</p>
    </div>
  );
}

interface PrecipChartProps {
  hourly: NWSForecastPeriod[];
}

export function PrecipChart({ hourly }: PrecipChartProps) {
  const data = buildChartData(hourly);

  // Skip chart if all values are zero
  const hasAnyPrecip = data.some((d) => d.precip > 0);
  if (!hourly.length || !hasAnyPrecip) {
    return (
      <div className="flex h-[140px] items-center justify-center text-sm text-stone-400">
        No precipitation expected
      </div>
    );
  }

  return (
    <div className="h-[140px] w-full">
      <div className="mb-1 flex items-center justify-between px-1">
        <span className="text-xs font-medium text-stone-600">Precipitation Chance (%)</span>
        <span className="text-[10px] text-stone-400">Next 48 hours</span>
      </div>
      <ResponsiveContainer width="100%" height="90%">
        <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: '#78716c' }}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 10, fill: '#78716c' }}
            tickLine={false}
            axisLine={false}
            width={30}
            tickFormatter={(v: number) => `${v}%`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar
            dataKey="precip"
            fill="#7dd3fc"
            radius={[2, 2, 0, 0]}
            maxBarSize={20}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
