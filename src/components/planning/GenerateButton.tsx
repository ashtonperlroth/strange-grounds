'use client';

import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { usePlanningStore } from '@/stores/planning-store';

export function GenerateButton() {
  const { location, dateRange, activity, isReadyToGenerate } =
    usePlanningStore();

  const ready = isReadyToGenerate();

  const missingItems: string[] = [];
  if (!location) missingItems.push('location');
  if (!dateRange) missingItems.push('date range');
  if (!activity) missingItems.push('activity');

  const handleClick = () => {
    if (!ready) return;
    console.log('Generate briefing:', { location, dateRange, activity });
  };

  const button = (
    <Button
      size="sm"
      disabled={!ready}
      onClick={handleClick}
      className="h-7 gap-1.5 bg-emerald-600 px-3 text-xs font-medium text-white hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500"
    >
      <Sparkles className="h-3.5 w-3.5" />
      Generate
    </Button>
  );

  if (ready) return button;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span tabIndex={0}>{button}</span>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="bg-slate-700 text-slate-200">
          Missing: {missingItems.join(', ')}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
