'use client';

import { useState, useMemo } from 'react';
import {
  ChevronDown,
  MapPin,
  AlertTriangle,
  Clock,
  Shield,
  Route,
  Backpack,
  CheckSquare,
  Square,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useMapStore } from '@/stores/map-store';
import { useSegmentStore } from '@/stores/segment-store';
import {
  HAZARD_COLORS,
  HAZARD_LABELS,
} from '@/lib/routes/hazard-colors';
import type { HazardLevel } from '@/lib/types/briefing';
import type {
  RouteWalkthroughSegment,
  CriticalSection,
  AlternativeRoute,
  OverallReadiness,
} from '@/lib/types/route-briefing';

// ── Bottom Line Card ────────────────────────────────────────────────

const READINESS_CONFIG: Record<
  OverallReadiness,
  { label: string; bg: string; border: string; text: string }
> = {
  green: {
    label: 'GOOD TO GO',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-800',
  },
  yellow: {
    label: 'PROCEED WITH CAUTION',
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    text: 'text-yellow-800',
  },
  orange: {
    label: 'SIGNIFICANT CONCERNS',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    text: 'text-orange-800',
  },
  red: {
    label: 'RECOMMEND POSTPONING',
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-800',
  },
};

interface BottomLineCardProps {
  bottomLine: string;
  overallReadiness: OverallReadiness;
}

function BottomLineCard({ bottomLine, overallReadiness }: BottomLineCardProps) {
  const config = READINESS_CONFIG[overallReadiness];

  return (
    <div
      className={cn(
        'rounded-lg border-2 p-4',
        config.bg,
        config.border,
      )}
    >
      <div className="mb-2 flex items-center gap-2">
        <Shield className={cn('size-4', config.text)} />
        <span className={cn('text-xs font-bold uppercase tracking-wider', config.text)}>
          {config.label}
        </span>
      </div>
      <p className={cn('text-sm font-semibold leading-relaxed', config.text)}>
        {bottomLine}
      </p>
    </div>
  );
}

// ── Segment Card ────────────────────────────────────────────────────

interface SegmentCardProps {
  segment: RouteWalkthroughSegment;
  isCritical: boolean;
  onZoomToSegment: (segmentOrder: number) => void;
}

function SegmentCard({ segment, isCritical, onZoomToSegment }: SegmentCardProps) {
  const [expanded, setExpanded] = useState(false);
  const hazardLevel = segment.hazardLevel as HazardLevel;
  const hazardColor = HAZARD_COLORS[hazardLevel] ?? HAZARD_COLORS.low;
  const hazardLabel = HAZARD_LABELS[hazardLevel] ?? 'Low';

  return (
    <div
      className={cn(
        'rounded-lg border bg-white transition-shadow',
        isCritical ? 'border-red-300 shadow-sm shadow-red-100' : 'border-stone-200',
      )}
    >
      <button
        type="button"
        className="flex w-full items-start gap-3 p-4 text-left"
        onClick={() => setExpanded(!expanded)}
      >
        <div
          className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md text-xs font-bold text-white"
          style={{ backgroundColor: hazardColor }}
        >
          {segment.segmentOrder + 1}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-stone-800">
              {segment.title}
            </span>
            {isCritical && (
              <AlertTriangle className="size-3.5 text-red-500" />
            )}
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-stone-500">
            <span>Mi {segment.mileRange}</span>
            <span className="text-stone-300">&middot;</span>
            <Badge
              variant="outline"
              className="border-transparent px-1.5 py-0 text-[10px] text-white"
              style={{ backgroundColor: hazardColor }}
            >
              {hazardLabel}
            </Badge>
          </div>
        </div>
        <ChevronDown
          className={cn(
            'mt-1 size-4 shrink-0 text-stone-400 transition-transform',
            expanded && 'rotate-180',
          )}
        />
      </button>

      {expanded && (
        <div className="border-t border-stone-100 px-4 pb-4 pt-3">
          <p className="mb-3 text-sm leading-relaxed text-stone-600">
            {segment.narrative}
          </p>

          {segment.keyCallouts.length > 0 && (
            <ul className="mb-3 space-y-1">
              {segment.keyCallouts.map((callout, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-stone-600">
                  <span className="mt-1 inline-block size-1.5 shrink-0 rounded-full bg-stone-400" />
                  {callout}
                </li>
              ))}
            </ul>
          )}

          {segment.timingAdvice && (
            <div className="mb-3 flex items-start gap-2 rounded-md bg-amber-50 px-3 py-2">
              <Clock className="mt-0.5 size-3.5 shrink-0 text-amber-600" />
              <span className="text-xs font-medium text-amber-800">
                {segment.timingAdvice}
              </span>
            </div>
          )}

          <button
            type="button"
            className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 hover:text-emerald-700"
            onClick={(e) => {
              e.stopPropagation();
              onZoomToSegment(segment.segmentOrder);
            }}
          >
            <MapPin className="size-3" />
            Zoom to segment
          </button>
        </div>
      )}
    </div>
  );
}

