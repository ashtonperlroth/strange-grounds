const AVY_API_BASE =
  "https://api.avalanche.org/v2/public/product?type=forecast";

function avyUrl(centerId: string, zoneId: string): string {
  return `${AVY_API_BASE}&center_id=${centerId}&zone_id=${zoneId}`;
}

export interface AvalancheZoneDef {
  centerId: string;
  zoneId: string;
  name: string;
  centerName: string;
  centerUrl: string;
  apiUrl: string;
  polygon: [number, number][];
}

export const AVALANCHE_ZONES: AvalancheZoneDef[] = [
  // ── UAC (Utah Avalanche Center) ────────────────────────────────────
  {
    centerId: "UAC",
    zoneId: "salt-lake",
    name: "Salt Lake",
    centerName: "Utah Avalanche Center",
    centerUrl: "https://utahavalanchecenter.org",
    apiUrl: avyUrl("UAC", "salt-lake"),
    polygon: [
      [-111.82, 40.52], [-111.53, 40.52], [-111.50, 40.60],
      [-111.50, 40.72], [-111.58, 40.77], [-111.82, 40.77],
      [-111.85, 40.65], [-111.82, 40.52],
    ],
  },
  {
    centerId: "UAC",
    zoneId: "provo",
    name: "Provo",
    centerName: "Utah Avalanche Center",
    centerUrl: "https://utahavalanchecenter.org",
    apiUrl: avyUrl("UAC", "provo"),
    polygon: [
      [-111.72, 40.22], [-111.48, 40.22], [-111.42, 40.35],
      [-111.42, 40.50], [-111.55, 40.52], [-111.72, 40.52],
      [-111.75, 40.38], [-111.72, 40.22],
    ],
  },
  {
    centerId: "UAC",
    zoneId: "ogden",
    name: "Ogden",
    centerName: "Utah Avalanche Center",
    centerUrl: "https://utahavalanchecenter.org",
    apiUrl: avyUrl("UAC", "ogden"),
    polygon: [
      [-112.00, 41.05], [-111.72, 41.05], [-111.65, 41.15],
      [-111.65, 41.32], [-111.78, 41.38], [-112.00, 41.38],
      [-112.05, 41.20], [-112.00, 41.05],
    ],
  },
  {
    centerId: "UAC",
    zoneId: "logan",
    name: "Logan",
    centerName: "Utah Avalanche Center",
    centerUrl: "https://utahavalanchecenter.org",
    apiUrl: avyUrl("UAC", "logan"),
    polygon: [
      [-111.82, 41.70], [-111.45, 41.70], [-111.40, 41.82],
      [-111.40, 42.05], [-111.55, 42.12], [-111.82, 42.12],
      [-111.88, 41.90], [-111.82, 41.70],
    ],
  },
  {
    centerId: "UAC",
    zoneId: "uintas",
    name: "Uintas",
    centerName: "Utah Avalanche Center",
    centerUrl: "https://utahavalanchecenter.org",
    apiUrl: avyUrl("UAC", "uintas"),
    polygon: [
      [-111.45, 40.48], [-110.80, 40.40], [-109.95, 40.55],
      [-109.85, 40.72], [-109.95, 40.92], [-110.80, 40.95],
      [-111.45, 40.88], [-111.50, 40.68], [-111.45, 40.48],
    ],
  },
  {
    centerId: "UAC",
    zoneId: "moab",
    name: "Moab",
    centerName: "Utah Avalanche Center",
    centerUrl: "https://utahavalanchecenter.org",
    apiUrl: avyUrl("UAC", "moab"),
    polygon: [
      [-109.42, 38.38], [-109.15, 38.38], [-109.10, 38.45],
      [-109.10, 38.58], [-109.18, 38.62], [-109.42, 38.62],
      [-109.48, 38.50], [-109.42, 38.38],
    ],
  },
  {
    centerId: "UAC",
    zoneId: "abajos",
    name: "Abajos",
    centerName: "Utah Avalanche Center",
    centerUrl: "https://utahavalanchecenter.org",
    apiUrl: avyUrl("UAC", "abajos"),
    polygon: [
      [-109.58, 37.78], [-109.32, 37.78], [-109.28, 37.85],
      [-109.28, 38.02], [-109.35, 38.08], [-109.58, 38.08],
      [-109.62, 37.92], [-109.58, 37.78],
    ],
  },

  // ── CAIC (Colorado Avalanche Information Center) ───────────────────
  {
    centerId: "CAIC",
    zoneId: "front-range",
    name: "Front Range",
    centerName: "Colorado Avalanche Information Center",
    centerUrl: "https://avalanche.state.co.us",
    apiUrl: avyUrl("CAIC", "front-range"),
    polygon: [
      [-105.82, 39.55], [-105.45, 39.55], [-105.28, 39.72],
      [-105.28, 40.05], [-105.35, 40.25], [-105.58, 40.30],
      [-105.82, 40.18], [-105.88, 39.85], [-105.82, 39.55],
    ],
  },
  {
    centerId: "CAIC",
    zoneId: "vail-summit-county",
    name: "Vail & Summit County",
    centerName: "Colorado Avalanche Information Center",
    centerUrl: "https://avalanche.state.co.us",
    apiUrl: avyUrl("CAIC", "vail-summit-county"),
    polygon: [
      [-106.52, 39.42], [-105.85, 39.42], [-105.78, 39.55],
      [-105.78, 39.72], [-105.88, 39.82], [-106.22, 39.85],
      [-106.52, 39.78], [-106.58, 39.58], [-106.52, 39.42],
    ],
  },
  {
    centerId: "CAIC",
    zoneId: "sawatch",
    name: "Sawatch",
    centerName: "Colorado Avalanche Information Center",
    centerUrl: "https://avalanche.state.co.us",
    apiUrl: avyUrl("CAIC", "sawatch"),
    polygon: [
      [-106.62, 38.55], [-106.15, 38.55], [-106.05, 38.72],
      [-106.05, 39.10], [-106.15, 39.28], [-106.45, 39.32],
      [-106.62, 39.18], [-106.68, 38.85], [-106.62, 38.55],
    ],
  },
  {
    centerId: "CAIC",
    zoneId: "aspen",
    name: "Aspen",
    centerName: "Colorado Avalanche Information Center",
    centerUrl: "https://avalanche.state.co.us",
    apiUrl: avyUrl("CAIC", "aspen"),
    polygon: [
      [-107.18, 38.92], [-106.58, 38.92], [-106.52, 39.05],
      [-106.52, 39.22], [-106.62, 39.32], [-106.92, 39.35],
      [-107.18, 39.22], [-107.22, 39.08], [-107.18, 38.92],
    ],
  },
  {
    centerId: "CAIC",
    zoneId: "gunnison",
    name: "Gunnison",
    centerName: "Colorado Avalanche Information Center",
    centerUrl: "https://avalanche.state.co.us",
    apiUrl: avyUrl("CAIC", "gunnison"),
    polygon: [
      [-107.28, 38.42], [-106.65, 38.42], [-106.58, 38.55],
      [-106.58, 38.82], [-106.72, 38.92], [-107.05, 38.95],
      [-107.28, 38.82], [-107.32, 38.62], [-107.28, 38.42],
    ],
  },
  {
    centerId: "CAIC",
    zoneId: "grand-mesa",
    name: "Grand Mesa",
    centerName: "Colorado Avalanche Information Center",
    centerUrl: "https://avalanche.state.co.us",
    apiUrl: avyUrl("CAIC", "grand-mesa"),
    polygon: [
      [-108.25, 38.85], [-107.55, 38.85], [-107.48, 38.95],
      [-107.48, 39.15], [-107.58, 39.25], [-107.92, 39.28],
      [-108.25, 39.18], [-108.32, 39.02], [-108.25, 38.85],
    ],
  },
  {
    centerId: "CAIC",
    zoneId: "northern-san-juan",
    name: "Northern San Juan",
    centerName: "Colorado Avalanche Information Center",
    centerUrl: "https://avalanche.state.co.us",
    apiUrl: avyUrl("CAIC", "northern-san-juan"),
    polygon: [
      [-108.05, 37.72], [-107.35, 37.72], [-107.28, 37.82],
      [-107.28, 38.02], [-107.42, 38.12], [-107.72, 38.15],
      [-108.05, 38.02], [-108.12, 37.88], [-108.05, 37.72],
    ],
  },
  {
    centerId: "CAIC",
    zoneId: "southern-san-juan",
    name: "Southern San Juan",
    centerName: "Colorado Avalanche Information Center",
    centerUrl: "https://avalanche.state.co.us",
    apiUrl: avyUrl("CAIC", "southern-san-juan"),
    polygon: [
      [-107.28, 37.22], [-106.45, 37.22], [-106.38, 37.35],
      [-106.38, 37.58], [-106.52, 37.68], [-106.88, 37.72],
      [-107.28, 37.58], [-107.35, 37.42], [-107.28, 37.22],
    ],
  },
  {
    centerId: "CAIC",
    zoneId: "sangre-de-cristo",
    name: "Sangre de Cristo",
    centerName: "Colorado Avalanche Information Center",
    centerUrl: "https://avalanche.state.co.us",
    apiUrl: avyUrl("CAIC", "sangre-de-cristo"),
    polygon: [
      [-105.68, 37.35], [-105.28, 37.35], [-105.22, 37.52],
      [-105.22, 38.05], [-105.32, 38.18], [-105.55, 38.22],
      [-105.68, 38.05], [-105.72, 37.68], [-105.68, 37.35],
    ],
  },
];

