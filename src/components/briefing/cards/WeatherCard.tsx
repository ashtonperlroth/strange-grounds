'use client';

import {
  CloudSun,
  Wind,
  Droplets,
  AlertTriangle,
  Thermometer,
} from 'lucide-react';
import { ConditionCard } from '../ConditionCard';
import { type ConditionStatus } from '@/stores/briefing-store';
import type { NWSForecastData, NWSForecastPeriod } from '@/lib/data-sources/nws';

interface WeatherCardProps {
  data: NWSForecastData | null;
  unavailable?: boolean;
  children?: React.ReactNode;
}

function parseWindMph(windSpeed: string): number {
  const match = windSpeed.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

function getPrecipPercent(period: NWSForecastPeriod): number {
  return period.probabilityOfPrecipitation?.value ?? 0;
}

function getHighLow(periods: NWSForecastPeriod[]): {
  high: number | null;
  low: number | null;
} {
  if (!periods.length) return { high: null, low: null };
  const temps = periods.map((p) => p.temperature);
  return { high: Math.max(...temps), low: Math.min(...temps) };
}

function getMaxPrecip(periods: NWSForecastPeriod[]): number {
  if (!periods.length) return 0;
  return Math.max(...periods.map(getPrecipPercent));
}

function getMaxWind(periods: NWSForecastPeriod[]): number {
  if (!periods.length) return 0;
  return Math.max(...periods.map((p) => parseWindMph(p.windSpeed)));
}

function deriveStatus(data: NWSForecastData): ConditionStatus {
  if (data.alerts.length > 0) return 'concern';
  const maxPrecip = getMaxPrecip(data.periods);
  const maxWind = getMaxWind(data.periods);
  if (maxPrecip > 60 || maxWind > 30) return 'caution';
  return 'good';
}

function buildSummary(data: NWSForecastData): string {
  const { high, low } = getHighLow(data.periods.slice(0, 4));
  const maxPrecip = getMaxPrecip(data.periods.slice(0, 4));
  const parts: string[] = [];
  if (high !== null && low !== null) {
    parts.push(`${high}°/${low}°F`);
  }
  if (maxPrecip > 0) {
    parts.push(`${maxPrecip}% precip`);
  }
  const firstPeriod = data.periods[0];
  if (firstPeriod) {
    parts.push(firstPeriod.shortForecast);
  }
  return parts.join(' · ') || 'No forecast data';
}

function AlertBanner({ event, headline }: { event: string; headline: string }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-red-600" />
      <div>
        <p className="text-base font-medium text-red-700">{event}</p>
        <p className="text-sm text-red-600">{headline}</p>
      </div>
    </div>
  );
}

function PeriodRow({ period }: { period: NWSForecastPeriod }) {
  const precip = getPrecipPercent(period);

  return (
    <div className="flex items-center justify-between border-b border-stone-100 py-2 last:border-b-0">
      <div className="flex flex-col">
        <span className="text-xs font-medium text-stone-700">
          {period.name}
        </span>
        <span className="text-[11px] text-stone-500">
          {period.shortForecast}
        </span>
      </div>
      <div className="flex items-center gap-3 text-xs text-stone-600">
        <span className="flex items-center gap-1">
          <Thermometer className="size-3 text-stone-400" />
          {period.temperature}°{period.temperatureUnit}
        </span>
        {precip > 0 && (
          <span className="flex items-center gap-1">
            <Droplets className="size-3 text-blue-400" />
            {precip}%
          </span>
        )}
        <span className="flex items-center gap-1">
          <Wind className="size-3 text-stone-400" />
          {period.windSpeed}
        </span>
      </div>
    </div>
  );
}

export function WeatherCard({ data, unavailable, children }: WeatherCardProps) {
  if (!data || !data.periods.length) {
    return (
      <ConditionCard
        category="Weather"
        icon={<CloudSun className="size-4 text-sky-600" />}
        status={unavailable ? 'unavailable' : 'unknown'}
        summary={unavailable ? 'Data temporarily unavailable' : 'Weather data unavailable'}
        detail={unavailable ? 'This data source did not respond. Try regenerating the briefing.' : undefined}
      />
    );
  }

  const status = deriveStatus(data);
  const summary = buildSummary(data);

  return (
    <ConditionCard
      category="Weather"
      icon={<CloudSun className="size-4 text-sky-600" />}
      status={status}
      summary={summary}
    >
      <div className="space-y-3">
        {data.alerts.length > 0 && (
          <div className="space-y-2">
            {data.alerts.map((alert) => (
              <AlertBanner
                key={alert.id}
                event={alert.event}
                headline={alert.headline}
              />
            ))}
          </div>
        )}

        <div>
          {data.periods.slice(0, 7).map((period) => (
            <PeriodRow key={period.number} period={period} />
          ))}
        </div>

        {children}
      </div>
    </ConditionCard>
  );
}
