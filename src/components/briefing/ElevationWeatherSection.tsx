'use client';

import { Thermometer } from 'lucide-react';
import type { ElevationWeatherData } from '@/lib/utils/elevation-weather';

interface ElevationWeatherSectionProps {
  data: ElevationWeatherData;
}

function formatElevation(ft: number): string {
  return `${ft.toLocaleString()}ft`;
}

export function ElevationWeatherSection({ data }: ElevationWeatherSectionProps) {
  const { estimates, freezingLevelFt } = data;
  if (estimates.length === 0) return null;

  const highPoint = estimates[estimates.length - 1];
  const showWindChill =
    highPoint.estimatedWindChill !== null &&
    highPoint.estimatedWindChill < highPoint.estimatedLowF;

  return (
    <div className="mt-3 rounded-lg border border-sky-100 bg-sky-50/60 p-3">
      <div className="mb-2 flex items-center gap-1.5">
        <Thermometer className="size-3.5 text-sky-600" />
        <span className="text-xs font-semibold text-sky-800">
          Elevation Estimates
        </span>
        <span className="text-[10px] text-sky-500">(estimated)</span>
      </div>

      <div className="space-y-1.5">
        {estimates.map((pt) => (
          <div
            key={pt.elevationFt}
            className={`flex items-center justify-between rounded px-2 py-1 text-xs ${
              pt.belowFreezing
                ? 'bg-blue-100/70 text-blue-900'
                : 'bg-white/60 text-stone-700'
            }`}
          >
            <span className="font-medium">
              {pt.label}{' '}
              <span className="font-normal text-stone-400">
                ({formatElevation(pt.elevationFt)})
              </span>
            </span>
            <span className="shrink-0">
              {pt.estimatedHighF}° / {pt.estimatedLowF}°F
              {pt.belowFreezing && (
                <span className="ml-1 text-[10px] font-semibold text-blue-600">
                  ❄
                </span>
              )}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-2 space-y-0.5 text-[10px] text-stone-500">
        {freezingLevelFt !== null && (
          <p>
            Freezing level at approximately{' '}
            <span className="font-medium text-blue-700">
              {formatElevation(freezingLevelFt)}
            </span>
          </p>
        )}
        {showWindChill && highPoint.estimatedWindChill !== null && (
          <p>
            Wind chill at {highPoint.label}:{' '}
            <span className="font-medium text-stone-700">
              {highPoint.estimatedWindChill}°F
            </span>
          </p>
        )}
      </div>
    </div>
  );
}
