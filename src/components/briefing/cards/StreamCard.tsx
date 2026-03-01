'use client';

import { Waves } from 'lucide-react';
import { ConditionCard } from '../ConditionCard';
import { type ConditionStatus } from '@/stores/briefing-store';
import { type UsgsData, type UsgsStationData } from '@/lib/data-sources/usgs';

interface StreamCardProps {
  data: UsgsData | null;
  children?: React.ReactNode;
}

function getFlowColor(percentOfMedian: number | null): string {
  if (percentOfMedian === null) return 'text-stone-500';
  if (percentOfMedian <= 120) return 'text-emerald-600';
  if (percentOfMedian <= 180) return 'text-yellow-600';
  return 'text-red-600';
}

function getFlowBg(percentOfMedian: number | null): string {
  if (percentOfMedian === null) return 'bg-stone-100';
  if (percentOfMedian <= 120) return 'bg-emerald-50';
  if (percentOfMedian <= 180) return 'bg-yellow-50';
  return 'bg-red-50';
}

function getStatus(data: UsgsData): ConditionStatus {
  const { maxPercentOfMedian } = data.summary;

  if (data.stations.length === 0) return 'unknown';

  if (maxPercentOfMedian !== null) {
    if (maxPercentOfMedian <= 120) return 'good';
    if (maxPercentOfMedian <= 180) return 'caution';
    return 'concern';
  }

  if (data.nearest?.current.dischargeCfs !== null) return 'good';

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

function formatDischarge(value: number | null): string {
  if (value === null) return '—';
  return `${Math.round(value).toLocaleString()} cfs`;
}

function formatGageHeight(value: number | null): string {
  if (value === null) return '—';
  return `${value.toFixed(1)} ft`;
}

function formatPercent(value: number | null): string {
  if (value === null) return 'N/A';
  return `${value}%`;
}

function buildSummary(data: UsgsData): string {
  const { gaugeCount } = data.summary;

  if (gaugeCount === 0) return 'No gauges nearby';

  const parts: string[] = [];

  const statusDescriptors: string[] = [];
  for (const s of data.stations) {
    if (s.percentOfMedian !== null) {
      if (s.percentOfMedian > 180) statusDescriptors.push('high');
      else if (s.percentOfMedian > 120) statusDescriptors.push('elevated');
      else statusDescriptors.push('normal');
    }
  }

  const unique = [...new Set(statusDescriptors)];
  if (unique.length > 0) {
    const worstStatus = unique.includes('high')
      ? 'High flows'
      : unique.includes('elevated')
        ? 'Elevated flows'
        : 'Normal flows';
    parts.push(worstStatus);
  } else if (data.nearest && data.nearest.current.dischargeCfs !== null) {
    parts.push(formatDischarge(data.nearest.current.dischargeCfs));
  }

  parts.push(`${gaugeCount} gauge${gaugeCount !== 1 ? 's' : ''}`);

  return parts.join(' · ');
}

function buildDetail(data: UsgsData): string {
  if (data.stations.length === 0) {
    return 'No USGS stream gauges found within 30 km of this location. Stream flow data is unavailable for this area.';
  }

  const lines = data.stations.map((s) => {
    const discharge = formatDischarge(s.current.dischargeCfs);
    const pctLabel =
      s.percentOfMedian !== null ? ` (${formatPercent(s.percentOfMedian)} of median)` : '';
    const arrow = getTrendArrow(s.trend);
    const dist = s.station.distanceKm
      ? ` — ${s.station.distanceKm.toFixed(1)} km away`
      : '';
    return `${s.station.name}${dist}: ${discharge}${pctLabel} ${arrow}`;
  });

  return lines.join('\n');
}

function GaugeDetail({ station }: { station: UsgsStationData }) {
  const arrow = getTrendArrow(station.trend);
  const discharge = formatDischarge(station.current.dischargeCfs);
  const pct = formatPercent(station.percentOfMedian);
  const dist = station.station.distanceKm
    ? `${station.station.distanceKm.toFixed(1)} km`
    : '';
  const gageHt =
    station.current.gageHeightFt !== null
      ? formatGageHeight(station.current.gageHeightFt)
      : null;

  return (
    <div className="flex items-start justify-between gap-2 rounded-md bg-stone-50 px-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-stone-700">
          {station.station.name}
        </p>
        {dist && <p className="text-[10px] text-stone-400">{dist}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2 text-xs text-stone-600">
        <span>{discharge}</span>
        {gageHt && (
          <>
            <span className="text-stone-300">·</span>
            <span>{gageHt}</span>
          </>
        )}
        {station.percentOfMedian !== null && (
          <>
            <span className="text-stone-300">·</span>
            <span
              className={`text-[10px] font-medium ${getFlowColor(station.percentOfMedian)} ${getFlowBg(station.percentOfMedian)} rounded px-1 py-0.5`}
            >
              {pct}
            </span>
          </>
        )}
        <span
          className={
            station.trend === 'rising'
              ? 'text-red-500'
              : station.trend === 'falling'
                ? 'text-blue-500'
                : 'text-stone-400'
          }
        >
          {arrow}
        </span>
      </div>
    </div>
  );
}

export function StreamCard({ data, children }: StreamCardProps) {
  if (!data) {
    return (
      <ConditionCard
        category="Stream Crossings"
        icon={<Waves className="size-4 text-cyan-600" />}
        status="unknown"
        summary="Stream flow data unavailable"
        detail="No USGS data could be retrieved for this location."
      />
    );
  }

  const status = getStatus(data);
  const summary = buildSummary(data);
  const detail = data.stations.length === 0 ? buildDetail(data) : undefined;

  return (
    <ConditionCard
      category="Stream Crossings"
      icon={<Waves className="size-4 text-cyan-600" />}
      status={status}
      summary={summary}
      detail={detail}
    >
      {data.stations.length > 0 && (
        <div className="space-y-3">
          <div className="space-y-1.5">
            {data.stations.map((s) => (
              <GaugeDetail key={s.station.id} station={s} />
            ))}
          </div>

          {data.summary.maxPercentOfMedian !== null && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-stone-500">Peak % of Median:</span>
              <span
                className={`font-medium ${getFlowColor(data.summary.maxPercentOfMedian)}`}
              >
                {formatPercent(data.summary.maxPercentOfMedian)}
              </span>
            </div>
          )}

          {children}
        </div>
      )}
    </ConditionCard>
  );
}
