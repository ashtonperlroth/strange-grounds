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
  { label: string; className: string; srText: string }
> = {
  good: {
    label: 'Good',
    className: 'border-emerald-600/20 bg-emerald-50 text-emerald-700',
    srText: 'Status: good conditions',
  },
  caution: {
    label: 'Caution',
    className: 'border-yellow-600/20 bg-yellow-50 text-yellow-700',
    srText: 'Status: use caution',
  },
  concern: {
    label: 'Concern',
    className: 'border-red-600/20 bg-red-50 text-red-700',
    srText: 'Status: significant concern',
  },
  unknown: {
    label: 'N/A',
    className: 'border-stone-300 bg-stone-50 text-stone-500',
    srText: 'Status: not available',
  },
  unavailable: {
    label: 'Unavailable',
    className: 'border-stone-300 bg-stone-100 text-stone-500',
    srText: 'Status: data unavailable',
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
      className="rounded-lg border border-stone-200 bg-white px-4 transition-shadow hover:shadow-sm last:border-b"
    >
      <AccordionTrigger className="gap-3 hover:no-underline [&>svg]:text-stone-400">
        <div className="flex flex-1 items-center gap-3 overflow-hidden">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-stone-50 text-base" aria-hidden="true">
            {icon}
          </span>
          <div className="flex flex-1 flex-col items-start gap-1 overflow-hidden">
            <div className="flex w-full items-center gap-2">
              <span className="text-sm font-medium text-stone-800">
                {category}
              </span>
              <Badge
                variant="outline"
                className={cn('text-[10px] px-1.5 py-0', statusConfig.className)}
              >
                {statusConfig.label}
              </Badge>
              <span className="sr-only">{statusConfig.srText}</span>
            </div>
            <p className="w-full truncate text-left text-xs text-stone-500">
              {summary}
            </p>
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent className="text-stone-600">
        {detail && (
          <p className="mb-3 text-sm leading-relaxed text-stone-600">
            {detail}
          </p>
        )}
        {children}
      </AccordionContent>
    </AccordionItem>
  );
}
