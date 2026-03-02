import postgres, { type JSONValue } from "postgres";

// ── Config ──────────────────────────────────────────────────────────────

const SNOTEL_URL =
  "https://wcc.sc.egov.usda.gov/reportGenerator/view_csv/customMultipleStationReport/daily/network=%22SNTL%22%20AND%20element=%22SNWD%22%20AND%20outServiceDate=%222100-01-01%22%7Cname/0,0/stationId,state.code,network.code,name,elevation,latitude,longitude";

const USGS_BASE =
  "https://waterservices.usgs.gov/nwis/iv/?format=json&parameterCd=00060&siteStatus=active&stateCd=";

const USGS_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
];

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

  console.log("\n  Note: Avalanche zones are now fetched live from avalanche.org API");
}

// ── Summary ─────────────────────────────────────────────────────────────

async function printSummary(sql: postgres.Sql): Promise<void> {
  console.log("\n╔══════════════════════════════════╗");
  console.log("║           Summary                ║");
  console.log("╚══════════════════════════════════╝\n");

  const counts = await sql`
    SELECT source, COUNT(*)::int AS count FROM stations GROUP BY source
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

    await testSpatialQuery(sql);
    await printSummary(sql);

    console.log("\n✅ Seed complete!");
    console.log(`   SNOTEL: ${snotelCount}  |  USGS: ${usgsCount}\n`);
    console.log("   Note: Avalanche zones are now fetched live from avalanche.org API\n");
  } catch (err) {
    console.error("\n❌ Seed failed:", err);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
