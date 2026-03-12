'use client';

import { Loader2, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProgressData {
  weatherFetched?: boolean;
  snowpackFetched?: boolean;
  avalancheFetched?: boolean;
  streamFlowFetched?: boolean;
  firesFetched?: boolean;
  daylightFetched?: boolean;
  pointConditionsComplete?: boolean;
  segmentsComplete?: boolean;
  hazardsComplete?: boolean;
  synthesisStarted?: boolean;
  synthesisReady?: boolean;
}

interface PipelineStatusBarProps {
  status: string | null;
  elapsed: number;
  progress: Record<string, unknown>;
  isComplete: boolean;
}

const STEPS = [
  { key: 'pointConditionsComplete', label: 'Conditions' },
  { key: 'segmentsComplete', label: 'Segments' },
  { key: 'hazardsComplete', label: 'Hazards' },
  { key: 'synthesisReady', label: 'Narrative' },
] as const;

function humanizeStatus(status: string | null): string {
  if (!status) return 'Starting analysis…';
  switch (status) {
    case 'conditions_complete':
      return 'Conditions data fetched';
    case 'segments_analyzed':
      return 'Route segments analyzed';
    case 'hazards_assessed':
      return 'Hazards assessed';
    case 'generating_narrative':
      return 'Generating briefing narrative…';
    case 'ready_for_synthesis':
      return 'Starting narrative generation…';
    case 'streaming_narrative':
      return 'Streaming narrative…';
    case 'complete':
      return 'Briefing complete';
    default:
      return status;
  }
}

export function PipelineStatusBar({
  status,
  elapsed,
  progress,
  isComplete,
}: PipelineStatusBarProps) {
  const p = progress as ProgressData;
  const completedCount = STEPS.filter((s) => p[s.key]).length;

  if (isComplete) return null;

  return (
    <div className="animate-in fade-in duration-300 flex items-center gap-3 rounded-lg bg-stone-100 px-3 py-2">
      {completedCount === STEPS.length ? (
        <CheckCircle2 className="size-4 text-emerald-600" />
      ) : (
        <Loader2 className="size-4 animate-spin text-emerald-600" />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-stone-700 truncate">
          {humanizeStatus(status)}
        </p>
        <div className="mt-1 flex gap-1">
          {STEPS.map((step) => (
            <div
              key={step.key}
              className={cn(
                'h-1 flex-1 rounded-full transition-colors duration-500',
                p[step.key] ? 'bg-emerald-500' : 'bg-stone-200',
              )}
              title={step.label}
            />
          ))}
        </div>
      </div>
      <span className="text-xs tabular-nums text-stone-400 shrink-0">
        {elapsed}s
      </span>
    </div>
  );
}
