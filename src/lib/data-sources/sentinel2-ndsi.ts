import sharp from "sharp";

// ── Types ──────────────────────────────────────────────────────────────

export type NdsiClassification = "snow" | "mixed" | "no_snow";

export interface NdsiPixel {
  value: number;
  classification: NdsiClassification;
}

export interface NdsiResult {
  /** Classified RGBA PNG buffer for map overlay */
  pngBuffer: Buffer;
  /** Image width in pixels */
  width: number;
  /** Image height in pixels */
  height: number;
  /** Geographic bounds [west, south, east, north] */
  bounds: [number, number, number, number];
  /** Raw NDSI float values per pixel (row-major) */
  rawValues: Float32Array;
  /** Pixel counts by classification */
  stats: {
    snowPixels: number;
    mixedPixels: number;
    noSnowPixels: number;
    noDataPixels: number;
    totalPixels: number;
  };
}

// ── Constants ──────────────────────────────────────────────────────────

const NDSI_SNOW_THRESHOLD = 0.4;
const NDSI_MIXED_THRESHOLD = 0.2;

// ── Classification ────────────────────────────────────────────────────

export function classifyNdsi(value: number): NdsiClassification {
  if (value > NDSI_SNOW_THRESHOLD) return "snow";
  if (value >= NDSI_MIXED_THRESHOLD) return "mixed";
  return "no_snow";
}

function colorForClassification(
  classification: NdsiClassification,
): [number, number, number, number] {
  switch (classification) {
    case "snow":
      return [255, 255, 255, 153]; // white, 60% opacity
    case "mixed":
      return [173, 216, 230, 102]; // light blue, 40% opacity
    case "no_snow":
      return [0, 0, 0, 0]; // transparent
  }
}

// ── NDSI Computation ──────────────────────────────────────────────────

/**
 * Compute NDSI from a single-band FLOAT32 TIFF produced by the Sentinel Hub
 * Process API evalscript: NDSI = (B03 - B11) / (B03 + B11).
 *
 * The evalscript already outputs the NDSI value per pixel, so we just need to
 * classify and colorize.
 */
export async function computeNdsiFromTiff(
  tiffBuffer: Buffer,
  bounds: [number, number, number, number],
): Promise<NdsiResult> {
  const image = sharp(tiffBuffer);
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });

  const w = info.width;
  const h = info.height;
  const pixelCount = w * h;
  const bytesPerPixel = data.length / (pixelCount * info.channels);
  const isFloat = bytesPerPixel === 4;

  const rawValues = new Float32Array(pixelCount);
  const rgba = Buffer.alloc(pixelCount * 4);

  let snowPixels = 0;
  let mixedPixels = 0;
  let noSnowPixels = 0;
  let noDataPixels = 0;

  for (let i = 0; i < pixelCount; i++) {
    let value: number;
    if (isFloat) {
      value = data.readFloatLE(i * 4);
    } else {
      value = (data[i] / 127.5) - 1;
    }

    rawValues[i] = value;

    if (value < -1.5) {
      noDataPixels++;
      rgba[i * 4] = 0;
      rgba[i * 4 + 1] = 0;
      rgba[i * 4 + 2] = 0;
      rgba[i * 4 + 3] = 0;
      continue;
    }

    const classification = classifyNdsi(value);
    const [r, g, b, a] = colorForClassification(classification);

    rgba[i * 4] = r;
    rgba[i * 4 + 1] = g;
    rgba[i * 4 + 2] = b;
    rgba[i * 4 + 3] = a;

    switch (classification) {
      case "snow":
        snowPixels++;
        break;
      case "mixed":
        mixedPixels++;
        break;
      case "no_snow":
        noSnowPixels++;
        break;
    }
  }

  const pngBuffer = await sharp(rgba, {
    raw: { width: w, height: h, channels: 4 },
  })
    .png({ compressionLevel: 6 })
    .toBuffer();

  return {
    pngBuffer,
    width: w,
    height: h,
    bounds,
    rawValues,
    stats: {
      snowPixels,
      mixedPixels,
      noSnowPixels,
      noDataPixels,
      totalPixels: pixelCount,
    },
  };
}

/**
 * Compute NDSI per-pixel from raw B03 (Green) and B11 (SWIR) band buffers.
 * B11 (20m native) is resampled to match B03 (10m) resolution via bilinear
 * interpolation before computing the index.
 */
export async function computeNdsiFromBands(
  b03Buffer: Buffer,
  b11Buffer: Buffer,
  b03Width: number,
  b03Height: number,
  bounds: [number, number, number, number],
): Promise<NdsiResult> {
  const b03Image = sharp(b03Buffer);
  const b03Raw = await b03Image.raw().toBuffer({ resolveWithObject: true });

  let b11Resampled: Buffer;
  const b11Image = sharp(b11Buffer);
  const b11Meta = await b11Image.metadata();

  if (b11Meta.width !== b03Width || b11Meta.height !== b03Height) {
    const resized = await b11Image
      .resize(b03Width, b03Height, { kernel: sharp.kernel.cubic })
      .raw()
      .toBuffer({ resolveWithObject: true });
    b11Resampled = resized.data;
  } else {
    const raw = await b11Image.raw().toBuffer({ resolveWithObject: true });
    b11Resampled = raw.data;
  }

  const pixelCount = b03Width * b03Height;
  const rawValues = new Float32Array(pixelCount);
  const rgba = Buffer.alloc(pixelCount * 4);

  let snowPixels = 0;
  let mixedPixels = 0;
  let noSnowPixels = 0;
  let noDataPixels = 0;

  const b03IsFloat = b03Raw.data.length / (pixelCount * b03Raw.info.channels) === 4;

  for (let i = 0; i < pixelCount; i++) {
    let green: number;
    let swir: number;

    if (b03IsFloat) {
      green = b03Raw.data.readFloatLE(i * 4);
      swir = b11Resampled.readFloatLE(i * 4);
    } else {
      green = b03Raw.data[i] / 10000;
      swir = b11Resampled[i] / 10000;
    }

    const sum = green + swir;
    if (sum === 0) {
      rawValues[i] = -2;
      noDataPixels++;
      rgba[i * 4] = 0;
      rgba[i * 4 + 1] = 0;
      rgba[i * 4 + 2] = 0;
      rgba[i * 4 + 3] = 0;
      continue;
    }

    const ndsi = (green - swir) / sum;
    rawValues[i] = ndsi;

    const classification = classifyNdsi(ndsi);
    const [r, g, b, a] = colorForClassification(classification);

    rgba[i * 4] = r;
    rgba[i * 4 + 1] = g;
    rgba[i * 4 + 2] = b;
    rgba[i * 4 + 3] = a;

    switch (classification) {
      case "snow":
        snowPixels++;
        break;
      case "mixed":
        mixedPixels++;
        break;
      case "no_snow":
        noSnowPixels++;
        break;
    }
  }

  const pngBuffer = await sharp(rgba, {
    raw: { width: b03Width, height: b03Height, channels: 4 },
  })
    .png({ compressionLevel: 6 })
    .toBuffer();

  return {
    pngBuffer,
    width: b03Width,
    height: b03Height,
    bounds,
    rawValues,
    stats: {
      snowPixels,
      mixedPixels,
      noSnowPixels,
      noDataPixels,
      totalPixels: pixelCount,
    },
  };
}
