"use client";

import { cn } from "@/lib/utils";

interface ActivityToggleProps {
  items: readonly string[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  testIdPrefix?: string;
}

/**
 * Horizontal single-select pill toggle group for activity types.
 * Sourced from 21st.dev "Tabs Pills" pattern,
 * adapted to Strange Grounds design system.
 */
export function ActivityToggle({
  items,
  value,
  onChange,
  className,
  testIdPrefix,
}: ActivityToggleProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-center gap-2",
        className
      )}
      role="radiogroup"
      aria-label="Activity type"
    >
      {items.map((item) => (
        <button
          key={item}
          type="button"
          role="radio"
          aria-checked={value === item}
          data-testid={testIdPrefix ? `${testIdPrefix}${item.toLowerCase().replace(/\s+/g, "-")}` : undefined}
          onClick={() => onChange(item)}
          className={cn(
            "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
            value === item
              ? "bg-foreground text-primary-foreground"
              : "bg-white/80 text-muted-foreground hover:bg-white hover:text-foreground"
          )}
        >
          {item}
        </button>
      ))}
    </div>
  );
}
