import { NextResponse } from "next/server";
import { fetchAllZones } from "@/lib/data-sources/avalanche-zones";

export async function GET() {
  try {
    const geojson = await fetchAllZones();

    return NextResponse.json(geojson, {
      headers: {
        "Cache-Control": "public, max-age=1800, s-maxage=21600",
      },
    });
  } catch (err) {
    console.error("[avalanche-zones] Route handler error:", err);
    return NextResponse.json(
      { type: "FeatureCollection", features: [] },
      { status: 500 },
    );
  }
}
