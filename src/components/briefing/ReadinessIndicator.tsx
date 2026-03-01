import {
  CheckCircle,
  AlertTriangle,
  AlertOctagon,
  type LucideIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type Readiness = 'green' | 'yellow' | 'red';

interface ReadinessConfig {
  label: string;
  Icon: LucideIcon;
  badgeClass: string;
  iconClass: string;
}

const CONFIG: Record<Readiness, ReadinessConfig> = {
  green: {
    label: 'GO',
    Icon: CheckCircle,
    badgeClass: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
    iconClass: 'text-emerald-400',
  },
  yellow: {
    label: 'CAUTION',
    Icon: AlertTriangle,
    badgeClass: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400',
    iconClass: 'text-yellow-400',
  },
  red: {
    label: 'CONCERN',
    Icon: AlertOctagon,
    badgeClass: 'border-red-500/30 bg-red-500/10 text-red-400',
    iconClass: 'text-red-400',
  },
};

interface ReadinessIndicatorProps {
  readiness: Readiness | null;
  warningCount?: number;
  criticalCount?: number;
}

export function ReadinessIndicator({
  readiness,
  warningCount = 0,
  criticalCount = 0,
}: ReadinessIndicatorProps) {
  if (!readiness) return null;

  const { label, Icon, badgeClass, iconClass } = CONFIG[readiness];
  const alertCount = warningCount + criticalCount;

  return (
    <div className="flex items-center gap-2">
      <Badge
        variant="outline"
        className={cn('gap-1.5 px-3 py-1 text-sm font-semibold', badgeClass)}
      >
        <Icon className={cn('size-4', iconClass)} />
        {label}
      </Badge>
      {alertCount > 0 && (
        <span className="text-xs text-slate-400">
          {criticalCount > 0 && `${criticalCount} critical`}
          {criticalCount > 0 && warningCount > 0 && ' · '}
          {warningCount > 0 && `${warningCount} warning${warningCount !== 1 ? 's' : ''}`}
        </span>
      )}
    </div>
  );
}
