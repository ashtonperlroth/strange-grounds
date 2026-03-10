import type { HazardLevel } from '@/lib/types/briefing';

export const HAZARD_COLORS: Record<HazardLevel, string> = {
  low: '#22c55e',
  moderate: '#eab308',
  considerable: '#f97316',
  high: '#ef4444',
  extreme: '#991b1b',
};

export const HAZARD_LABELS: Record<HazardLevel, string> = {
  low: 'Low',
  moderate: 'Moderate',
  considerable: 'Considerable',
  high: 'High',
  extreme: 'Extreme',
};

export const HAZARD_MARKER_ICONS: Partial<Record<HazardLevel, string>> = {
  considerable: '⚠️',
  high: '🔴',
  extreme: '☠️',
};

export function hazardLevelIndex(level: HazardLevel): number {
  const order: HazardLevel[] = ['low', 'moderate', 'considerable', 'high', 'extreme'];
  return order.indexOf(level);
}

export function computeRouteScore(distribution: Record<HazardLevel, number>): number {
  const total = Object.values(distribution).reduce((a, b) => a + b, 0);
  if (total === 0) return 10;

  const weights: Record<HazardLevel, number> = {
    low: 0,
    moderate: 1,
    considerable: 3,
    high: 6,
    extreme: 10,
  };

  let weightedSum = 0;
  for (const [level, count] of Object.entries(distribution) as [HazardLevel, number][]) {
    weightedSum += weights[level] * count;
  }

  const maxPenalty = 10 * total;
  const penalty = weightedSum / maxPenalty;
  return Math.max(1, Math.round(10 - penalty * 9));
}
