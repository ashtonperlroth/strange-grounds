"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ConditionBadge, type ConditionLevel } from "@/components/ui/condition-badge";

interface Metric {
  label: string;
  value: string;
}

interface SafetyCardProps {
  source: string;
  title: string;
  icon: LucideIcon;
  badge: ConditionLevel;
  badgeLabel?: string;
  date?: string;
  subtitle?: string;
  metrics?: Metric[];
  defaultExpanded?: boolean;
  className?: string;
}

/**
 * Expandable safety conditions card.
 * Sourced from 21st.dev "metric card" and "accordion" patterns,
 * adapted for Strange Grounds conditions display.
 */
export function SafetyCard({
  source,
  title,
  icon: Icon,
  badge,
  badgeLabel,
  date,
  subtitle,
  metrics = [],
  defaultExpanded = false,
  className,
}: SafetyCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div
      data-skeleton
      data-testid={`safety-card-${source}`}
      className={cn(
        "rounded-lg border border-border bg-card transition-shadow hover:shadow-sm",
        className
      )}
    >
      {/* SKELETON — Ashton will source final safety card design */}
      {/* Header */}
      <div className="px-4 pb-2 pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted">
              <Icon size={14} className="text-muted-foreground" />
            </div>
            <span className="text-xs font-medium text-foreground">{title}</span>
          </div>
          <ConditionBadge level={badge} label={badgeLabel} />
        </div>

        {date && (
          <p className="mt-1.5 pl-9 text-[10px] text-muted-foreground">
            {date}
          </p>
        )}

        {subtitle && (
          <p className="mt-1 pl-9 text-xs text-muted-foreground">{subtitle}</p>
        )}
      </div>

      {/* Expandable metrics */}
      {metrics.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="flex w-full items-center gap-1 px-4 py-2 text-[10px] font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <span>{expanded ? "Hide details" : "Show details"}</span>
            <ChevronDown
              size={12}
              className={cn(
                "transition-transform",
                expanded && "rotate-180"
              )}
            />
          </button>

          {expanded && (
            <div className="border-t border-border px-4 py-3">
              <dl className="space-y-1.5">
                {metrics.map((metric) => (
                  <div
                    key={metric.label}
                    className="flex items-baseline justify-between"
                  >
                    <dt className="text-[10px] text-muted-foreground">
                      {metric.label}
                    </dt>
                    <dd className="font-mono text-xs text-foreground">
                      {metric.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </>
      )}

      {/* No metrics placeholder */}
      {metrics.length === 0 && (
        <div className="px-4 pb-4">
          <p className="text-xs text-muted-foreground">Data loads here</p>
        </div>
      )}
    </div>
  );
}

export type { SafetyCardProps, Metric as SafetyCardMetric };
