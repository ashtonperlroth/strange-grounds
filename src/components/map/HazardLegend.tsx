'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { HAZARD_COLORS, HAZARD_LABELS } from '@/lib/routes/hazard-colors';
import type { HazardLevel } from '@/lib/types/briefing';

const LEVELS: HazardLevel[] = ['low', 'moderate', 'considerable', 'high', 'extreme'];

interface HazardLegendProps {
  visible: boolean;
}

export function HazardLegend({ visible }: HazardLegendProps) {
  const [collapsed, setCollapsed] = useState(false);

  if (!visible) return null;

  return (
    <div className="absolute bottom-3 right-3 z-20 rounded-lg border border-white/20 bg-black/75 shadow-lg backdrop-blur-sm">
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left"
        aria-expanded={!collapsed}
        aria-label="Hazard legend"
      >
        <span className="text-[10px] font-semibold uppercase tracking-wider text-white/80">
          Hazard Level
        </span>
        {collapsed ? (
          <ChevronUp className="size-3 text-white/60" />
        ) : (
          <ChevronDown className="size-3 text-white/60" />
        )}
      </button>

      {!collapsed && (
        <div className="space-y-1 px-3 pb-2.5" role="list" aria-label="Hazard levels">
          {LEVELS.map((level) => (
            <div key={level} className="flex items-center gap-2" role="listitem">
              <span
                className="inline-block h-2.5 w-5 rounded-sm"
                style={{ backgroundColor: HAZARD_COLORS[level] }}
                aria-hidden="true"
              />
              <span className="text-[11px] text-white/80">
                {HAZARD_LABELS[level]}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
