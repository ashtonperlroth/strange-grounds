// Standard environmental lapse rate: ~3.5°F per 1,000 ft (6.5°C per 1,000m)
const LAPSE_RATE_F_PER_1000FT = 3.5;

function computeWindChill(tempF: number, windMph: number): number | null {
  if (tempF > 50 || windMph < 3) return null;
  // NOAA wind chill formula
  const wc =
    35.74 +
    0.6215 * tempF -
    35.75 * Math.pow(windMph, 0.16) +
    0.4275 * tempF * Math.pow(windMph, 0.16);
  return Math.round(wc);
}

export interface ElevationWeatherPoint {
  elevationFt: number;
  label: string;
  estimatedHighF: number;
  estimatedLowF: number;
  estimatedWindChill: number | null;
  belowFreezing: boolean;
}

export interface ElevationWeatherData {
  baseElevationFt: number;
  estimates: ElevationWeatherPoint[];
  freezingLevelFt: number | null;
}

/**
 * Compute temperature estimates at target elevations using the standard
 * atmospheric lapse rate. The base temperature should come from an NWS
 * forecast at the lowest point of the route (trailhead).
 */
export function computeLapseRateEstimates(
  baseElevationFt: number,
  baseHighF: number,
  baseLowF: number,
  baseWindMph: number | null,
  targetElevations: Array<{ ft: number; label: string }>,
): ElevationWeatherData {
  const estimates = targetElevations.map(({ ft, label }) => {
    const deltaFt = ft - baseElevationFt;
    const tempAdjust = (deltaFt / 1000) * LAPSE_RATE_F_PER_1000FT;
    const high = Math.round(baseHighF - tempAdjust);
    const low = Math.round(baseLowF - tempAdjust);
    // Wind speed increases modestly with elevation above base
    const windMph =
      baseWindMph != null
        ? Math.round(baseWindMph * (1 + (deltaFt / 10_000) * 0.5))
        : null;
    const windChill = windMph != null ? computeWindChill(low, windMph) : null;

    return {
      elevationFt: ft,
      label,
      estimatedHighF: high,
      estimatedLowF: low,
      estimatedWindChill: windChill,
      belowFreezing: low <= 32,
    };
  });

  // Freezing level: elevation where the estimated low reaches 32°F
  // baseLowF - (deltaFt / 1000) * 3.5 = 32  =>  deltaFt = (baseLowF - 32) / 3.5 * 1000
  let freezingLevelFt: number | null = null;
  if (baseLowF > 32) {
    freezingLevelFt = Math.round(
      baseElevationFt + ((baseLowF - 32) / LAPSE_RATE_F_PER_1000FT) * 1000,
    );
  }

  return { baseElevationFt, estimates, freezingLevelFt };
}
