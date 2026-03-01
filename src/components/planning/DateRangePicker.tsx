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

  const selected: RdpDateRange | undefined = dateRange
    ? { from: dateRange.start, to: dateRange.end }
    : undefined;

  const handleSelect = (range: RdpDateRange | undefined) => {
    if (!range?.from) return;
    setDateRange({
      start: range.from,
      end: range.to ?? range.from,
    });
    if (range.from && range.to) {
      setOpen(false);
    }
  };

  const label =
    dateRange?.start && dateRange?.end
      ? `${format(dateRange.start, 'MMM d')} – ${format(dateRange.end, 'MMM d')}`
      : 'Pick dates';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-stone-600 transition-colors hover:bg-stone-100"
        >
          <CalendarDays className="h-3.5 w-3.5" />
          <span>{label}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0"
        align="end"
      >
        <Calendar
          mode="range"
          selected={selected}
          onSelect={handleSelect}
          numberOfMonths={2}
          defaultMonth={dateRange?.start ?? new Date()}
        />
      </PopoverContent>
    </Popover>
  );
}
