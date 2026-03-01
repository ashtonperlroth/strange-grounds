import { type ReactNode } from 'react';
import {
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { type ConditionStatus } from '@/stores/briefing-store';

const STATUS_CONFIG: Record<
  ConditionStatus,
  { label: string; className: string }
> = {
  good: {
    label: 'Good',
    className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
  },
  caution: {
    label: 'Caution',
    className: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400',
  },
  concern: {
    label: 'Concern',
    className: 'border-red-500/30 bg-red-500/10 text-red-400',
  },
  unknown: {
    label: 'N/A',
    className: 'border-slate-500/30 bg-slate-500/10 text-slate-400',
  },
};

interface ConditionCardProps {
  category: string;
  icon: ReactNode;
  status: ConditionStatus;
  summary: string;
  detail?: string;
  children?: ReactNode;
}

export function ConditionCard({
  category,
  icon,
  status,
  summary,
  detail,
  children,
}: ConditionCardProps) {
  const statusConfig = STATUS_CONFIG[status];

  return (
    <AccordionItem
      value={category}
      className="rounded-lg border border-slate-700/50 bg-slate-800/50 px-4 last:border-b"
    >
      <AccordionTrigger className="gap-3 hover:no-underline [&>svg]:text-slate-500">
        <div className="flex flex-1 items-center gap-3 overflow-hidden">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-slate-700/50 text-base">
            {icon}
          </span>
          <div className="flex flex-1 flex-col items-start gap-1 overflow-hidden">
            <div className="flex w-full items-center gap-2">
              <span className="text-sm font-medium text-slate-100">
                {category}
              </span>
              <Badge
                variant="outline"
                className={cn('text-[10px] px-1.5 py-0', statusConfig.className)}
              >
                {statusConfig.label}
              </Badge>
            </div>
            <p className="w-full truncate text-left text-xs text-slate-400">
              {summary}
            </p>
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent className="text-slate-300">
        {detail && (
          <p className="mb-3 text-sm leading-relaxed text-slate-300">
            {detail}
          </p>
        )}
        {children}
      </AccordionContent>
    </AccordionItem>
  );
}
