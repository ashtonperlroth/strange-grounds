import postgres, { type JSONValue } from "postgres";

// ── Config ──────────────────────────────────────────────────────────────

const SNOTEL_URL =
  "https://wcc.sc.egov.usda.gov/reportGenerator/view_csv/customMultipleStationReport/daily/network=%22SNTL%22%20AND%20element=%22SNWD%22%20AND%20outServiceDate=%222100-01-01%22%7Cname/0,0/stationId,state.code,network.code,name,elevation,latitude,longitude";

const USGS_BASE =
  "https://waterservices.usgs.gov/nwis/iv/?format=json&parameterCd=00060&siteStatus=active&stateCd=";

const USGS_STATES = ["UT", "CO", "WA", "OR", "CA", "MT", "WY", "ID"];

const FT_TO_M = 0.3048;
const BATCH_SIZE = 50;

// ── Types ───────────────────────────────────────────────────────────────

interface StationRow {
  source: string;
  stationId: string;
  name: string;
  latitude: number;
  longitude: number;
  elevationM: number | null;
  metadata: Record<string, unknown>;
}

interface AvalancheZoneRow {
  centerId: string;
  zoneId: string;
  name: string;
  polygon: [number, number][];
  apiUrl: string;
  metadata: Record<string, unknown>;
}

// ── SNOTEL ──────────────────────────────────────────────────────────────

// CSV columns: Station Id, State Code, Network Code, Station Name, Elevation, Latitude, Longitude
function parseSnotelCsv(csv: string): StationRow[] {
  const lines = csv.split("\n");
  const stations: StationRow[] = [];

  for (const line of lines) {
    if (line.startsWith("#") || line.trim() === "") continue;
    if (/station\s*id/i.test(line)) continue;

    const parts = line.split(",").map((s) => s.trim());
    if (parts.length < 7) continue;

    const stationId = parts[0];
    const state = parts[1];
    const network = parts[2];
    const name = parts[3] || `SNOTEL ${stationId}`;
    const elevFt = parseFloat(parts[4]);
    const lat = parseFloat(parts[5]);
    const lng = parseFloat(parts[6]);

    if (!stationId || isNaN(lat) || isNaN(lng)) continue;
    if (lat === 0 && lng === 0) continue;

    stations.push({
      source: "snotel",
      stationId,
      name,
      latitude: lat,
      longitude: lng,
      elevationM: isNaN(elevFt) ? null : Math.round(elevFt * FT_TO_M),
      metadata: { state, network, triplet: `${stationId}:${state}:${network}` },
    });
  }

  return stations;
}

async function seedSnotel(sql: postgres.Sql): Promise<number> {
  console.log("\n╔══════════════════════════════════╗");
  console.log("║     Seeding SNOTEL Stations      ║");
  console.log("╚══════════════════════════════════╝\n");

  console.log("Fetching station metadata from NRCS...");
  const res = await fetch(SNOTEL_URL, { signal: AbortSignal.timeout(60_000) });
  if (!res.ok) throw new Error(`SNOTEL fetch failed: ${res.status} ${res.statusText}`);

  const csv = await res.text();
  const stations = parseSnotelCsv(csv);
  console.log(`Parsed ${stations.length} SNOTEL stations from CSV`);

  let inserted = 0;
  for (let i = 0; i < stations.length; i += BATCH_SIZE) {
    const batch = stations.slice(i, i + BATCH_SIZE);
    for (const s of batch) {
      await sql`
        INSERT INTO stations (source, station_id, name, location, elevation_m, metadata)
        VALUES (
          ${s.source},
          ${s.stationId},
          ${s.name},
          ST_SetSRID(ST_MakePoint(${s.longitude}, ${s.latitude}), 4326)::geography,
          ${s.elevationM},
          ${sql.json(s.metadata as JSONValue)}
        )
        ON CONFLICT (source, station_id) DO UPDATE SET
          name = EXCLUDED.name,
          location = EXCLUDED.location,
          elevation_m = EXCLUDED.elevation_m,
          metadata = EXCLUDED.metadata
      `;
      inserted++;
    }
    process.stdout.write(
      `\r  Progress: ${Math.min(i + BATCH_SIZE, stations.length)} / ${stations.length}`,
    );
  }

  console.log(`\n  ✓ Upserted ${inserted} SNOTEL stations`);
  return inserted;
}

