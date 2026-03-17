"use client";

import { cn } from "@/lib/utils";

interface LayerOption {
  id: string;
  label: string;
}

interface LayerSwitcherProps {
  options: LayerOption[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
}

/**
 * Segmented button group for switching map layers.
 * Adapted from ruixenui/segmented-button-group (21st.dev).
 * Forest green active state, compact size, rounded-full pill shape.
 */
export function LayerSwitcher({
  options,
  activeId,
  onChange,
  className,
}: LayerSwitcherProps) {
  return (
    <div
      className={cn(
        "inline-flex rounded-full border border-border bg-card/95 p-0.5 backdrop-blur-sm",
        className
      )}
    >
      {options.map((option, idx) => {
        const isFirst = idx === 0;
        const isLast = idx === options.length - 1;
        const isActive = option.id === activeId;

        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={cn(
              "px-3 py-1 text-xs font-medium transition-colors",
              isFirst && "rounded-l-full",
              isLast && "rounded-r-full",
              !isFirst && !isLast && "rounded-none",
              isFirst && isLast && "rounded-full",
              isActive
                ? "bg-accent text-white"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