// ── Critical Sections ───────────────────────────────────────────────

interface CriticalSectionsProps {
  sections: CriticalSection[];
  onZoomToSegment: (segmentOrder: number) => void;
}

function CriticalSectionsPanel({ sections, onZoomToSegment }: CriticalSectionsProps) {
  if (sections.length === 0) return null;

  return (
    <div>
      <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-red-600">
        <AlertTriangle className="size-3.5" />
        Critical Sections
      </h4>
      <div className="space-y-2">
        {sections.map((section) => (
          <button
            key={section.segmentOrder}
            type="button"
            className="w-full rounded-lg border border-red-200 bg-red-50 p-3 text-left transition-colors hover:bg-red-100"
            onClick={() => onZoomToSegment(section.segmentOrder)}
          >
            <div className="mb-1 text-sm font-semibold text-red-800">
              {section.title}
            </div>
            <p className="mb-1 text-xs text-red-700">{section.whyCritical}</p>
            <p className="text-xs font-medium text-red-900">
              {section.recommendation}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Alternative Routes ──────────────────────────────────────────────

interface AlternativeRoutesProps {
  routes: AlternativeRoute[];
}

function AlternativeRoutesPanel({ routes }: AlternativeRoutesProps) {
  if (routes.length === 0) return null;

  return (
    <div>
      <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-stone-400">
        <Route className="size-3.5" />
        Alternative Routes
      </h4>
      <div className="space-y-2">
        {routes.map((route, i) => (
          <div
            key={i}
            className="rounded-lg border border-stone-200 bg-stone-50 p-3"
          >
            <p className="text-sm text-stone-700">{route.description}</p>
            <p className="mt-1 text-xs font-medium text-emerald-600">
              {route.benefit}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Gear Checklist ──────────────────────────────────────────────────

interface GearChecklistProps {
  items: string[];
}

function GearChecklist({ items }: GearChecklistProps) {
  const [checked, setChecked] = useState<Set<number>>(new Set());

  if (items.length === 0) return null;

  const toggleItem = (index: number) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  return (
    <div>
      <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-stone-400">
        <Backpack className="size-3.5" />
        Route-Specific Gear
      </h4>
      <div className="space-y-1">
        {items.map((item, i) => (
          <button
            key={i}
            type="button"
            className="flex w-full items-start gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-stone-50"
            onClick={() => toggleItem(i)}
          >
            {checked.has(i) ? (
              <CheckSquare className="mt-0.5 size-4 shrink-0 text-emerald-500" />
            ) : (
              <Square className="mt-0.5 size-4 shrink-0 text-stone-300" />
            )}
            <span
              className={cn(
                'text-sm',
                checked.has(i)
                  ? 'text-stone-400 line-through'
                  : 'text-stone-700',
              )}
            >
              {item}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Main RouteWalkthrough ───────────────────────────────────────────

interface RouteWalkthroughProps {
  bottomLine: string;
  overallReadiness: OverallReadiness;
  routeWalkthrough: RouteWalkthroughSegment[];
  criticalSections: CriticalSection[];
  alternativeRoutes: AlternativeRoute[] | null;
  gearChecklist: string[];
}

export function RouteWalkthrough({
  bottomLine,
  overallReadiness,
  routeWalkthrough,
  criticalSections,
  alternativeRoutes,
  gearChecklist,
}: RouteWalkthroughProps) {
  const flyTo = useMapStore((s) => s.flyTo);
  const segments = useSegmentStore((s) => s.segments);

  const criticalOrders = useMemo(
    () => new Set(criticalSections.map((s) => s.segmentOrder)),
    [criticalSections],
  );

  const handleZoomToSegment = (segmentOrder: number) => {
    const seg = segments.find((s) => s.segmentOrder === segmentOrder);
    if (!seg) return;
    const coords = seg.geometry.coordinates;
    const mid = Math.floor(coords.length / 2);
    if (coords[mid]) {
      flyTo({ center: [coords[mid][0], coords[mid][1]], zoom: 14 });
    }
  };

  return (
    <div className="space-y-5">
      <BottomLineCard
        bottomLine={bottomLine}
        overallReadiness={overallReadiness}
      />

      <div>
        <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-stone-400">
          Route Walkthrough
        </h4>
        <div className="space-y-2">
          {routeWalkthrough.map((segment) => (
            <SegmentCard
              key={segment.segmentOrder}
              segment={segment}
              isCritical={criticalOrders.has(segment.segmentOrder)}
              onZoomToSegment={handleZoomToSegment}
            />
          ))}
        </div>
      </div>

      <CriticalSectionsPanel
        sections={criticalSections}
        onZoomToSegment={handleZoomToSegment}
      />

      {alternativeRoutes && alternativeRoutes.length > 0 && (
        <AlternativeRoutesPanel routes={alternativeRoutes} />
      )}

      <GearChecklist items={gearChecklist} />
    </div>
  );
}
