'use client';

import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface BriefingSummaryProps {
  narrative: string | null;
  isLoading?: boolean;
}

function renderNarrativeBlock(block: string, index: number) {
  const trimmed = block.trim();
  if (!trimmed) return null;

  const headingMatch = trimmed.match(/^##\s+(.+)/);
  if (headingMatch) {
    const rest = trimmed.slice(headingMatch[0].length).trim();
    return (
      <div key={index}>
        <h4 className="mb-1 text-sm font-semibold text-stone-800">
          {headingMatch[1]}
        </h4>
        {rest && (
          <p className="text-sm leading-relaxed text-stone-600">{rest}</p>
        )}
      </div>
    );
  }

  return (
    <p key={index} className="text-sm leading-relaxed text-stone-600">
      {trimmed}
    </p>
  );
}

export function BriefingSummary({ narrative, isLoading }: BriefingSummaryProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const show = !!narrative && !isLoading;
    const raf = requestAnimationFrame(() => setVisible(show));
    return () => cancelAnimationFrame(raf);
  }, [narrative, isLoading]);

  if (isLoading) {
    return <BriefingSummarySkeleton />;
  }

  if (!narrative) return null;

  const blocks = narrative.split(/\n(?=##\s)|\n\n/);

  return (
    <div
      className={cn(
        'max-w-prose space-y-3 transition-all duration-700 ease-out',
        visible ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0',
      )}
    >
      {blocks.map((block, i) => renderNarrativeBlock(block, i))}
    </div>
  );
}

function BriefingSummarySkeleton() {
  return (
    <div className="max-w-prose space-y-2.5">
      <Skeleton className="h-3.5 w-full bg-stone-200" />
      <Skeleton className="h-3.5 w-[92%] bg-stone-200" />
      <Skeleton className="h-3.5 w-[85%] bg-stone-200" />
      <Skeleton className="h-3.5 w-[60%] bg-stone-200" />
    </div>
  );
}
