import { Loader2 } from 'lucide-react';

const LINE_WIDTHS = [95, 88, 76, 92, 70, 84];

export function NarrativeSkeleton() {
  return (
    <div className="space-y-3 rounded-lg border border-stone-200 bg-white p-4">
      <div className="flex items-center gap-2">
        <Loader2 className="size-4 animate-spin text-emerald-600" />
        <span className="text-sm font-medium text-stone-600">
          Generating briefing narrative…
        </span>
      </div>
      <div className="space-y-2">
        {LINE_WIDTHS.map((width, i) => (
          <div
            key={i}
            className="h-3 animate-pulse rounded bg-stone-100"
            style={{ width: `${width}%`, animationDelay: `${i * 100}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
