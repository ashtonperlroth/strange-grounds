import { classifyNdsi, type NdsiClassification } from "./sentinel2-ndsi";

// ── Types ──────────────────────────────────────────────────────────────

export interface SnowlineEstimate {
  /** Estimated snowline elevation in meters */
  elevationM: number;
  /** Estimated snowline elevation in feet */
  elevationFt: number;
  /** Dominant aspect direction at the snowline ("N", "NE", etc.) */
  aspect: string | null;
  /** Confidence: 'high' if clear transition, 'medium' if gradual, 'low' if sparse data */
  confidence: "high" | "medium" | "low";
  /** Snow coverage percentage above the estimated snowline */
  snowAbovePercent: number;
  /** Snow coverage percentage below the estimated snowline */
  snowBelowPercent: number;
}

export interface ElevationBand {
  elevationM: number;
  totalPixels: number;
  snowPixels: number;
  mixedPixels: number;
  snowPercent: number;
}

// ── Constants ──────────────────────────────────────────────────────────

const BAND_SIZE_M = 50;
const MIN_PIXELS_PER_BAND = 10;
const METERS_TO_FEET = 3.28084;

// ── Helpers ───────────────────────────────────────────────────────────

function aspectToCardinal(degrees: number): string {
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const index = Math.round(degrees / 45) % 8;
  return directions[index];
}

/**
 * Build elevation bands from paired NDSI + DEM data, then find the
 * elevation where snow coverage transitions from <50% to >50%.
 */
export function estimateSnowline(
  ndsiValues: Float32Array,
  elevations: Float32Array,
  width: number,
  height: number,
  aspects?: Float32Array,
): SnowlineEstimate | null {
  if (ndsiValues.length !== elevations.length) return null;
  if (ndsiValues.length === 0) return null;

  const pixelCount = width * height;
  let minElev = Infinity;
  let maxElev = -Infinity;

  for (let i = 0; i < pixelCount; i++) {
    const elev = elevations[i];
    if (!isFinite(elev) || elev <= 0) continue;
    if (elev < minElev) minElev = elev;
    if (elev > maxElev) maxElev = elev;
  }

  if (!isFinite(minElev) || !isFinite(maxElev)) return null;
  if (maxElev - minElev < 100) return null;

  const bandCount = Math.ceil((maxElev - minElev) / BAND_SIZE_M);
  const bands: ElevationBand[] = [];

  for (let b = 0; b < bandCount; b++) {
    const bandElev = minElev + b * BAND_SIZE_M;
    const bandTop = bandElev + BAND_SIZE_M;
    let total = 0;
    let snow = 0;
    let mixed = 0;

    for (let i = 0; i < pixelCount; i++) {
      const elev = elevations[i];
      if (!isFinite(elev) || elev <= 0) continue;
      if (elev < bandElev || elev >= bandTop) continue;

      const ndsi = ndsiValues[i];
      if (ndsi < -1.5) continue;

      total++;
      const cls: NdsiClassification = classifyNdsi(ndsi);
      if (cls === "snow") snow++;
      else if (cls === "mixed") mixed++;
    }

    bands.push({
      elevationM: bandElev + BAND_SIZE_M / 2,
      totalPixels: total,
      snowPixels: snow,
      mixedPixels: mixed,
      snowPercent: total >= MIN_PIXELS_PER_BAND ? (snow / total) * 100 : -1,
    });
  }

  const validBands = bands.filter(
    (b) => b.totalPixels >= MIN_PIXELS_PER_BAND,
  );

  if (validBands.length < 3) return null;

  // Find the elevation where snow coverage crosses 50% (ascending)
  let transitionIndex = -1;
  for (let i = 1; i < validBands.length; i++) {
    const prev = validBands[i - 1];
    const curr = validBands[i];
    if (prev.snowPercent < 50 && curr.snowPercent >= 50) {
      transitionIndex = i;
      break;
    }
  }

  // If no clear transition, find the band closest to 50%
  if (transitionIndex === -1) {
    let minDiff = Infinity;
    for (let i = 0; i < validBands.length; i++) {
      const diff = Math.abs(validBands[i].snowPercent - 50);
      if (diff < minDiff) {
        minDiff = diff;
        transitionIndex = i;
      }
    }
  }

  if (transitionIndex === -1) return null;

  const snowlineElev = validBands[transitionIndex].elevationM;

  // Compute above/below stats
  let aboveSnow = 0;
  let aboveTotal = 0;
  let belowSnow = 0;
  let belowTotal = 0;

  for (const band of validBands) {
    if (band.elevationM >= snowlineElev) {
      aboveSnow += band.snowPixels;
      aboveTotal += band.totalPixels;
    } else {
      belowSnow += band.snowPixels;
      belowTotal += band.totalPixels;
    }
  }

  // Determine dominant aspect at the snowline band
  let dominantAspect: string | null = null;
  if (aspects) {
    const transitionBand = validBands[transitionIndex];
    const bandBottom = transitionBand.elevationM - BAND_SIZE_M / 2;
    const bandTop = transitionBand.elevationM + BAND_SIZE_M / 2;
    const aspectCounts = new Float64Array(8);

    for (let i = 0; i < pixelCount; i++) {
      const elev = elevations[i];
      if (!isFinite(elev) || elev < bandBottom || elev >= bandTop) continue;
      const ndsi = ndsiValues[i];
      if (ndsi < -1.5) continue;
      const cls = classifyNdsi(ndsi);
      if (cls !== "snow" && cls !== "mixed") continue;

      const aspectDeg = aspects[i];
      if (!isFinite(aspectDeg)) continue;
      const bin = Math.round(aspectDeg / 45) % 8;
      aspectCounts[bin]++;
    }

    let maxCount = 0;
    let maxBin = 0;
    for (let b = 0; b < 8; b++) {
      if (aspectCounts[b] > maxCount) {
        maxCount = aspectCounts[b];
        maxBin = b;
      }
    }

    if (maxCount > 0) {
      dominantAspect = aspectToCardinal(maxBin * 45);
    }
  }

  // Determine confidence
  const snowPercentAtTransition = validBands[transitionIndex].snowPercent;
  let confidence: "high" | "medium" | "low";
  if (
    transitionIndex > 0 &&
    validBands[transitionIndex - 1].snowPercent < 30 &&
    snowPercentAtTransition > 60
  ) {
    confidence = "high";
  } else if (
    Math.abs(snowPercentAtTransition - 50) < 20
  ) {
    confidence = "medium";
  } else {
    confidence = "low";
  }

  return {
    elevationM: Math.round(snowlineElev),
    elevationFt: Math.round(snowlineElev * METERS_TO_FEET),
    aspect: dominantAspect,
    confidence,
    snowAbovePercent:
      aboveTotal > 0 ? Math.round((aboveSnow / aboveTotal) * 100) : 0,
    snowBelowPercent:
      belowTotal > 0 ? Math.round((belowSnow / belowTotal) * 100) : 0,
  };
}

