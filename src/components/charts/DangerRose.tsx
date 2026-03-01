'use client';

import { useRef, useEffect } from 'react';
import * as d3 from 'd3';
import type {
  Aspect,
  ElevationBand,
  DangerLevel,
  DangerRating,
  AvalancheProblem,
} from '@/lib/data-sources/avalanche';

interface DangerRoseProps {
  dangerRatings: DangerRating[];
  problems: AvalancheProblem[];
}

const ASPECTS: Aspect[] = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
const BANDS: ElevationBand[] = ['below_treeline', 'near_treeline', 'above_treeline'];
const BAND_LABELS: Record<ElevationBand, string> = {
  below_treeline: 'Below TL',
  near_treeline: 'Near TL',
  above_treeline: 'Above TL',
};

const DANGER_COLORS: Record<DangerLevel, string> = {
  0: '#d6d3d1', // stone-300 – No Rating
  1: '#22c55e', // green-500 – Low
  2: '#eab308', // yellow-500 – Moderate
  3: '#f97316', // orange-500 – Considerable
  4: '#ef4444', // red-500 – High
  5: '#1c1917', // stone-900 – Extreme
};

const DANGER_TEXT_COLORS: Record<DangerLevel, string> = {
  0: '#78716c',
  1: '#ffffff',
  2: '#1c1917',
  3: '#ffffff',
  4: '#ffffff',
  5: '#ffffff',
};

function buildRoseData(
  dangerRatings: DangerRating[],
  problems: AvalancheProblem[],
): Map<string, DangerLevel> {
  const cells = new Map<string, DangerLevel>();

  const ratingByBand = new Map<ElevationBand, DangerLevel>();
  for (const r of dangerRatings) {
    ratingByBand.set(r.elevation, r.level);
  }

  for (const aspect of ASPECTS) {
    for (const band of BANDS) {
      cells.set(`${aspect}-${band}`, ratingByBand.get(band) ?? 0);
    }
  }

  for (const problem of problems) {
    const affectedAspects = problem.aspects.length > 0 ? problem.aspects : ASPECTS;
    const affectedBands = problem.elevations.length > 0 ? problem.elevations : BANDS;

    for (const aspect of affectedAspects) {
      for (const band of affectedBands) {
        const key = `${aspect}-${band}`;
        const baseDanger = ratingByBand.get(band) ?? 0;
        const current = cells.get(key) ?? 0;
        cells.set(key, Math.max(current, baseDanger) as DangerLevel);
      }
    }
  }

  return cells;
}

export function DangerRose({ dangerRatings, problems }: DangerRoseProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const roseData = buildRoseData(dangerRatings, problems);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = 260;
    const height = 260;
    const margin = 32;
    const outerRadius = Math.min(width, height) / 2 - margin;
    const innerRadius = outerRadius * 0.15;

    svg.attr('viewBox', `0 0 ${width} ${height}`);

    const g = svg
      .append('g')
      .attr('transform', `translate(${width / 2}, ${height / 2})`);

    const angleSlice = (2 * Math.PI) / ASPECTS.length;
    const bandWidth = (outerRadius - innerRadius) / BANDS.length;

    for (let ai = 0; ai < ASPECTS.length; ai++) {
      const aspect = ASPECTS[ai];
      const startAngle = ai * angleSlice - Math.PI / 2 - angleSlice / 2;

      for (let bi = 0; bi < BANDS.length; bi++) {
        const band = BANDS[bi];
        const key = `${aspect}-${band}`;
        const danger = roseData.get(key) ?? 0;

        const rInner = innerRadius + bi * bandWidth;
        const rOuter = innerRadius + (bi + 1) * bandWidth;

        const arc = d3
          .arc<unknown>()
          .innerRadius(rInner)
          .outerRadius(rOuter)
          .startAngle(startAngle)
          .endAngle(startAngle + angleSlice)
          .padAngle(0.02)
          .padRadius(innerRadius);

        g.append('path')
          .attr('d', arc(null as unknown as d3.DefaultArcObject))
          .attr('fill', DANGER_COLORS[danger as DangerLevel])
          .attr('stroke', '#ffffff')
          .attr('stroke-width', 1);
      }
    }

    for (let ai = 0; ai < ASPECTS.length; ai++) {
      const angle = ai * angleSlice - Math.PI / 2;
      const labelRadius = outerRadius + 14;
      const x = Math.cos(angle) * labelRadius;
      const y = Math.sin(angle) * labelRadius;

      g.append('text')
        .attr('x', x)
        .attr('y', y)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'central')
        .attr('font-size', '10px')
        .attr('font-weight', '600')
        .attr('fill', '#78716c')
        .text(ASPECTS[ai]);
    }

    g.append('circle')
      .attr('r', innerRadius)
      .attr('fill', '#fafaf9')
      .attr('stroke', '#e7e5e4')
      .attr('stroke-width', 0.5);
  }, [roseData]);

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-medium uppercase tracking-wider text-stone-400">
        Danger Rose — Aspect × Elevation
      </p>
      <div className="flex items-start gap-3">
        <svg
          ref={svgRef}
          className="h-[260px] w-[260px] shrink-0"
          aria-label="Avalanche danger rose showing danger levels by aspect and elevation"
        />
        <div className="flex flex-col gap-1 pt-2">
          <p className="mb-1 text-[10px] font-medium text-stone-500">
            Elevation
          </p>
          {[...BANDS].reverse().map((band) => (
            <div key={band} className="flex items-center gap-1.5">
              <span className="inline-block size-2.5 rounded-sm border border-stone-200 bg-stone-100" />
              <span className="text-[10px] text-stone-500">
                {BAND_LABELS[band]}
              </span>
            </div>
          ))}
          <div className="mt-2">
            <p className="mb-1 text-[10px] font-medium text-stone-500">
              Danger
            </p>
            {([1, 2, 3, 4, 5] as DangerLevel[]).map((level) => (
              <div key={level} className="flex items-center gap-1.5">
                <span
                  className="inline-block size-2.5 rounded-sm"
                  style={{ backgroundColor: DANGER_COLORS[level] }}
                />
                <span
                  className="text-[10px]"
                  style={{ color: DANGER_TEXT_COLORS[0] }}
                >
                  {level} – {
                    ({ 1: 'Low', 2: 'Moderate', 3: 'Considerable', 4: 'High', 5: 'Extreme' } as Record<number, string>)[level]
                  }
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
