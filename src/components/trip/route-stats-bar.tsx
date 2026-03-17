import { cn } from "@/lib/utils";

interface Stat {
  label: string;
  value: string;
}

interface RouteStatsBarProps {
  stats: Stat[];
  className?: string;
}

/**
 * Horizontal route stats bar with monospace values separated by dots.
 * Sourced from 21st.dev "Stats Metric" pattern,
 * adapted for inline route metadata display.
 */
export function RouteStatsBar({ stats, className }: RouteStatsBarProps) {
  return (
    <div
      className={cn(
        "rounded-md border border-border bg-secondary px-4 py-2.5",
        className
      )}
    >
      <p className="font-mono text-sm text-muted-foreground">
        {stats.map((stat, i) => (
          <span key={stat.label}>
            {stat.value}
            {i < stats.length - 1 && (
              <span className="mx-2">&middot;</span>
            )}
          </span>
        ))}
      </p>
    </div>
  );
}
