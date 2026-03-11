'use client';

import { useMemo } from 'react';
import { AlertTriangle, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useMapStore } from '@/stores/map-store';
import { useSegmentStore } from '@/stores/segment-store';
import {
  HAZARD_COLORS,
  HAZARD_LABELS,
  hazardLevelIndex,
  computeRouteScore,
} from '@/lib/routes/hazard-colors';
import type { HazardLevel, RouteAnalysis } from '@/lib/types/briefing';

const LEVEL_ORDER: HazardLevel[] = ['low', 'moderate', 'considerable', 'high', 'extreme'];

interface HazardSummaryCardProps {
  routeAnalysis: RouteAnalysis;
}

interface CriticalSection {
  segmentOrder: number;
  hazardLevel: HazardLevel;
  factors: string[];
  distanceM: number;
  lngLat: [number, number] | null;
}

function formatFactor(factor: string): string {
  return factor
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function HazardSummaryCard({ routeAnalysis }: HazardSummaryCardProps) {
  const flyTo = useMapStore((s) => s.flyTo);
  const segments = useSegmentStore((s) => s.segments);

  const overallLevel = routeAnalysis.overallHazardLevel as HazardLevel;
  const overallColor = HAZARD_COLORS[overallLevel] ?? HAZARD_COLORS.low;
  const overallLabel = HAZARD_LABELS[overallLevel] ?? 'Low';

  const routeScore = useMemo(
    () => computeRouteScore(routeAnalysis.hazardDistribution),
    [routeAnalysis.hazardDistribution],
  );

  const distributionBar = useMemo(() => {
    const total = Object.values(routeAnalysis.hazardDistribution).reduce(
      (a, b) => a + b,
      0,
    );
    if (total === 0) return [];
    return LEVEL_ORDER.filter((l) => routeAnalysis.hazardDistribution[l] > 0).map((level) => ({
      level,
      pct: (routeAnalysis.hazardDistribution[level] / total) * 100,
    }));
  }, [routeAnalysis.hazardDistribution]);

  const criticalSections = useMemo<CriticalSection[]>(() => {
    return routeAnalysis.segments
      .filter((sc) => hazardLevelIndex(sc.hazardLevel) >= 2)
      .map((sc) => {
        const seg = segments.find((s) => s.segmentOrder === sc.segmentOrder);
        let lngLat: [number, number] | null = null;
        if (seg) {
          const coords = seg.geometry.coordinates;
          const mid = Math.floor(coords.length / 2);
          if (coords[mid]) {
            lngLat = [coords[mid][0], coords[mid][1]];
          }
        }
        return {
          segmentOrder: sc.segmentOrder,
          hazardLevel: sc.hazardLevel,
          factors: sc.hazardFactors,
          distanceM: seg?.distanceM ?? 0,
          lngLat,
        };
      });
  }, [routeAnalysis.segments, segments]);

  const handleZoomToSegment = (section: CriticalSection) => {
    if (section.lngLat) {
      flyTo({ center: section.lngLat, zoom: 14 });
    }
  };

  const scoreColor =
    routeScore >= 8
      ? 'text-emerald-600'
      : routeScore >= 5
        ? 'text-amber-600'
        : 'text-red-600';

  return (
    <div className="rounded-lg border border-stone-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="size-4" style={{ color: overallColor }} />
          <span className="text-sm font-semibold text-stone-800">
            Route Hazard Assessment
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-medium uppercase tracking-wider text-stone-400">
            Score
          </span>
          <span className={`text-lg font-bold tabular-nums ${scoreColor}`}>
            {routeScore}
            <span className="text-xs font-normal text-stone-400">/10</span>
          </span>
        </div>
      </div>

      <div className="mb-3 flex items-center gap-2">
        <Badge
          variant="outline"
          className="border-transparent px-2.5 py-0.5 text-xs font-semibold text-white"
          style={{ backgroundColor: overallColor }}
        >
          {overallLabel}
        </Badge>
        <span className="text-xs text-stone-500">
          Overall route hazard level
        </span>
      </div>

      {distributionBar.length > 0 && (
        <div className="mb-4">
          <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-stone-400">
            Hazard Distribution
          </div>
          <div
            className="flex h-3 overflow-hidden rounded-full"
            role="img"
            aria-label={`Hazard distribution: ${distributionBar.map((d) => `${HAZARD_LABELS[d.level]} ${Math.round(d.pct)}%`).join(', ')}`}
          >
            {distributionBar.map((d) => (
              <div
                key={d.level}
                className="transition-all"
                style={{
                  width: `${d.pct}%`,
                  backgroundColor: HAZARD_COLORS[d.level],
                  minWidth: d.pct > 0 ? '4px' : '0',
                }}
                title={`${HAZARD_LABELS[d.level]}: ${Math.round(d.pct)}%`}
              />
            ))}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5">
            {distributionBar.map((d) => (
              <div key={d.level} className="flex items-center gap-1">
                <span
                  className="inline-block size-2 rounded-full"
                  style={{ backgroundColor: HAZARD_COLORS[d.level] }}
                />
                <span className="text-[10px] text-stone-500">
                  {HAZARD_LABELS[d.level]} {Math.round(d.pct)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {criticalSections.length > 0 && (
        <div>
          <div className="mb-2 text-[10px] font-medium uppercase tracking-wider text-stone-400">
            Critical Sections
          </div>
          <div className="space-y-1.5">
            {criticalSections.map((section) => (
              <button
                key={section.segmentOrder}
                type="button"
                onClick={() => handleZoomToSegment(section)}
                className="group flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-stone-50"
              >
                <MapPin
                  className="mt-0.5 size-3 shrink-0 text-stone-400 group-hover:text-stone-600"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-stone-700">
                      Segment {section.segmentOrder + 1}
                    </span>
                    <Badge
                      variant="outline"
                      className="border-transparent px-1.5 py-0 text-[10px] text-white"
                      style={{
                        backgroundColor: HAZARD_COLORS[section.hazardLevel],
                      }}
                    >
                      {HAZARD_LABELS[section.hazardLevel]}
                    </Badge>
                    <span className="text-[10px] text-stone-400">
                      {(section.distanceM * 0.000621371).toFixed(1)} mi
                    </span>
                  </div>
                  {section.factors.length > 0 && (
                    <p className="mt-0.5 truncate text-[11px] text-stone-500">
                      {section.factors.map(formatFactor).join(' · ')}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
