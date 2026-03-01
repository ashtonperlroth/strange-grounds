'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import type { NWSForecastPeriod } from '@/lib/data-sources/nws';

interface TempChartProps {
  hourly: NWSForecastPeriod[];
}

interface ChartPoint {
  time: string;
  label: string;
  temp: number;
}

function buildChartData(hourly: NWSForecastPeriod[]): ChartPoint[] {
  return hourly.slice(0, 48).map((p) => {
    const date = parseISO(p.startTime);
    return {
      time: p.startTime,
      label: format(date, 'ha EEE'),
      temp: p.temperature,
    };
  });
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: ChartPoint }>;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  const date = parseISO(point.time);
  return (
    <div className="rounded-md border border-stone-200 bg-white px-3 py-2 text-xs shadow-sm">
      <p className="font-medium text-stone-700">
        {format(date, 'EEE, MMM d · h:mm a')}
      </p>
      <p className="text-stone-500">
        {point.temp}°F
      </p>
    </div>
  );
}

export function TempChart({ hourly }: TempChartProps) {
  if (!hourly.length) {
    return (
      <div className="flex h-[244px] items-center justify-center text-sm text-stone-400">
        No hourly temperature data available
      </div>
    );
  }

  const data = buildChartData(hourly);
  const temps = data.map((d) => d.temp);
  const minTemp = Math.min(...temps);
  const maxTemp = Math.max(...temps);
  const padding = Math.max(5, Math.round((maxTemp - minTemp) * 0.15));

  return (
    <div className="h-[244px] w-full">
      <div className="mb-1 flex items-center justify-between px-1">
        <span className="text-xs font-medium text-stone-600">
          Hourly Temperature (°F)
        </span>
        <span className="text-[10px] text-stone-400">
          Next 48 hours
        </span>
      </div>
      <ResponsiveContainer width="100%" height="90%">
        <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: '#78716c' }}
            interval="preserveStartEnd"
            tickLine={false}
          />
          <YAxis
            domain={[minTemp - padding, maxTemp + padding]}
            tick={{ fontSize: 10, fill: '#78716c' }}
            tickLine={false}
            axisLine={false}
            width={35}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="temp"
            stroke="#0284c7"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: '#0284c7', stroke: '#fff', strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
