'use client';

import { Satellite } from 'lucide-react';
import { ConditionCard } from '../ConditionCard';
import { type ConditionStatus } from '@/stores/briefing-store';
import type { SnowCoverageResult } from '@/lib/routes/snow-coverage';
import type { SnowlineEstimate } from '@/lib/data-sources/sentinel2-snowline';

// ── Types ──────────────────────────────────────────────────────────────

export interface SatelliteCardData {
  available: boolean;
  trueColorUrl: string | null;
  ndsiUrl: string | null;
  bounds: [number, number, number, number] | null;
  acquisitionDate: string | null;
  cloudCover: number | null;
  snowCoverage: SnowCoverageResult | null;
  snowline: SnowlineEstimate | null;
}

interface SatelliteCardProps {
  data: SatelliteCardData | null;
  children?: React.ReactNode;
}

// ── Helpers ───────────────────────────────────────────────────────────

function getStatus(data: SatelliteCardData): ConditionStatus {
  if (!data.available) return 'unavailable';
  if (!data.snowCoverage) return 'unknown';

  const snowPct = data.snowCoverage.totalSnowPercent;
  if (snowPct >= 70) return 'caution';
  if (snowPct >= 40) return 'caution';
  return 'good';
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function daysAgo(dateStr: string): number {
  const d = new Date(dateStr);
  const now = new Date();
  return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

function daysAgoLabel(dateStr: string): string {
  const days = daysAgo(dateStr);
  if (days === 0) return 'today';
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
}

function buildSummary(data: SatelliteCardData): string {
  if (!data.available) return 'No recent satellite imagery available';
  if (!data.snowCoverage && data.acquisitionDate) {
    return `Imagery from ${formatDate(data.acquisitionDate)}`;
  }
  if (data.snowCoverage) {
    const { totalSnowPercent, totalMixedPercent, totalBarePercent } =
      data.snowCoverage;
    return `${totalSnowPercent}% snow, ${totalMixedPercent}% mixed, ${totalBarePercent}% bare`;
  }
  return 'Satellite data processing';
}

// ── Sub-Components ────────────────────────────────────────────────────

function SnowCoverageBar({
  snowPercent,
  mixedPercent,
  barePercent,
  label,
}: {
  snowPercent: number;
  mixedPercent: number;
  barePercent: number;
  label?: string;
}) {
  return (
    <div className="space-y-1">
      {label && (
        <p className="text-[10px] font-medium text-stone-500">{label}</p>
      )}
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-stone-100">
        {snowPercent > 0 && (
          <div
            className="bg-white border border-stone-200"
            style={{ width: `${snowPercent}%` }}
            title={`Snow: ${snowPercent}%`}
          />
        )}
        {mixedPercent > 0 && (
          <div
            className="bg-sky-200"
            style={{ width: `${mixedPercent}%` }}
            title={`Mixed: ${mixedPercent}%`}
          />
        )}
        {barePercent > 0 && (
          <div
            className="bg-amber-700/60"
            style={{ width: `${barePercent}%` }}
            title={`Bare: ${barePercent}%`}
          />
        )}
      </div>
    </div>
  );
}

function SegmentBreakdown({ segments }: { segments: SnowCoverageResult['perSegment'] }) {
  if (segments.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-400">
        Per-Segment Snow Coverage
      </p>
      <div className="space-y-1.5">
        {segments.map((seg) => (
          <div key={seg.segmentId} className="flex items-center gap-2">
            <span className="w-8 shrink-0 text-right text-[10px] tabular-nums text-stone-400">
              {seg.segmentOrder + 1}
            </span>
            <div className="flex-1">
              <SnowCoverageBar
                snowPercent={seg.snowPercent}
                mixedPercent={seg.mixedPercent}
                barePercent={seg.barePercent}
              />
            </div>
            <span className="w-10 shrink-0 text-right text-[10px] tabular-nums text-stone-500">
              {seg.snowPercent}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────

export function SatelliteCard({ data, children }: SatelliteCardProps) {
  if (!data || !data.available) {
    return null;
  }

  const status = getStatus(data);
  const summary = buildSummary(data);

  return (
    <ConditionCard
      category="Satellite Overview"
      icon={<Satellite className="size-4 text-indigo-500" />}
      status={status}
      summary={summary}
    >
      <div className="space-y-4">
        {/* Acquisition date & cloud cover */}
        <div className="flex flex-wrap items-center gap-2">
          {data.acquisitionDate && (
            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-700">
              Satellite: {formatDate(data.acquisitionDate)}
            </span>
          )}
          {data.acquisitionDate && (
            <span className="text-[10px] text-stone-400">
              {daysAgoLabel(data.acquisitionDate)}
            </span>
          )}
          {data.cloudCover !== null && data.cloudCover > 5 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2 py-0.5 text-[10px] text-stone-500">
              {Math.round(data.cloudCover)}% cloud cover
            </span>
          )}
        </div>

        {/* Thumbnail */}
        {data.trueColorUrl && (
          <div className="overflow-hidden rounded-md border border-stone-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={data.trueColorUrl}
              alt="Satellite true-color composite of route area"
              className="h-auto w-full object-cover"
              loading="lazy"
            />
          </div>
        )}

        {/* Total snow coverage bar */}
        {data.snowCoverage && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-stone-700">
                Route Snow Coverage
              </p>
              <p className="text-xs tabular-nums text-stone-500">
                {data.snowCoverage.totalSnowPercent}% snow-covered,{' '}
                {data.snowCoverage.totalMixedPercent}% mixed,{' '}
                {data.snowCoverage.totalBarePercent}% bare ground
              </p>
            </div>
            <SnowCoverageBar
              snowPercent={data.snowCoverage.totalSnowPercent}
              mixedPercent={data.snowCoverage.totalMixedPercent}
              barePercent={data.snowCoverage.totalBarePercent}
            />
          </div>
        )}

        {/* Per-segment breakdown */}
        {data.snowCoverage &&
          data.snowCoverage.perSegment.length > 1 && (
            <SegmentBreakdown segments={data.snowCoverage.perSegment} />
          )}

        {/* Snowline estimate */}
        {data.snowline && (
          <div className="rounded-md bg-sky-50 px-3 py-2">
            <p className="text-xs font-medium text-sky-800">
              Snowline estimated at ~{data.snowline.elevationFt.toLocaleString()}ft
              {data.snowline.aspect && ` on ${data.snowline.aspect} aspects`}
            </p>
            <p className="mt-0.5 text-[10px] text-sky-600">
              {data.snowline.snowAbovePercent}% snow above · {data.snowline.snowBelowPercent}% below
              {data.snowline.confidence !== 'high' && (
                <span className="ml-1 text-sky-400">
                  ({data.snowline.confidence} confidence)
                </span>
              )}
            </p>
          </div>
        )}

        {/* Cloud cover note */}
        {data.cloudCover !== null && data.cloudCover > 15 && (
          <p className="text-[10px] italic text-stone-400">
            Note: {Math.round(data.cloudCover)}% cloud cover may affect snow
            classification accuracy in partially obscured areas.
          </p>
        )}

        {/* Legend */}
        <div className="flex items-center gap-3 text-[10px] text-stone-400">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-3 rounded-sm border border-stone-200 bg-white" />
            Snow
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-3 rounded-sm bg-sky-200" />
            Mixed
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-3 rounded-sm bg-amber-700/60" />
            Bare
          </span>
        </div>

        {children}
      </div>
    </ConditionCard>
  );
}
