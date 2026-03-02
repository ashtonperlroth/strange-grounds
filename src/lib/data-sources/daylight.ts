import SunCalc from "suncalc";

// ── Types ──────────────────────────────────────────────────────────────

export interface DaylightDay {
  date: string;
  sunrise: string;
  sunset: string;
  solarNoon: string;
  civilTwilightStart: string;
  civilTwilightEnd: string;
  goldenHourStart: string;
  goldenHourEnd: string;
  daylightHours: number;
  moonPhase: number;
  moonPhaseName: string;
  moonIllumination: number;
}

export interface DaylightData {
  source: "suncalc";
  lat: number;
  lng: number;
  days: DaylightDay[];
}

// ── Helpers ─────────────────────────────────────────────────────────────

/**
 * Approximate local solar time offset from longitude.
 * Each 15° of longitude ≈ 1 hour from UTC. This is the standard
 * approximation for sunrise/sunset when no IANA timezone is available.
 */
function solarOffsetMs(lng: number): number {
  return Math.round(lng / 15) * 3_600_000;
}

function formatTime(date: Date, offsetMs: number): string {
  if (isNaN(date.getTime())) return "—";
  const local = new Date(date.getTime() + offsetMs);
  const h = local.getUTCHours();
  const m = local.getUTCMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${m.toString().padStart(2, "0")} ${ampm}`;
}

function formatDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function diffHours(a: Date, b: Date): number {
  if (isNaN(a.getTime()) || isNaN(b.getTime())) return 0;
  return Math.round(((b.getTime() - a.getTime()) / 3_600_000) * 100) / 100;
}

/**
 * Moon phase ranges (0–1 cycle):
 *   0.00        New Moon
 *   0.00–0.25   Waxing Crescent
 *   0.25        First Quarter
 *   0.25–0.50   Waxing Gibbous
 *   0.50        Full Moon
 *   0.50–0.75   Waning Gibbous
 *   0.75        Last Quarter
 *   0.75–1.00   Waning Crescent
 */
function moonPhaseName(phase: number): string {
  if (phase < 0.03 || phase >= 0.97) return "New Moon";
  if (phase < 0.22) return "Waxing Crescent";
  if (phase < 0.28) return "First Quarter";
  if (phase < 0.47) return "Waxing Gibbous";
  if (phase < 0.53) return "Full Moon";
  if (phase < 0.72) return "Waning Gibbous";
  if (phase < 0.78) return "Last Quarter";
  return "Waning Crescent";
}

// ── Public API ──────────────────────────────────────────────────────────

export function computeDaylight(
  lat: number,
  lng: number,
  dates: Date[],
): DaylightData {
  const offset = solarOffsetMs(lng);

  const days: DaylightDay[] = dates.map((date) => {
    const times = SunCalc.getTimes(date, lat, lng);
    const moon = SunCalc.getMoonIllumination(date);

    return {
      date: formatDateKey(date),
      sunrise: formatTime(times.sunrise, offset),
      sunset: formatTime(times.sunset, offset),
      solarNoon: formatTime(times.solarNoon, offset),
      civilTwilightStart: formatTime(times.dawn, offset),
      civilTwilightEnd: formatTime(times.dusk, offset),
      goldenHourStart: formatTime(times.goldenHour, offset),
      goldenHourEnd: formatTime(times.goldenHourEnd, offset),
      daylightHours: diffHours(times.sunrise, times.sunset),
      moonPhase: moon.phase,
      moonPhaseName: moonPhaseName(moon.phase),
      moonIllumination: Math.round(moon.fraction * 100),
    };
  });

  return { source: "suncalc", lat, lng, days };
}
