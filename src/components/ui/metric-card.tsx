import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

type ConditionLevel = "good" | "caution" | "danger" | "info";

const conditionStyles: Record<ConditionLevel, string> = {
  good: "bg-green-100 text-green-800 border-green-200",
  caution: "bg-amber-100 text-amber-800 border-amber-200",
  danger: "bg-red-100 text-red-800 border-red-200",
  info: "bg-secondary text-secondary-foreground border-border",
};

const conditionLabels: Record<ConditionLevel, string> = {
  good: "Good",
  caution: "Caution",
  danger: "Danger",
  info: "Info",
};

interface MetricCardProps {
  icon: React.ReactNode;
  title: string;
  value: string;
  unit?: string;
  condition: ConditionLevel;
  subtitle?: string;
  className?: string;
  children?: React.ReactNode;
}

export function MetricCard({
  icon,
  title,
  value,
  unit,
  condition,
  subtitle,
  className,
  children,
}: MetricCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-lg border border-border bg-card p-4",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2 text-muted-foreground">
          {icon}
          <span className="text-sm font-medium">{title}</span>
        </div>
        <Badge
          className={cn(
            "border text-[10px] font-semibold",
            conditionStyles[condition]
          )}
        >
          {conditionLabels[condition]}
        </Badge>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="font-mono text-2xl font-bold text-foreground">
          {value}
        </span>
        {unit && (
          <span className="font-mono text-sm text-muted-foreground">
            {unit}
          </span>
        )}
      </div>
      {subtitle && (
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      )}
      {children}
    </div>
  );
}

export type { ConditionLevel, MetricCardProps };
