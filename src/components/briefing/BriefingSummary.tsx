'use client';

import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface BriefingSummaryProps {
  bottomLine: string | null;
  narrative: string | null;
  readinessRationale?: string | null;
  isLoading?: boolean;
}

export function BriefingSummary({
  bottomLine,
  narrative,
  readinessRationale,
  isLoading,
}: BriefingSummaryProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const show = (!!narrative || !!bottomLine) && !isLoading;
    const raf = requestAnimationFrame(() => setVisible(show));
    return () => cancelAnimationFrame(raf);
  }, [narrative, bottomLine, isLoading]);

  if (isLoading) {
    return <BriefingSummarySkeleton />;
  }

  if (!narrative && !bottomLine) return null;

  const paragraphs = narrative
    ? narrative.split(/\n\n/).filter((p) => p.trim())
    : [];

  return (
    <div
      className={cn(
        'max-w-prose space-y-4 transition-all duration-700 ease-out',
        visible ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0',
      )}
    >
      {bottomLine && (
        <div className="rounded-lg border border-stone-200 bg-stone-50 px-4 py-3">
          <p className="text-sm font-semibold leading-relaxed text-stone-800">
            {bottomLine}
          </p>
        </div>
      )}

      {paragraphs.length > 0 && (
        <div className="space-y-3">
          {paragraphs.map((paragraph, i) => (
            <p key={i} className="text-sm leading-relaxed text-stone-600">
              {paragraph.trim()}
            </p>
          ))}
        </div>
      )}

      {readinessRationale && (
        <p className="text-xs italic leading-relaxed text-stone-400">
          {readinessRationale}
        </p>
      )}
    </div>
  );
}

function BriefingSummarySkeleton() {
  return (
    <div className="max-w-prose space-y-2.5">
      <Skeleton className="h-12 w-full rounded-lg bg-stone-200" />
      <Skeleton className="h-3.5 w-full bg-stone-200" />
      <Skeleton className="h-3.5 w-[92%] bg-stone-200" />
      <Skeleton className="h-3.5 w-[85%] bg-stone-200" />
      <Skeleton className="h-3.5 w-[60%] bg-stone-200" />
    </div>
  );
}
