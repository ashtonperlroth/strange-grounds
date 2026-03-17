"use client";

import { cn } from "@/lib/utils";

interface LayerSwitcherProps {
  layers: readonly string[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

/**
 * Compact segmented control for map layer switching.
 * Sourced from 21st.dev "Switch / Segmented Control" pattern,
 * adapted to Strange Grounds design system without extra dependencies.
 */
export function LayerSwitcher({
  layers,
  value,
  onChange,
  className,
}: LayerSwitcherProps) {
  return (
    <div
      className={cn(
        "inline-flex h-8 rounded-md border border-border bg-secondary p-0.5",
        className
      )}
      role="radiogroup"
      aria-label="Map layer"
    >
      {layers.map((layer) => (
        <button
          key={layer}
          type="button"
          role="radio"
          aria-checked={value === layer}
          onClick={() => onChange(layer)}
          className={cn(
            "rounded-[5px] px-3 text-xs font-medium transition-colors",
            value === layer
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {layer}
        </button>
      ))}
    </div>
  );
}