// ── USGS ────────────────────────────────────────────────────────────────

interface UsgsTimeSeries {
  sourceInfo: {
    siteName: string;
    siteCode: { value: string; agencyCode: string }[];
    geoLocation: {
      geogLocation: { latitude: number; longitude: number };
    };
    elevation?: { value: number; unitCode?: string };
    siteProperty?: { name: string; value: string }[];
  };
}

function parseUsgsJson(json: {
  value: { timeSeries: UsgsTimeSeries[] };
}): StationRow[] {
  const seen = new Set<string>();
  const stations: StationRow[] = [];
  const timeSeries = json?.value?.timeSeries ?? [];

  for (const ts of timeSeries) {
    const info = ts.sourceInfo;
    if (!info) continue;

    const siteCode = info.siteCode?.[0]?.value;
    if (!siteCode || seen.has(siteCode)) continue;
    seen.add(siteCode);

    const geo = info.geoLocation?.geogLocation;
    if (!geo?.latitude || !geo?.longitude) continue;

    const rawElev = info.elevation?.value;
    const elevM =
      rawElev != null && !isNaN(rawElev) ? Math.round(rawElev * FT_TO_M) : null;

    const stateCd =
      info.siteProperty?.find((p) => p.name === "stateCd")?.value ?? "";
    const siteType =
      info.siteProperty?.find((p) => p.name === "siteTypeCd")?.value ?? "";

    stations.push({
      source: "usgs",
      stationId: siteCode,
      name: info.siteName ?? `USGS ${siteCode}`,
      latitude: geo.latitude,
      longitude: geo.longitude,
      elevationM: elevM,
      metadata: { stateCd, siteType, agencyCode: "USGS" },
    });
  }

  return stations;
}

async function seedUsgs(sql: postgres.Sql): Promise<number> {
  console.log("\n╔══════════════════════════════════╗");
  console.log("║      Seeding USGS Gauges         ║");
  console.log("╚══════════════════════════════════╝\n");

  const allStations: StationRow[] = [];
  const seen = new Set<string>();

  for (const state of USGS_STATES) {
    process.stdout.write(`  Fetching ${state}...`);
    try {
      const res = await fetch(`${USGS_BASE}${state}`, {
        signal: AbortSignal.timeout(60_000),
      });
      if (!res.ok) {
        console.log(` ⚠ ${res.status} (skipped)`);
        continue;
      }
      const json = await res.json();
      const parsed = parseUsgsJson(json);
      let added = 0;
      for (const s of parsed) {
        if (!seen.has(s.stationId)) {
          seen.add(s.stationId);
          allStations.push(s);
          added++;
        }
      }
      console.log(` ${added} gauges`);
    } catch (err) {
      console.log(` ⚠ error (skipped): ${err instanceof Error ? err.message : err}`);
    }
  }

  const stations = allStations;
  console.log(`\n  Total unique USGS gauges: ${stations.length}`);

  let inserted = 0;
  for (let i = 0; i < stations.length; i += BATCH_SIZE) {
    const batch = stations.slice(i, i + BATCH_SIZE);
    for (const s of batch) {
      await sql`
        INSERT INTO stations (source, station_id, name, location, elevation_m, metadata)
        VALUES (
          ${s.source},
          ${s.stationId},
          ${s.name},
          ST_SetSRID(ST_MakePoint(${s.longitude}, ${s.latitude}), 4326)::geography,
          ${s.elevationM},
          ${sql.json(s.metadata as JSONValue)}
        )
        ON CONFLICT (source, station_id) DO UPDATE SET
          name = EXCLUDED.name,
          location = EXCLUDED.location,
          elevation_m = EXCLUDED.elevation_m,
          metadata = EXCLUDED.metadata
      `;
      inserted++;
    }
    process.stdout.write(
      `\r  Progress: ${Math.min(i + BATCH_SIZE, stations.length)} / ${stations.length}`,
    );
  }

  console.log(`\n  ✓ Upserted ${inserted} USGS gauges`);
  return inserted;
}

// ── Avalanche Zones ─────────────────────────────────────────────────────

const AVY_API_BASE =
  "https://api.avalanche.org/v2/public/product?type=forecast";

function avyUrl(centerId: string, zoneId: string): string {
  return `${AVY_API_BASE}&center_id=${centerId}&zone_id=${zoneId}`;
}

