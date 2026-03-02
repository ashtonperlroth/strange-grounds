import SunCalc from "suncalc";
import { find as findTimezone } from "geo-tz";
import type { DaylightData } from "@/lib/synthesis/conditions";

export interface DaylightOptions {
  lat: number;
  lng: number;
  date: Date;
}

function formatTime(date: Date, timeZone: string): string {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  });
}

export function computeDaylight({ lat, lng, date }: DaylightOptions): DaylightData {
  const times = SunCalc.getTimes(date, lat, lng);
  const timeZone = findTimezone(lat, lng)[0] ?? "UTC";

  const daylightMs = times.sunset.getTime() - times.sunrise.getTime();
  const daylightHours = Math.round((daylightMs / (1000 * 60 * 60)) * 100) / 100;

  return {
    source: "suncalc" as const,
    sunrise: formatTime(times.sunrise, timeZone),
    sunset: formatTime(times.sunset, timeZone),
    daylightHours,
    goldenHourStart: formatTime(times.goldenHour, timeZone),
    goldenHourEnd: formatTime(times.sunset, timeZone),
    civilDawn: formatTime(times.dawn, timeZone),
    civilDusk: formatTime(times.dusk, timeZone),
    timeZone,
  };
}
