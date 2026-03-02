'use client';

import { Sun, Sunrise, Sunset, Clock } from 'lucide-react';
import { ConditionCard } from '../ConditionCard';
import { type ConditionStatus } from '@/stores/briefing-store';
import type { DaylightData } from '@/lib/synthesis/conditions';

interface DaylightCardProps {
  data: DaylightData | null;
}

function getStatus(data: DaylightData): ConditionStatus {
  if (data.daylightHours >= 12) return 'good';
  if (data.daylightHours >= 9) return 'caution';
  return 'concern';
}

function formatDuration(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function buildSummary(data: DaylightData): string {
  return `${formatDuration(data.daylightHours)} daylight · Sunrise ${data.sunrise} · Sunset ${data.sunset}`;
}

function TimeRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="flex items-center gap-2 text-xs text-stone-500">
        {icon}
        {label}
      </span>
      <span className="text-xs font-medium text-stone-700">{value}</span>
    </div>
  );
}

export function DaylightCard({ data }: DaylightCardProps) {
  if (!data) {
    return (
      <ConditionCard
        category="Daylight"
        icon={<Sun className="size-4 text-amber-500" />}
        status="unknown"
        summary="Daylight data unavailable"
      />
    );
  }

  const status = getStatus(data);
  const summary = buildSummary(data);

  return (
    <ConditionCard
      category="Daylight"
      icon={<Sun className="size-4 text-amber-500" />}
      status={status}
      summary={summary}
    >
      <div className="space-y-1 divide-y divide-stone-100">
        {data.civilDawn && (
          <TimeRow
            icon={<Clock className="size-3 text-stone-400" />}
            label="Civil twilight begins"
            value={data.civilDawn}
          />
        )}
        <TimeRow
          icon={<Sunrise className="size-3 text-amber-400" />}
          label="Sunrise"
          value={data.sunrise}
        />
        <TimeRow
          icon={<Sun className="size-3 text-amber-500" />}
          label="Golden hour begins"
          value={data.goldenHourStart}
        />
        <TimeRow
          icon={<Sunset className="size-3 text-orange-400" />}
          label="Sunset"
          value={data.sunset}
        />
        {data.civilDusk && (
          <TimeRow
            icon={<Clock className="size-3 text-stone-400" />}
            label="Civil twilight ends"
            value={data.civilDusk}
          />
        )}
        <div className="flex items-center justify-between pt-2">
          <span className="text-xs font-medium text-stone-600">
            Total daylight
          </span>
          <span className="text-sm font-semibold text-stone-800">
            {formatDuration(data.daylightHours)}
          </span>
        </div>
      </div>
      {data.timeZone && (
        <p className="mt-2 text-[10px] text-stone-400">
          Times shown in {data.timeZone}
        </p>
      )}
    </ConditionCard>
  );
}
