import type { NWSForecastData, NWSForecastPeriod } from "@/lib/data-sources/nws";
import type { AvalancheData } from "@/lib/data-sources/avalanche";
import type { SnotelData } from "@/lib/data-sources/snotel";
import type { UsgsData } from "@/lib/data-sources/usgs";
import type { FireData } from "@/lib/data-sources/fires";
import type {
  ConditionStatus,
  ConditionCategory,
  ConditionCardData,
} from "@/stores/briefing-store";

// ── Aggregated conditions from all data sources ─────────────────────

export interface DaylightData {
  source: "suncalc";
  sunrise: string;
  sunset: string;
  daylightHours: number;
  goldenHourStart: string;
  goldenHourEnd: string;
  civilDawn?: string;
  civilDusk?: string;
  timeZone?: string;
}

export interface ConditionsBundle {
  weather: NWSForecastData | null;
  snowpack: SnotelData | null;
  avalanche: AvalancheData | null;
  streamFlow: UsgsData | null;
  fires: FireData | null;
  daylight: DaylightData | null;
}

export type Readiness = "green" | "yellow" | "red";

// ── Per-card status thresholds ──────────────────────────────────────

function parseWindMph(windSpeed: string): number {
  const match = windSpeed.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

function getMaxPrecip(periods: NWSForecastPeriod[]): number {
  if (!periods.length) return 0;
  return Math.max(...periods.map((p) => p.probabilityOfPrecipitation?.value ?? 0));
}

function getMaxWind(periods: NWSForecastPeriod[]): number {
  if (!periods.length) return 0;
  return Math.max(...periods.map((p) => parseWindMph(p.windSpeed)));
}

export function computeWeatherStatus(data: NWSForecastData | null): ConditionStatus {
  if (!data || !data.periods.length) return "unknown";
  if (data.alerts.length > 0) return "concern";
  const maxPrecip = getMaxPrecip(data.periods);
  const maxWind = getMaxWind(data.periods);
  if (maxPrecip > 60 || maxWind > 30) return "caution";
  return "good";
}

export function computeAvalancheStatus(data: AvalancheData | null): ConditionStatus {
  if (!data) return "unknown";
  if (data.dangerLevel >= 4) return "concern";
  if (data.dangerLevel >= 3) return "caution";
  if (data.dangerLevel >= 1) return "good";
  return "unknown";
}

export function computeSnowpackStatus(data: SnotelData | null): ConditionStatus {
  if (!data) return "unknown";
  const { percentOfNormal } = data.summary;
  if (percentOfNormal !== null) {
    if (percentOfNormal >= 80) return "good";
    if (percentOfNormal >= 50) return "caution";
    return "concern";
  }
  if (data.stations.length > 0 && data.nearest?.latest.snowDepthIn !== null) {
    return "good";
  }
  return "unknown";
}

export function computeStreamStatus(data: UsgsData | null): ConditionStatus {
  if (!data || data.stations.length === 0) return "unknown";
  const { maxPercentOfMedian } = data.summary;
  if (maxPercentOfMedian !== null) {
    if (maxPercentOfMedian <= 120) return "good";
    if (maxPercentOfMedian <= 180) return "caution";
    return "concern";
  }
  if (data.nearest?.current.dischargeCfs !== null) return "good";
  return "unknown";
}

export function computeFireStatus(data: FireData | null): ConditionStatus {
  if (!data) return "unknown";
  if (data.nearbyCount === 0) return "good";
  if (data.nearbyCount <= 2) return "caution";
  return "concern";
}

export function computeDaylightStatus(data: DaylightData | null): ConditionStatus {
  if (!data) return "unknown";
  if (data.daylightHours >= 12) return "good";
  if (data.daylightHours >= 9) return "caution";
  return "concern";
}

// ── Card status dispatcher ──────────────────────────────────────────

export function computeCardStatus(
  category: ConditionCategory,
  conditions: ConditionsBundle,
): ConditionStatus {
  switch (category) {
    case "weather":
      return computeWeatherStatus(conditions.weather);
    case "avalanche":
      return computeAvalancheStatus(conditions.avalanche);
    case "snowpack":
      return computeSnowpackStatus(conditions.snowpack);
    case "stream_crossings":
      return computeStreamStatus(conditions.streamFlow);
    case "fires":
      return computeFireStatus(conditions.fires);
    case "daylight":
      return computeDaylightStatus(conditions.daylight);
    default:
      return "unknown";
  }
}

// ── Build all condition cards ───────────────────────────────────────

function weatherSummary(data: NWSForecastData): string {
  const periods = data.periods.slice(0, 4);
  if (!periods.length) return "No forecast data";
  const temps = periods.map((p) => p.temperature);
  const high = Math.max(...temps);
  const low = Math.min(...temps);
  const first = data.periods[0];
  const parts = [`${high}°/${low}°F`];
  if (first) parts.push(first.shortForecast);
  if (data.alerts.length > 0) parts.push(`${data.alerts.length} alert(s)`);
  return parts.join(" · ");
}

function avalancheSummary(data: AvalancheData): string {
  const parts = [`${data.dangerLabel} (${data.dangerLevel}/5)`];
  if (data.problems.length > 0) {
    parts.push(data.problems.slice(0, 2).map((p) => p.name).join(", "));
  }
  return parts.join(" · ");
}

function snowpackSummary(data: SnotelData): string {
  const { avgSnowDepthIn, percentOfNormal } = data.summary;
  const parts: string[] = [];
  if (avgSnowDepthIn !== null) parts.push(`${Math.round(avgSnowDepthIn)}" depth`);
  if (percentOfNormal !== null) parts.push(`${Math.round(percentOfNormal)}% of normal`);
  return parts.length > 0 ? parts.join(", ") : "No data available";
}

function streamSummary(data: UsgsData): string {
  const { maxPercentOfMedian, gaugeCount } = data.summary;
  if (gaugeCount === 0) return "No gauges nearby";
  const flow = maxPercentOfMedian !== null
    ? maxPercentOfMedian > 180
      ? "High flows"
      : maxPercentOfMedian > 120
        ? "Elevated flows"
        : "Normal flows"
    : "Flow data available";
  return `${flow} · ${gaugeCount} gauge${gaugeCount !== 1 ? "s" : ""}`;
}

function formatDaylightDuration(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function daylightSummary(data: DaylightData): string {
  return `${formatDaylightDuration(data.daylightHours)} daylight · Sunrise ${data.sunrise} · Sunset ${data.sunset}`;
}

function fireSummary(data: FireData): string {
  if (data.nearbyCount === 0) return "No active fires within 50 miles";
  const fireNames = data.fires.slice(0, 3).map((f) => {
    const acres = f.acres !== null ? `${Math.round(f.acres).toLocaleString()} acres` : "size unknown";
    return `${f.name} (${acres})`;
  });
  return `${data.nearbyCount} fire${data.nearbyCount !== 1 ? "s" : ""} nearby · ${fireNames.join(", ")}`;
}

const NO_DATA = "No data available";
const UNAVAILABLE_SUMMARY = "Data temporarily unavailable";
const UNAVAILABLE_DETAIL =
  "This data source did not respond. Try regenerating the briefing.";

const SOURCE_TO_CATEGORY: Record<string, ConditionCategory> = {
  NWS: "weather",
  SNOTEL: "snowpack",
  Avalanche: "avalanche",
  USGS: "stream_crossings",
  Fires: "fires",
  Daylight: "daylight",
};

function isUnavailable(
  category: ConditionCategory,
  unavailableSources: string[],
): boolean {
  return unavailableSources.some(
    (s) => SOURCE_TO_CATEGORY[s] === category,
  );
}

export function buildConditionCards(
  conditions: ConditionsBundle,
  unavailableSources: string[] = [],
): ConditionCardData[] {
  const cards: ConditionCardData[] = [];

  const weatherUnavailable =
    !conditions.weather && isUnavailable("weather", unavailableSources);
  cards.push({
    category: "weather",
    status: weatherUnavailable ? "unavailable" : computeWeatherStatus(conditions.weather),
    summary: weatherUnavailable
      ? UNAVAILABLE_SUMMARY
      : conditions.weather
        ? weatherSummary(conditions.weather)
        : NO_DATA,
    ...(weatherUnavailable && { detail: UNAVAILABLE_DETAIL }),
  });

  const avyUnavailable =
    !conditions.avalanche && isUnavailable("avalanche", unavailableSources);
  if (conditions.avalanche) {
    cards.push({
      category: "avalanche",
      status: computeAvalancheStatus(conditions.avalanche),
      summary: avalancheSummary(conditions.avalanche),
    });
  } else if (avyUnavailable) {
    cards.push({
      category: "avalanche",
      status: "unavailable",
      summary: UNAVAILABLE_SUMMARY,
      detail: UNAVAILABLE_DETAIL,
    });
  }

  const snowUnavailable =
    !conditions.snowpack && isUnavailable("snowpack", unavailableSources);
  cards.push({
    category: "snowpack",
    status: snowUnavailable ? "unavailable" : computeSnowpackStatus(conditions.snowpack),
    summary: snowUnavailable
      ? UNAVAILABLE_SUMMARY
      : conditions.snowpack
        ? snowpackSummary(conditions.snowpack)
        : NO_DATA,
    ...(snowUnavailable && { detail: UNAVAILABLE_DETAIL }),
  });

  const streamUnavailable =
    !conditions.streamFlow && isUnavailable("stream_crossings", unavailableSources);
  cards.push({
    category: "stream_crossings",
    status: streamUnavailable ? "unavailable" : computeStreamStatus(conditions.streamFlow),
    summary: streamUnavailable
      ? UNAVAILABLE_SUMMARY
      : conditions.streamFlow
        ? streamSummary(conditions.streamFlow)
        : NO_DATA,
    ...(streamUnavailable && { detail: UNAVAILABLE_DETAIL }),
  });

  const firesUnavailable =
    !conditions.fires && isUnavailable("fires", unavailableSources);
  cards.push({
    category: "fires",
    status: firesUnavailable ? "unavailable" : computeFireStatus(conditions.fires),
    summary: firesUnavailable
      ? UNAVAILABLE_SUMMARY
      : conditions.fires
        ? fireSummary(conditions.fires)
        : NO_DATA,
    ...(firesUnavailable && { detail: UNAVAILABLE_DETAIL }),
  });

  const daylightUnavailable =
    !conditions.daylight && isUnavailable("daylight", unavailableSources);
  cards.push({
    category: "daylight",
    status: daylightUnavailable ? "unavailable" : computeDaylightStatus(conditions.daylight),
    summary: daylightUnavailable
      ? UNAVAILABLE_SUMMARY
      : conditions.daylight
        ? daylightSummary(conditions.daylight)
        : NO_DATA,
    ...(daylightUnavailable && { detail: UNAVAILABLE_DETAIL }),
  });

  return cards;
}

// ── Readiness aggregation ───────────────────────────────────────────

const STATUS_SEVERITY: Record<ConditionStatus, number> = {
  good: 0,
  unknown: 1,
  unavailable: 1,
  caution: 2,
  concern: 3,
};

export function computeReadiness(conditions: ConditionsBundle): Readiness {
  const cards = buildConditionCards(conditions);
  const maxSeverity = Math.max(...cards.map((c) => STATUS_SEVERITY[c.status]));

  if (maxSeverity >= STATUS_SEVERITY.concern) return "red";
  if (maxSeverity >= STATUS_SEVERITY.caution) return "yellow";
  return "green";
}
