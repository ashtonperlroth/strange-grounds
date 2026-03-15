import type { NWSForecastData } from "@/lib/data-sources/nws";
import type { AvalancheData } from "@/lib/data-sources/avalanche";
import type { UsgsData } from "@/lib/data-sources/usgs";
import type { FireData } from "@/lib/data-sources/fires";
import type { SegmentConditions } from "@/lib/types/briefing";

export interface DetectedAlert {
  alertType: string;
  severity: "info" | "warning" | "critical";
  title: string;
  description: string;
  previousValue: string | null;
  currentValue: string | null;
  segmentOrder: number | null;
}

interface CurrentConditions {
  nws: NWSForecastData | null;
  avalanche: AvalancheData | null;
  usgs: UsgsData | null;
  fires: FireData | null;
  segmentConditions?: SegmentConditions[];
}

interface PreviousConditions {
  weather?: NWSForecastData | null;
  avalanche?: AvalancheData | null;
  streamFlow?: UsgsData | null;
  fires?: FireData | null;
  routeAnalysis?: {
    segments?: Array<{
      segmentOrder: number;
      hazardLevel: string;
    }>;
  } | null;
}

// ── Helpers ──────────────────────────────────────────────────────────────

function parseWindMph(windSpeed: string): number {
  const match = windSpeed.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

function getMaxWind(nws: NWSForecastData): number {
  const periods = [...nws.periods.slice(0, 4)];
  return Math.max(...periods.map((p) => parseWindMph(p.windSpeed)));
}

function getAvyDanger(avalanche: AvalancheData | null): number {
  return avalanche?.dangerLevel ?? 0;
}

const HAZARD_LEVELS = ["low", "moderate", "considerable", "high", "extreme"];
function hazardIndex(level: string): number {
  const idx = HAZARD_LEVELS.indexOf(level.toLowerCase());
  return idx >= 0 ? idx : 0;
}

// ── Main detection function ───────────────────────────────────────────────

export function detectMaterialChanges(
  current: CurrentConditions,
  previous: PreviousConditions,
): DetectedAlert[] {
  const alerts: DetectedAlert[] = [];

  // ── 1. New NWS weather alerts ─────────────────────────────────────────
  if (current.nws && current.nws.alerts.length > 0) {
    const prevAlertIds = new Set(
      (previous.weather?.alerts ?? []).map((a) => a.id),
    );
    const newAlerts = current.nws.alerts.filter((a) => !prevAlertIds.has(a.id));
    for (const alert of newAlerts) {
      alerts.push({
        alertType: "weather_alert",
        severity: alert.severity === "Extreme" ? "critical" : "warning",
        title: `New weather alert: ${alert.event}`,
        description: alert.headline,
        previousValue: null,
        currentValue: alert.event,
        segmentOrder: null,
      });
    }
  }

  // ── 2. Avalanche danger change ────────────────────────────────────────
  const prevAvyDanger = getAvyDanger(previous.avalanche ?? null);
  const currAvyDanger = getAvyDanger(current.avalanche);
  if (current.avalanche && prevAvyDanger > 0 && currAvyDanger !== prevAvyDanger) {
    const direction = currAvyDanger > prevAvyDanger ? "increased" : "decreased";
    const severity: DetectedAlert["severity"] = currAvyDanger >= 4 ? "critical" : currAvyDanger >= 3 ? "warning" : "info";
    alerts.push({
      alertType: "avalanche_change",
      severity,
      title: `Avalanche danger ${direction}`,
      description: `Danger level has ${direction} from ${prevAvyDanger} to ${currAvyDanger} on the Rose scale.`,
      previousValue: String(prevAvyDanger),
      currentValue: String(currAvyDanger),
      segmentOrder: null,
    });
  }

  // ── 3. Wind forecast change (>20mph difference at exposed segments) ───
  if (current.nws && previous.weather) {
    const prevWind = getMaxWind(previous.weather);
    const currWind = getMaxWind(current.nws);
    const windDelta = currWind - prevWind;
    if (Math.abs(windDelta) > 20) {
      const direction = windDelta > 0 ? "increased" : "decreased";
      alerts.push({
        alertType: "wind_change",
        severity: currWind > 40 ? "warning" : "info",
        title: `Wind forecast ${direction} significantly`,
        description: `Maximum forecast wind ${direction} from ${prevWind} to ${currWind} mph.`,
        previousValue: `${prevWind} mph`,
        currentValue: `${currWind} mph`,
        segmentOrder: null,
      });
    }
  }

  // ── 4. Freezing level crossed ─────────────────────────────────────────
  if (current.nws && previous.weather) {
    const prevTemps = previous.weather.periods.slice(0, 4).map((p) => p.temperature);
    const currTemps = current.nws.periods.slice(0, 4).map((p) => p.temperature);
    const prevLow = Math.min(...prevTemps);
    const currLow = Math.min(...currTemps);
    if (prevLow > 32 && currLow <= 32) {
      alerts.push({
        alertType: "temperature_below_freezing",
        severity: "warning",
        title: "Temperatures forecast to drop below freezing",
        description: `Forecast low dropped from ${prevLow}°F to ${currLow}°F.`,
        previousValue: `${prevLow}°F`,
        currentValue: `${currLow}°F`,
        segmentOrder: null,
      });
    } else if (prevLow <= 32 && currLow > 32) {
      alerts.push({
        alertType: "temperature_above_freezing",
        severity: "info",
        title: "Temperatures forecast above freezing",
        description: `Forecast low improved from ${prevLow}°F to ${currLow}°F.`,
        previousValue: `${prevLow}°F`,
        currentValue: `${currLow}°F`,
        segmentOrder: null,
      });
    }
  }

  // ── 5. Stream flow change (>50%) ──────────────────────────────────────
  if (current.usgs?.nearest && previous.streamFlow?.nearest) {
    const prevFlow = previous.streamFlow.nearest.current.dischargeCfs;
    const currFlow = current.usgs.nearest.current.dischargeCfs;
    if (prevFlow != null && currFlow != null && prevFlow > 0 && currFlow > 0) {
      const changePct = Math.abs((currFlow - prevFlow) / prevFlow) * 100;
      if (changePct > 50) {
        const direction = currFlow > prevFlow ? "risen" : "fallen";
        const severity: DetectedAlert["severity"] = currFlow > prevFlow && currFlow > 500 ? "warning" : "info";
        alerts.push({
          alertType: "stream_flow_change",
          severity,
          title: `Stream flow has ${direction} significantly`,
          description: `Flow changed from ${prevFlow.toFixed(0)} to ${currFlow.toFixed(0)} cfs (${changePct.toFixed(0)}% change).`,
          previousValue: `${prevFlow.toFixed(0)} cfs`,
          currentValue: `${currFlow.toFixed(0)} cfs`,
          segmentOrder: null,
        });
      }
    }
  }

  // ── 6. New fire within 30mi ───────────────────────────────────────────
  if (current.fires && previous.fires) {
    const prevCount = previous.fires.nearbyCount;
    const currCount = current.fires.nearbyCount;
    if (currCount > prevCount) {
      alerts.push({
        alertType: "fire_nearby",
        severity: currCount >= 3 ? "critical" : "warning",
        title: `${currCount - prevCount} new fire${currCount - prevCount > 1 ? "s" : ""} detected nearby`,
        description: `${currCount} active fire${currCount !== 1 ? "s" : ""} now within range (previously ${prevCount}).`,
        previousValue: `${prevCount} fires`,
        currentValue: `${currCount} fires`,
        segmentOrder: null,
      });
    }
  }

  // ── 7. Route segment hazard level increased by 2+ levels ─────────────
  if (current.segmentConditions && previous.routeAnalysis?.segments) {
    const prevSegMap = new Map(
      previous.routeAnalysis.segments.map((s) => [s.segmentOrder, s.hazardLevel]),
    );
    for (const seg of current.segmentConditions) {
      const prevLevel = prevSegMap.get(seg.segmentOrder);
      if (!prevLevel) continue;
      const prevIdx = hazardIndex(prevLevel);
      const currIdx = hazardIndex(seg.hazardLevel);
      if (currIdx - prevIdx >= 2) {
        alerts.push({
          alertType: "hazard_increase",
          severity: currIdx >= 3 ? "critical" : "warning",
          title: `Segment ${seg.segmentOrder} hazard increased to ${seg.hazardLevel}`,
          description: `Hazard level jumped from ${prevLevel} to ${seg.hazardLevel} on segment ${seg.segmentOrder}.`,
          previousValue: prevLevel,
          currentValue: seg.hazardLevel,
          segmentOrder: seg.segmentOrder,
        });
      }
    }
  }

  return alerts;
}
