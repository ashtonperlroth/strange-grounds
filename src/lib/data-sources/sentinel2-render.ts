import sharp from "sharp";

const MAX_WEB_DIMENSION = 2048;

// ── True-Color Composite ───────────────────────────────────────────────

/**
 * Render true-color composite from raw 16-bit TIFF (B04/Red, B03/Green, B02/Blue).
 * Applies brightness/contrast adjustment optimized for mountain terrain
 * where deep shadows are common.
 *
 * Returns a PNG buffer with the processed RGB image.
 */
export async function renderTrueColor(
  tiffBuffer: Buffer,
  expectedWidth: number,
  expectedHeight: number,
): Promise<Buffer> {
  const metadata = await sharp(tiffBuffer).metadata();
  const width = metadata.width ?? expectedWidth;
  const height = metadata.height ?? expectedHeight;

  let pipeline = sharp(tiffBuffer);

  // Resize if exceeds max dimension for web display
  const maxDim = Math.max(width, height);
  if (maxDim > MAX_WEB_DIMENSION) {
    const scale = MAX_WEB_DIMENSION / maxDim;
    pipeline = pipeline.resize(
      Math.round(width * scale),
      Math.round(height * scale),
      { kernel: sharp.kernel.lanczos3 },
    );
  }

  // Mountain terrain optimization:
  // - normalize() auto-stretches to full dynamic range (reveals shadowed areas)
  // - Brightness boost for dark valleys and north-facing slopes
  // - Linear contrast enhancement to maintain detail in both snow and rock
  pipeline = pipeline.normalize().modulate({ brightness: 1.3 }).linear(1.2, 10);

  return pipeline.png({ compressionLevel: 6 }).toBuffer();
}

// ── Index Map Rendering ────────────────────────────────────────────────

/**
 * Render a spectral index (NDSI or NDWI) as a colorized PNG.
 * Input: single-band FLOAT32 TIFF with index values in [-1, 1].
 *
 * NDSI (Normalized Difference Snow Index):
 *   >0.4 = snow, 0.2-0.4 = partial snow, <0.2 = no snow
 *
 * NDWI (Normalized Difference Water Index):
 *   >0.3 = water, 0-0.3 = wet, <0 = dry
 */
export async function renderIndexMap(
  tiffBuffer: Buffer,
  expectedWidth: number,
  expectedHeight: number,
  indexType: "ndsi" | "ndwi",
): Promise<Buffer> {
  const image = sharp(tiffBuffer);
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });

  const w = info.width;
  const h = info.height;
  const bytesPerPixel = info.channels * (data.length / (w * h * info.channels));
  const isFloat = bytesPerPixel === 4;

  const rgba = Buffer.alloc(w * h * 4);
  const colorize = indexType === "ndsi" ? colorizeNdsi : colorizeNdwi;

  for (let i = 0; i < w * h; i++) {
    let value: number;
    if (isFloat) {
      value = data.readFloatLE(i * 4);
    } else {
      value = (data[i] / 127.5) - 1;
    }

    const [r, g, b, a] = colorize(value);
    rgba[i * 4] = r;
    rgba[i * 4 + 1] = g;
    rgba[i * 4 + 2] = b;
    rgba[i * 4 + 3] = a;
  }

  let pipeline = sharp(rgba, {
    raw: { width: w, height: h, channels: 4 },
  });

  const maxDim = Math.max(w, h);
  if (maxDim > MAX_WEB_DIMENSION) {
    const scale = MAX_WEB_DIMENSION / maxDim;
    pipeline = pipeline.resize(
      Math.round(w * scale),
      Math.round(h * scale),
    );
  }

  void expectedWidth;
  void expectedHeight;

  return pipeline.png({ compressionLevel: 6 }).toBuffer();
}

// ── Color Scales ───────────────────────────────────────────────────────

function colorizeNdsi(value: number): [number, number, number, number] {
  if (value < -1.5) return [0, 0, 0, 0];
  if (value < 0) return [139, 90, 43, 180];
  if (value < 0.2) return [34, 139, 34, 180];
  if (value < 0.4) return [173, 216, 230, 200];
  return [255, 255, 255, 230];
}

function colorizeNdwi(value: number): [number, number, number, number] {
  if (value < -1.5) return [0, 0, 0, 0];
  if (value < 0) return [210, 180, 140, 180];
  if (value < 0.3) return [135, 206, 235, 200];
  return [0, 0, 180, 230];
}
