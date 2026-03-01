import { Skeleton } from '@/components/ui/skeleton';

interface BriefingSummaryProps {
  narrative: string | null;
  isLoading?: boolean;
}

export function BriefingSummary({ narrative, isLoading }: BriefingSummaryProps) {
  if (isLoading) {
    return <BriefingSummarySkeleton />;
  }

  if (!narrative) return null;

  return (
    <div className="max-w-prose space-y-2">
      <p className="text-sm leading-relaxed text-stone-600">{narrative}</p>
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