const AVALANCHE_ZONES: AvalancheZoneRow[] = [
  // ── UAC (Utah Avalanche Center) ────────────────────────────────────
  {
    centerId: "UAC",
    zoneId: "salt-lake",
    name: "Salt Lake",
    apiUrl: avyUrl("UAC", "salt-lake"),
    metadata: { center_name: "Utah Avalanche Center", center_url: "https://utahavalanchecenter.org" },
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
    apiUrl: avyUrl("UAC", "provo"),
    metadata: { center_name: "Utah Avalanche Center", center_url: "https://utahavalanchecenter.org" },
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
    apiUrl: avyUrl("UAC", "ogden"),
    metadata: { center_name: "Utah Avalanche Center", center_url: "https://utahavalanchecenter.org" },
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
    apiUrl: avyUrl("UAC", "logan"),
    metadata: { center_name: "Utah Avalanche Center", center_url: "https://utahavalanchecenter.org" },
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
    apiUrl: avyUrl("UAC", "uintas"),
    metadata: { center_name: "Utah Avalanche Center", center_url: "https://utahavalanchecenter.org" },
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
    apiUrl: avyUrl("UAC", "moab"),
    metadata: { center_name: "Utah Avalanche Center", center_url: "https://utahavalanchecenter.org" },
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
    apiUrl: avyUrl("UAC", "abajos"),
    metadata: { center_name: "Utah Avalanche Center", center_url: "https://utahavalanchecenter.org" },
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
    apiUrl: avyUrl("CAIC", "front-range"),
    metadata: { center_name: "Colorado Avalanche Information Center", center_url: "https://avalanche.state.co.us" },
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
    apiUrl: avyUrl("CAIC", "vail-summit-county"),
    metadata: { center_name: "Colorado Avalanche Information Center", center_url: "https://avalanche.state.co.us" },
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
    apiUrl: avyUrl("CAIC", "sawatch"),
    metadata: { center_name: "Colorado Avalanche Information Center", center_url: "https://avalanche.state.co.us" },
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
    apiUrl: avyUrl("CAIC", "aspen"),
    metadata: { center_name: "Colorado Avalanche Information Center", center_url: "https://avalanche.state.co.us" },
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
    apiUrl: avyUrl("CAIC", "gunnison"),
    metadata: { center_name: "Colorado Avalanche Information Center", center_url: "https://avalanche.state.co.us" },
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
    apiUrl: avyUrl("CAIC", "grand-mesa"),
    metadata: { center_name: "Colorado Avalanche Information Center", center_url: "https://avalanche.state.co.us" },
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
    apiUrl: avyUrl("CAIC", "northern-san-juan"),
    metadata: { center_name: "Colorado Avalanche Information Center", center_url: "https://avalanche.state.co.us" },
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
    apiUrl: avyUrl("CAIC", "southern-san-juan"),
    metadata: { center_name: "Colorado Avalanche Information Center", center_url: "https://avalanche.state.co.us" },
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
    apiUrl: avyUrl("CAIC", "sangre-de-cristo"),
    metadata: { center_name: "Colorado Avalanche Information Center", center_url: "https://avalanche.state.co.us" },
    polygon: [
      [-105.68, 37.35], [-105.28, 37.35], [-105.22, 37.52],
      [-105.22, 38.05], [-105.32, 38.18], [-105.55, 38.22],
      [-105.68, 38.05], [-105.72, 37.68], [-105.68, 37.35],
    ],
  },
];

function polygonToWkt(coords: [number, number][]): string {
  const ring = coords.map(([lng, lat]) => `${lng} ${lat}`).join(", ");
  return `SRID=4326;POLYGON((${ring}))`;
}