/**
 * Build a DEM elevation grid from a raster DEM tile (Terrarium encoding).
 * Each pixel's elevation = (R * 256 + G + B / 256) - 32768.
 */
export async function buildElevationGrid(
  demTiffBuffer: Buffer,
  targetWidth: number,
  targetHeight: number,
): Promise<Float32Array> {
  const { data, info } = await (
    await import("sharp")
  )
    .default(demTiffBuffer)
    .resize(targetWidth, targetHeight, { kernel: "cubic" })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixelCount = targetWidth * targetHeight;
  const elevations = new Float32Array(pixelCount);

  for (let i = 0; i < pixelCount; i++) {
    if (info.channels >= 3) {
      const r = data[i * info.channels];
      const g = data[i * info.channels + 1];
      const b = data[i * info.channels + 2];
      elevations[i] = r * 256 + g + b / 256 - 32768;
    } else {
      elevations[i] = data[i * info.channels];
    }
  }

  return elevations;
}

/**
 * Fetch a DEM tile covering the given bounds from AWS terrain tiles
 * and return the elevation grid resampled to the target dimensions.
 */
export async function fetchDemForBounds(
  bounds: [number, number, number, number],
  targetWidth: number,
  targetHeight: number,
): Promise<Float32Array> {
  const [west, south, east, north] = bounds;
  const centerLat = (south + north) / 2;
  const centerLng = (west + east) / 2;

  // Use zoom level 11 for ~30m resolution, suitable for snowline analysis
  const zoom = 11;
  const tileX = Math.floor(((centerLng + 180) / 360) * Math.pow(2, zoom));
  const latRad = (centerLat * Math.PI) / 180;
  const tileY = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) *
      Math.pow(2, zoom),
  );

  const url = `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${zoom}/${tileX}/${tileY}.png`;

  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) {
    throw new Error(`DEM fetch failed: ${res.status}`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  return buildElevationGrid(buffer, targetWidth, targetHeight);
}
