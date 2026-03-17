"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface ConditionsGridProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Bento-grid wrapper for safety condition cards.
 * Adapted from kokonutd/bento-grid (21st.dev).
 * Key cards (Avalanche, Weather) span 2 columns on desktop.
 * 6-column grid on lg, 2 columns on sm, 1 on mobile.
 * data-testid="safety-cards-grid" is required by smoke tests.
 */
export function ConditionsGrid({ children, className }: ConditionsGridProps) {
  // Map children to assign bento spanning classes
  const items = React.Children.toArray(children);

  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold text-foreground">
        Conditions
      </h2>
      <div
        data-testid="safety-cards-grid"
        className={cn(
          "grid grid-cols-1 gap-0 rounded-2xl border border-border overflow-hidden",
          "sm:grid-cols-2 lg:grid-cols-6",
          className
        )}
      >
        {items.map((child, idx) => {
          // Key cards (avalanche = idx 2, weather/NWS = idx 1) span 2 cols
          const isKeyCard = idx === 1 || idx === 2;
          return (
            <div
              key={idx}
              className={cn(
                "relative overflow-hidden border-b border-r border-border last:border-b-0",
                "sm:[&:nth-last-child(-n+2)]:border-b-0",
                "lg:[&:nth-last-child(-n+3)]:border-b-0",
                isKeyCard ? "lg:col-span-2" : "lg:col-span-1"
              )}
            >
              {child}
            </div>
          );
        })}
      </div>
    </div>
  );
}