async function seedAvalancheZones(sql: postgres.Sql): Promise<number> {
  console.log("\n╔══════════════════════════════════╗");
  console.log("║   Seeding Avalanche Zones        ║");
  console.log("╚══════════════════════════════════╝\n");

  let inserted = 0;
  for (const zone of AVALANCHE_ZONES) {
    const wkt = polygonToWkt(zone.polygon);
    await sql`
      INSERT INTO avalanche_zones (center_id, zone_id, name, boundary, api_url, metadata)
      VALUES (
        ${zone.centerId},
        ${zone.zoneId},
        ${zone.name},
        ST_GeogFromText(${wkt}),
        ${zone.apiUrl},
        ${sql.json(zone.metadata as JSONValue)}
      )
      ON CONFLICT (center_id, zone_id) DO UPDATE SET
        name = EXCLUDED.name,
        boundary = EXCLUDED.boundary,
        api_url = EXCLUDED.api_url,
        metadata = EXCLUDED.metadata
    `;
    inserted++;
    console.log(`  ✓ ${zone.centerId} / ${zone.name}`);
  }

  console.log(`\n  ✓ Upserted ${inserted} avalanche zones`);
  return inserted;
}

// ── Spatial Query Test ──────────────────────────────────────────────────

async function testSpatialQuery(sql: postgres.Sql): Promise<void> {
  console.log("\n╔══════════════════════════════════╗");
  console.log("║      Spatial Query Test           ║");
  console.log("╚══════════════════════════════════╝\n");

  const testLat = 40.58;
  const testLng = -111.65;
  const radiusM = 50_000;

  console.log(`  Finding stations near (${testLat}, ${testLng}) within ${radiusM / 1000}km...\n`);

  const nearby = await sql`
    SELECT
      source,
      station_id,
      name,
      ROUND((ST_Distance(
        location,
        ST_SetSRID(ST_MakePoint(${testLng}, ${testLat}), 4326)::geography
      ) / 1000.0)::numeric, 2) AS distance_km
    FROM stations
    WHERE ST_DWithin(
      location,
      ST_SetSRID(ST_MakePoint(${testLng}, ${testLat}), 4326)::geography,
      ${radiusM}
    )
    ORDER BY distance_km
    LIMIT 10
  `;

  if (nearby.length === 0) {
    console.log("  ⚠ No stations found nearby");
  } else {
    console.log("  Nearest stations:");
    for (const row of nearby) {
      console.log(
        `    ${row.source.padEnd(7)} ${row.station_id.padEnd(12)} ${row.name.substring(0, 40).padEnd(42)} ${row.distance_km} km`,
      );
    }
  }

  const zone = await sql`
    SELECT center_id, zone_id, name
    FROM avalanche_zones
    WHERE ST_Covers(
      boundary,
      ST_SetSRID(ST_MakePoint(${testLng}, ${testLat}), 4326)::geography
    )
    LIMIT 1
  `;

  if (zone.length > 0) {
    console.log(`\n  Avalanche zone: ${zone[0].center_id} / ${zone[0].name}`);
  } else {
    console.log("\n  ⚠ No avalanche zone contains this point");
  }
}

// ── Summary ─────────────────────────────────────────────────────────────

async function printSummary(sql: postgres.Sql): Promise<void> {
  console.log("\n╔══════════════════════════════════╗");
  console.log("║           Summary                ║");
  console.log("╚══════════════════════════════════╝\n");

  const counts = await sql`
    SELECT source, COUNT(*)::int AS count FROM stations GROUP BY source
    UNION ALL
    SELECT 'avalanche_zones', COUNT(*)::int FROM avalanche_zones
    ORDER BY source
  `;

  for (const row of counts) {
    console.log(`  ${row.source.padEnd(20)} ${row.count} records`);
  }
}

// ── Main ────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("Error: DATABASE_URL environment variable is required.");
    console.error("Copy .env.local.example to .env.local and fill in your Supabase DATABASE_URL.");
    process.exit(1);
  }

  const isLocal = databaseUrl.includes("localhost") || databaseUrl.includes("127.0.0.1");
  const sql = postgres(databaseUrl, {
    ssl: isLocal ? false : "require",
    max: 1,
    connect_timeout: 30,
  });

  console.log("╔══════════════════════════════════════════╗");
  console.log("║  Backcountry Conditions — Station Seeder ║");
  console.log("╚══════════════════════════════════════════╝");

  try {
    const snotelCount = await seedSnotel(sql);
    const usgsCount = await seedUsgs(sql);
    const zoneCount = await seedAvalancheZones(sql);

    await testSpatialQuery(sql);
    await printSummary(sql);

    console.log("\n✅ Seed complete!");
    console.log(`   SNOTEL: ${snotelCount}  |  USGS: ${usgsCount}  |  Zones: ${zoneCount}\n`);
  } catch (err) {
    console.error("\n❌ Seed failed:", err);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