function bboxIntersects(
  zone: AvalancheZoneDef,
  west: number,
  south: number,
  east: number,
  north: number,
): boolean {
  let minLng = Infinity, maxLng = -Infinity;
  let minLat = Infinity, maxLat = -Infinity;
  for (const [lng, lat] of zone.polygon) {
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }
  return !(maxLng < west || minLng > east || maxLat < south || minLat > north);
}

export function buildZoneGeoJSON(
  zones: AvalancheZoneDef[],
  bbox?: { west: number; south: number; east: number; north: number },
): GeoJSON.FeatureCollection {
  const filtered = bbox
    ? zones.filter((z) => bboxIntersects(z, bbox.west, bbox.south, bbox.east, bbox.north))
    : zones;

  return {
    type: "FeatureCollection",
    features: filtered.map((zone) => ({
      type: "Feature" as const,
      geometry: {
        type: "Polygon" as const,
        coordinates: [zone.polygon],
      },
      properties: {
        center_id: zone.centerId,
        zone_id: zone.zoneId,
        name: zone.name,
        api_url: zone.apiUrl,
        centerName: zone.centerName,
        centerUrl: zone.centerUrl,
        dangerLevel: 0,
        dangerLabel: "No Rating",
        problems: [],
      },
    })),
  };
}
