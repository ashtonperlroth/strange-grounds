'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface BriefingSummaryProps {
  bottomLine: string | null;
  narrative: string | null;
  readinessRationale?: string | null;
  isLoading?: boolean;
  streamedText?: string;
  isStreaming?: boolean;
}

export function BriefingSummary({
  bottomLine,
  narrative,
  readinessRationale,
  isLoading,
  streamedText,
  isStreaming,
}: BriefingSummaryProps) {
  const [visible, setVisible] = useState(false);

  const displayText = narrative ?? streamedText ?? null;
  const hasContent = !!displayText || !!bottomLine;

  useEffect(() => {
    const show = hasContent && !isLoading;
    const raf = requestAnimationFrame(() => setVisible(show));
    return () => cancelAnimationFrame(raf);
  }, [hasContent, isLoading]);

  if (isLoading && !isStreaming && !streamedText) {
    return <BriefingSummarySkeleton />;
  }

  if (!hasContent && !isStreaming) return null;

  if (isStreaming && displayText) {
    return (
      <div className="max-w-prose break-words space-y-4">
        <div className="flex items-center gap-2 text-sm text-stone-500">
          <Loader2 className="size-3.5 animate-spin text-emerald-600" />
          <span>Generating narrative…</span>
        </div>
        <div className="text-base leading-relaxed text-stone-600 whitespace-pre-wrap">
          {displayText}
          <span className="inline-block w-1 h-4 ml-0.5 animate-pulse bg-emerald-500 align-text-bottom" />
        </div>
      </div>
    );
  }

  const paragraphs = displayText
    ? displayText.split(/\n\n/).filter((p) => p.trim())
    : [];

  return (
    <div
      className={cn(
        'max-w-prose break-words space-y-4 transition-all duration-700 ease-out',
        visible ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0',
      )}
    >
      {bottomLine && (
        <div className="rounded-lg border border-stone-200 bg-stone-50 px-4 py-3">
          <p className="text-base font-medium leading-relaxed text-stone-800">
            {bottomLine}
          </p>
        </div>
      )}

      {paragraphs.length > 0 && (
        <div className="space-y-3">
          {paragraphs.map((paragraph, i) => (
            <p key={i} className="text-base leading-relaxed text-stone-600">
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
