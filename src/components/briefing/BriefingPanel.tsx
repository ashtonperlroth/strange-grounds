'use client';

import { usePlanningStore } from '@/stores/planning-store';
import { useBriefingPolling } from '@/hooks/useBriefingPolling';

function BriefingPlaceholder() {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-stone-800">
        Conditions Briefing
      </h2>
      <p className="text-sm text-stone-500">
        Select a location on the map to generate a conditions briefing.
      </p>

      <div className="space-y-3">
        {(['Weather Forecast', 'Avalanche Conditions', 'Snowpack', 'Stream Flow'] as const).map(
          (section) => (
            <div
              key={section}
              className="rounded-lg border border-dashed border-stone-200 p-4"
            >
              <h3 className="text-sm font-medium text-stone-600">{section}</h3>
              <div className="mt-2 h-16 rounded bg-stone-50" />
            </div>
          ),
        )}
      </div>
    </div>
  );
}

function BriefingLoadingSkeleton() {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-stone-800">
        Generating Briefing...
      </h2>
      <p className="text-sm text-stone-500">
        Fetching conditions data from multiple sources.
      </p>

      <div className="space-y-3">
        {['Fetching weather data...', 'Checking snowpack...', 'Avalanche conditions...', 'Stream flow data...', 'Computing daylight...', 'Synthesizing briefing...'].map(
          (label) => (
            <div
              key={label}
              className="rounded-lg border border-stone-200 p-4"
            >
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 animate-pulse rounded-full bg-emerald-400" />
                <span className="text-sm text-stone-500">{label}</span>
              </div>
              <div className="mt-2 space-y-2">
                <div className="h-3 w-3/4 animate-pulse rounded bg-stone-100" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-stone-100" />
              </div>
            </div>
          ),
        )}
      </div>
    </div>
  );
}

function ReadinessIndicator({ readiness }: { readiness: string | null }) {
  const colors: Record<string, string> = {
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
  };

  const labels: Record<string, string> = {
    green: 'Good to Go',
    yellow: 'Use Caution',
    red: 'High Risk',
  };

  if (!readiness) return null;

  return (
    <div className="flex items-center gap-2">
      <div className={`h-3 w-3 rounded-full ${colors[readiness] ?? 'bg-stone-400'}`} />
      <span className="text-sm font-medium text-stone-700">
        {labels[readiness] ?? readiness}
      </span>
    </div>
  );
}

function BriefingContent({ narrative, readiness }: { narrative: string; readiness: string | null }) {
  const sections = narrative.split('\n\n').filter(Boolean);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-stone-800">
          Conditions Briefing
        </h2>
        <ReadinessIndicator readiness={readiness} />
      </div>

      <div className="space-y-3">
        {sections.map((section, i) => {
          const lines = section.split('\n');
          const heading = lines[0]?.startsWith('#')
            ? lines[0].replace(/^#+\s*/, '')
            : null;
          const body = heading ? lines.slice(1).join('\n') : section;

          return (
            <div
              key={i}
              className="rounded-lg border border-stone-200 p-4"
            >
              {heading && (
                <h3 className="mb-2 text-sm font-semibold text-stone-700">
                  {heading}
                </h3>
              )}
              <p className="whitespace-pre-line text-sm leading-relaxed text-stone-600">
                {body.trim()}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function BriefingPanel() {
  const { activeBriefingId, isGenerating } = usePlanningStore();
  const { briefing, isLoading } = useBriefingPolling(activeBriefingId);

  if (isGenerating && isLoading) {
    return <BriefingLoadingSkeleton />;
  }

  if (briefing?.narrative) {
    return (
      <BriefingContent
        narrative={briefing.narrative}
        readiness={briefing.readiness}
      />
    );
  }

  return <BriefingPlaceholder />;
}
