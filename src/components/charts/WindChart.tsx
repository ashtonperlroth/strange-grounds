'use client';

import {
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import type { NWSForecastPeriod } from '@/lib/data-sources/nws';

interface WindPoint {
  time: string;
  label: string;
  speed: number;
  gust: number | null;
}

function parseWindSpeed(windSpeed: string): { speed: number; gust: number | null } {
  const rangeMatch = windSpeed.match(/(\d+)\s*to\s*(\d+)/);
  if (rangeMatch) {
    return { speed: parseInt(rangeMatch[1], 10), gust: parseInt(rangeMatch[2], 10) };
  }
  const singleMatch = windSpeed.match(/(\d+)/);
  return { speed: singleMatch ? parseInt(singleMatch[1], 10) : 0, gust: null };
}

function buildChartData(hourly: NWSForecastPeriod[]): WindPoint[] {
  return hourly.slice(0, 48).map((p) => {
    const date = parseISO(p.startTime);
    const { speed, gust } = parseWindSpeed(p.windSpeed);
    return {
      time: p.startTime,
      label: format(date, 'ha EEE'),
      speed,
      gust,
    };
  });
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number | null; color: string }>;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-stone-200 bg-white px-3 py-2 text-xs shadow-sm">
      {payload.map((entry) =>
        entry.value !== null ? (
          <p key={entry.name} style={{ color: entry.color }}>
            {entry.name === 'speed' ? 'Sustained' : 'Gust'}: {entry.value} mph
          </p>
        ) : null,
      )}
    </div>
  );
}

interface WindChartProps {
  hourly: NWSForecastPeriod[];
}

export function WindChart({ hourly }: WindChartProps) {
  if (!hourly.length) {
    return (
      <div className="flex h-[160px] items-center justify-center text-sm text-stone-400">
        No hourly wind data available
      </div>
    );
  }

  const data = buildChartData(hourly);
  const speeds = data.map((d) => d.speed);
  const gusts = data.flatMap((d) => (d.gust !== null ? [d.gust] : []));
  const allValues = [...speeds, ...gusts];
  const maxVal = allValues.length ? Math.max(...allValues) : 30;
  const hasGusts = gusts.length > 0;

  return (
    <div className="h-[160px] w-full">
      <div className="mb-1 flex items-center justify-between px-1">
        <span className="text-xs font-medium text-stone-600">Wind Speed (mph)</span>
        <span className="text-[10px] text-stone-400">Next 48 hours</span>
      </div>
      <ResponsiveContainer width="100%" height="90%">
        <ComposedChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: '#78716c' }}
            interval="preserveStartEnd"
            tickLine={false}
          />
          <YAxis
            domain={[0, Math.ceil(maxVal * 1.1)]}
            tick={{ fontSize: 10, fill: '#78716c' }}
            tickLine={false}
            axisLine={false}
            width={30}
            unit=" mph"
            tickFormatter={(v: number) => String(v)}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="speed"
            name="speed"
            stroke="#3b82f6"
            fill="#bfdbfe"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }}
          />
          {hasGusts && (
            <Line
              type="monotone"
              dataKey="gust"
              name="gust"
              stroke="#ef4444"
              strokeWidth={1.5}
              strokeDasharray="4 2"
              dot={false}
              connectNulls={false}
              activeDot={{ r: 3, fill: '#ef4444', stroke: '#fff', strokeWidth: 2 }}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
