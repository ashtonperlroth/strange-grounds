'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { CalendarDays } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { usePlanningStore } from '@/stores/planning-store';
import type { DateRange as RdpDateRange } from 'react-day-picker';

export function DateRangePicker() {
  const [open, setOpen] = useState(false);
  const { dateRange, setDateRange } = usePlanningStore();

  const selected: RdpDateRange = {
    from: dateRange.start,
    to: dateRange.end,
  };

  const handleSelect = (range: RdpDateRange | undefined) => {
    if (!range?.from) return;
    setDateRange({
      start: range.from,
      end: range.to ?? range.from,
    });
  };

  const label =
    dateRange.start && dateRange.end
      ? `${format(dateRange.start, 'MMM d')} – ${format(dateRange.end, 'MMM d')}`
      : 'Pick dates';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-slate-300 transition-colors hover:bg-slate-700"
        >
          <CalendarDays className="h-3.5 w-3.5" />
          <span>{label}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto border-slate-600 bg-slate-800 p-0"
        align="end"
      >
        <Calendar
          mode="range"
          selected={selected}
          onSelect={handleSelect}
          numberOfMonths={2}
          defaultMonth={dateRange.start}
          disabled={{ before: new Date() }}
        />
      </PopoverContent>
    </Popover>
  );
}
