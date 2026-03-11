import { Loader2 } from 'lucide-react';

interface ConditionCardSkeletonProps {
  label: string;
}

export function ConditionCardSkeleton({ label }: ConditionCardSkeletonProps) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-3">
      <div className="flex items-center gap-2">
        <div className="size-5 animate-pulse rounded bg-stone-100" />
        <span className="text-xs text-stone-400">{label}</span>
        <Loader2 className="ml-auto size-3 animate-spin text-stone-300" />
      </div>
    </div>
  );
}
