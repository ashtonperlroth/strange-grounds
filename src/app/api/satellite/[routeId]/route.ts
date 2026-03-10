import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchSentinel2, bufferBbox } from "@/lib/data-sources/sentinel2";
import {
  processSentinel2Imagery,
  getExistingImagery,
} from "@/lib/data-sources/sentinel2-processor";
import type { LineString } from "geojson";

// ── Helpers ────────────────────────────────────────────────────────────

function parseGeometry(raw: unknown): LineString {
  if (!raw) return { type: "LineString", coordinates: [] };
  if (typeof raw === "object" && raw !== null) {
    const geo = raw as Record<string, unknown>;
    if (geo.type === "LineString" && Array.isArray(geo.coordinates)) {
      return { type: "LineString", coordinates: geo.coordinates };
    }
  }
  if (typeof raw === "string") {
    const match = raw.match(/LINESTRING\(\s*(.+)\s*\)/);
    if (match) {
      const coords = match[1].split(",").map((pair) => {
        const [lng, lat] = pair.trim().split(/\s+/).map(Number);
        return [lng, lat];
      });
      return { type: "LineString", coordinates: coords };
    }
  }
  return { type: "LineString", coordinates: [] };
}

function computeBbox(
  geometry: LineString,
): [number, number, number, number] | null {
  const coords = geometry.coordinates;
  if (coords.length === 0) return null;

  let west = Infinity;
  let south = Infinity;
  let east = -Infinity;
  let north = -Infinity;

  for (const coord of coords) {
    const lng = coord[0];
    const lat = coord[1];
    if (lng < west) west = lng;
    if (lng > east) east = lng;
    if (lat < south) south = lat;
    if (lat > north) north = lat;
  }

  return [west, south, east, north];
}

// ── Route Handler ──────────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ routeId: string }> },
) {
  const { routeId } = await params;

  if (!routeId) {
    return NextResponse.json(
      { error: "routeId is required" },
      { status: 400 },
    );
  }

  try {
    const supabase = createAdminClient();

    const { data: route, error: routeError } = await supabase
      .from("routes")
      .select("id, geometry")
      .eq("id", routeId)
      .single();

    if (routeError || !route) {
      return NextResponse.json(
        { error: "Route not found" },
        { status: 404 },
      );
    }

    const geometry = parseGeometry(route.geometry);
    const rawBbox = computeBbox(geometry);

    if (!rawBbox) {
      return NextResponse.json(
        { error: "Route has no valid geometry for satellite imagery" },
        { status: 400 },
      );
    }

    const bbox = bufferBbox(rawBbox);

    // Check for recent cached imagery first
    const existing = await getExistingImagery(routeId);
    if (existing && existing.trueColorUrl && existing.processedAt) {
      const processedDate = new Date(existing.processedAt);
      const ageMs = Date.now() - processedDate.getTime();
      if (ageMs < 24 * 60 * 60 * 1000) {
        return NextResponse.json({
          ...existing,
          cached: true,
        });
      }
    }

    // Discover latest cloud-free scene
    const sentinel2Data = await fetchSentinel2({ bbox, routeId });

    if (!sentinel2Data.available || !sentinel2Data.scene) {
      return NextResponse.json({
        available: false,
        acquisitionDate: null,
        cloudCover: null,
        trueColorUrl: null,
        ndsiUrl: null,
        bounds: null,
        message: "No recent cloud-free Sentinel-2 imagery available",
      });
    }

    // Process imagery (download bands, render, upload)
    const processed = await processSentinel2Imagery(
      routeId,
      bbox,
      sentinel2Data.scene,
    );

    return NextResponse.json({
      ...processed,
      cached: false,
    });
  } catch (err) {
    console.error("[satellite] Route handler error:", err);
    return NextResponse.json(
      {
        available: false,
        error: "Failed to fetch satellite imagery",
      },
      { status: 500 },
    );
  }
}
