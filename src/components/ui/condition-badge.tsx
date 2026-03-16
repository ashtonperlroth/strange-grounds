import { cn } from "@/lib/utils";

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

interface ConditionBadgeProps {
  level: ConditionLevel;
  label?: string;
  className?: string;
}

export function ConditionBadge({
  level,
  label,
  className,
}: ConditionBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold",
        conditionStyles[level],
        className
      )}
    >
      <span
        className={cn("h-1.5 w-1.5 rounded-full", {
          "bg-green-500": level === "good",
          "bg-amber-500": level === "caution",
          "bg-red-500": level === "danger",
          "bg-muted-foreground": level === "info",
        })}
      />
      {label ?? conditionLabels[level]}
    </span>
  );
}

export type { ConditionLevel };
