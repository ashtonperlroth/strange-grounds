'use client';

import { Snowflake } from 'lucide-react';
import { ConditionCard } from '../ConditionCard';
import { type ConditionStatus } from '@/stores/briefing-store';
import { type SnotelData, type SnotelStationData } from '@/lib/data-sources/snotel';

interface SnowpackCardProps {
  data: SnotelData | null;
  unavailable?: boolean;
  children?: React.ReactNode;
}

function getStatus(data: SnotelData): ConditionStatus {
  const { percentOfNormal } = data.summary;
  if (percentOfNormal !== null) {
    if (percentOfNormal >= 80) return 'good';
    if (percentOfNormal >= 50) return 'caution';
    return 'concern';
  }
  if (data.stations.length > 0 && data.nearest?.latest.snowDepthIn !== null) {
    return 'good';
  }
  return 'unknown';
}

function getTrendArrow(trend: 'rising' | 'falling' | 'stable'): string {
  switch (trend) {
    case 'rising':
      return '↑';
    case 'falling':
      return '↓';
    case 'stable':
      return '→';
  }
}

function formatDepth(value: number | null): string {
  if (value === null) return '—';
  return `${Math.round(value)}"`;
}

function formatSwe(value: number | null): string {
  if (value === null) return '—';
  return `${value.toFixed(1)}" SWE`;
}

function formatPercent(value: number | null): string {
  if (value === null) return 'N/A';
  return `${Math.round(value)}% of normal`;
}

function buildSummary(data: SnotelData): string {
  const { avgSnowDepthIn, avgSweIn, percentOfNormal } = data.summary;

  const parts: string[] = [];
  if (avgSnowDepthIn !== null) parts.push(`${formatDepth(avgSnowDepthIn)} depth`);
  if (avgSweIn !== null) parts.push(formatSwe(avgSweIn));
  if (percentOfNormal !== null) parts.push(formatPercent(percentOfNormal));

  if (parts.length === 0 && data.nearest) {
    const n = data.nearest.latest;
    if (n.snowDepthIn !== null) parts.push(`${formatDepth(n.snowDepthIn)} depth`);
    if (n.sweIn !== null) parts.push(formatSwe(n.sweIn));
  }

  return parts.length > 0 ? parts.join(', ') : 'No data available';
}

function buildDetail(data: SnotelData): string {
  if (data.stations.length === 0) {
    return 'No SNOTEL stations found within 50 km of this location. Snowpack data is unavailable for this area.';
  }

  const stationLines = data.stations.map((s) => {
    const arrow = getTrendArrow(s.trend);
    const depth = formatDepth(s.latest.snowDepthIn);
    const swe = formatSwe(s.latest.sweIn);
    const elev = s.station.elevationM
      ? ` (${Math.round(s.station.elevationM * 3.281)} ft)`
      : '';
    return `${s.station.name}${elev}: ${depth}, ${swe} ${arrow}`;
  });

  return stationLines.join('\n');
}

function StationDetail({ station }: { station: SnotelStationData }) {
  const arrow = getTrendArrow(station.trend);
  const depth = formatDepth(station.latest.snowDepthIn);
  const swe = formatSwe(station.latest.sweIn);
  const elev = station.station.elevationM
    ? `${Math.round(station.station.elevationM * 3.281).toLocaleString()} ft`
    : '';
  const dist = station.station.distanceKm
    ? `${station.station.distanceKm.toFixed(1)} km`
    : '';

  const meta = [elev, dist].filter(Boolean).join(' · ');

  return (
    <div className="flex items-start justify-between gap-2 rounded-md bg-stone-50 px-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-stone-700">
          {station.station.name}
        </p>
        {meta && (
          <p className="text-[10px] text-stone-400">{meta}</p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2 text-xs text-stone-600">
        <span>{depth}</span>
        <span className="text-stone-300">·</span>
        <span>{swe}</span>
        <span
          className={
            station.trend === 'rising'
              ? 'text-blue-500'
              : station.trend === 'falling'
                ? 'text-red-500'
                : 'text-stone-400'
          }
        >
          {arrow}
        </span>
      </div>
    </div>
  );
}

export function SnowpackCard({ data, unavailable, children }: SnowpackCardProps) {
  if (!data) {
    return (
      <ConditionCard
        category="Snowpack"
        icon={<Snowflake className="size-4 text-blue-500" />}
        status={unavailable ? 'unavailable' : 'unknown'}
        summary={unavailable ? 'Data temporarily unavailable' : 'Snowpack data unavailable'}
        detail={unavailable ? 'This data source did not respond. Try regenerating the briefing.' : 'No SNOTEL data could be retrieved for this location.'}
      />
    );
  }

  const status = getStatus(data);
  const summary = buildSummary(data);
  const detail = data.stations.length === 0 ? buildDetail(data) : undefined;

  return (
    <ConditionCard
      category="Snowpack"
      icon={<Snowflake className="size-4 text-blue-500" />}
      status={status}
      summary={summary}
      detail={detail}
    >
      {data.stations.length > 0 && (
        <div className="space-y-3">
          <div className="space-y-1.5">
            {data.stations.map((s) => (
              <StationDetail key={s.station.id} station={s} />
            ))}
          </div>

          {data.summary.percentOfNormal !== null && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-stone-500">% of Normal:</span>
              <span
                className={
                  data.summary.percentOfNormal >= 80
                    ? 'font-medium text-emerald-600'
                    : data.summary.percentOfNormal >= 50
                      ? 'font-medium text-amber-600'
                      : 'font-medium text-red-600'
                }
              >
                {formatPercent(data.summary.percentOfNormal)}
              </span>
            </div>
          )}

          {children}
        </div>
      )}
    </ConditionCard>
  );
}
