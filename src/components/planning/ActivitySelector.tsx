'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ACTIVITIES, usePlanningStore } from '@/stores/planning-store';
import type { Activity } from '@/stores/planning-store';

export function ActivitySelector() {
  const { activity, setActivity } = usePlanningStore();

  return (
    <Select value={activity} onValueChange={(v) => setActivity(v as Activity)}>
      <SelectTrigger
        className="h-7 w-auto gap-1 border-0 bg-transparent px-2 text-xs text-slate-300 shadow-none hover:bg-slate-700 focus:ring-0 focus-visible:ring-0"
        size="sm"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="border-slate-600 bg-slate-800">
        {ACTIVITIES.map((a) => (
          <SelectItem
            key={a}
            value={a}
            className="text-sm text-slate-200 focus:bg-slate-700 focus:text-slate-100"
          >
            {a}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
