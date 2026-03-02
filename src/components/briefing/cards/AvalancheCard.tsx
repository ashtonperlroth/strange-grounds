'use client';

import { TriangleAlert, ExternalLink, Mountain } from 'lucide-react';
import { ConditionCard } from '../ConditionCard';
import { type ConditionStatus } from '@/stores/briefing-store';
import type { AvalancheData, DangerLevel } from '@/lib/data-sources/avalanche';
import { DangerRose } from '@/components/charts/DangerRose';

interface AvalancheCardProps {
  data: AvalancheData | null;
  unavailable?: boolean;
}

const DANGER_BADGE_COLORS: Record<DangerLevel, string> = {
  0: 'bg-stone-100 text-stone-500 border-stone-300',
  1: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  2: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  3: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  4: 'bg-red-50 text-red-700 border-red-200',
  5: 'bg-red-50 text-red-700 border-red-200',
};

function deriveStatus(data: AvalancheData): ConditionStatus {
  if (data.dangerLevel >= 4) return 'concern';
  if (data.dangerLevel >= 3) return 'caution';
  if (data.dangerLevel >= 1) return 'good';
  return 'unknown';
}

function buildSummary(data: AvalancheData): string {
  const parts: string[] = [`${data.dangerLabel} (${data.dangerLevel}/5)`];

  if (data.problems.length > 0) {
    const names = data.problems.slice(0, 2).map((p) => p.name);
    parts.push(names.join(', '));
  }

  return parts.join(' · ');
}

function DangerBadge({ level, label }: { level: DangerLevel; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold ${DANGER_BADGE_COLORS[level]}`}
    >
      <span className="text-[10px]">{level}</span>
      <span>{label}</span>
    </span>
  );
}

function ProblemRow({
  name,
  aspects,
  elevations,
  likelihood,
}: {
  name: string;
  aspects: string[];
  elevations: string[];
  likelihood: string;
}) {
  const elevLabel = elevations
    .map((e) =>
      e
        .replace('above_treeline', 'Above TL')
        .replace('near_treeline', 'Near TL')
        .replace('below_treeline', 'Below TL'),
    )
    .join(', ');

  return (
    <div className="flex items-start gap-2 rounded-md bg-stone-50 px-3 py-2">
      <Mountain className="mt-0.5 size-3.5 shrink-0 text-stone-400" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-stone-700">{name}</p>
        <div className="mt-0.5 flex flex-wrap gap-x-3 text-[10px] text-stone-500">
          {aspects.length > 0 && <span>Aspects: {aspects.join(', ')}</span>}
          {elevLabel && <span>Elev: {elevLabel}</span>}
          {likelihood && <span>Likelihood: {likelihood}</span>}
        </div>
      </div>
    </div>
  );
}

export function AvalancheCard({ data, unavailable }: AvalancheCardProps) {
  if (!data) {
    if (unavailable) {
      return (
        <ConditionCard
          category="Avalanche"
          icon={<TriangleAlert className="size-4 text-yellow-600" />}
          status="unavailable"
          summary="Data temporarily unavailable"
          detail="This data source did not respond. Try regenerating the briefing."
        />
      );
    }
    return null;
  }

  const status = deriveStatus(data);
  const summary = buildSummary(data);

  return (
    <ConditionCard
      category="Avalanche"
      icon={<TriangleAlert className="size-4 text-yellow-600" />}
      status={status}
      summary={summary}
    >
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <DangerBadge level={data.dangerLevel} label={data.dangerLabel} />
          <span className="text-[10px] text-stone-400">
            {data.zone} — {data.center}
          </span>
        </div>

        {data.discussion && (
          <p className="text-sm leading-relaxed text-stone-600">
            {data.discussion}
          </p>
        )}

        {data.problems.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-medium uppercase tracking-wider text-stone-400">
              Avalanche Problems
            </p>
            {data.problems.map((p, i) => (
              <ProblemRow
                key={`${p.name}-${i}`}
                name={p.name}
                aspects={p.aspects}
                elevations={p.elevations}
                likelihood={p.likelihood}
              />
            ))}
          </div>
        )}

        {data.dangerRatings.length > 0 && (
          <DangerRose
            dangerRatings={data.dangerRatings}
            problems={data.problems}
          />
        )}

        {data.centerUrl && (
          <a
            href={data.centerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline"
          >
            Full forecast
            <ExternalLink className="size-3" />
          </a>
        )}
      </div>
    </ConditionCard>
  );
}

export function getAvalancheSortPriority(data: AvalancheData | null): number {
  if (!data) return 0;
  return data.dangerLevel >= 3 ? 1 : 0;
}
