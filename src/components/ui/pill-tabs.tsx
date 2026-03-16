"use client";

import { cn } from "@/lib/utils";

interface PillTabsProps {
  items: string[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function PillTabs({ items, value, onChange, className }: PillTabsProps) {
  return (
    <div
      className={cn(
        "flex gap-2 overflow-x-auto scrollbar-none",
        className
      )}
    >
      {items.map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => onChange(item)}
          className={cn(
            "shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
            value === item
              ? "bg-accent text-white"
              : "bg-secondary text-muted-foreground hover:bg-secondary/80"
          )}
        >
          {item}
        </button>
      ))}
    </div>
  );
}
