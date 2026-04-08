# Strange Grounds

Backcountry conditions intelligence platform. Point at a route on a map, and get an AI-synthesized briefing backed by real-time environmental data — satellite imagery, weather forecasts, snowpack, streamflow, avalanche conditions, and fire activity.

<!-- TODO: Add screenshot here -->
<!-- ![Strange Grounds briefing screenshot](docs/screenshot.png) -->

## What It Does

1. **Plan a trip** — draw a route on the map or select a popular backcountry route
2. **Generate a briefing** — the system fetches data from 8+ environmental sources along your route
3. **Read conditions** — get a narrative briefing with a green/yellow/red readiness assessment
4. **Share** — each briefing gets a unique shareable link
5. **Monitor** — opt-in to email alerts when conditions change before your trip

## Data Sources

| Source | What It Provides |
|:---|:---|
| [NWS](https://www.weather.gov/) | Hourly + daily forecasts, alerts, hazards |
| [SNOTEL](https://www.nrcs.usda.gov/wps/portal/wcc/home/snowClimateMonitoring/snowpack/) | Snowpack depth, SWE, temperature at ~900 stations |
| [USGS](https://waterdata.usgs.gov/) | Real-time streamflow from gauging stations |
| [Sentinel-2](https://dataspace.copernicus.eu/) | Satellite imagery — true color, NDSI snow cover, snowline detection |
| [UAC / CAIC](https://utahavalanchecenter.org/) | Avalanche forecasts and danger ratings by zone |
| [NIFC](https://www.nifc.gov/) | Active fire perimeters and incidents |
| [NWS / SunCalc](https://aa.usno.navy.mil/) | Sunrise, sunset, daylight hours |
| [OpenStreetMap](https://www.openstreetmap.org/) | Trail data for route context |

Data is fetched in parallel via [Inngest](https://www.inngest.com/) background functions, cached in Supabase, and synthesized into a narrative by Claude.

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    Next.js 16 (App Router)                │
│  MapLibre GL map · tRPC client · React Query · Recharts  │
└──────────────────────┬───────────────────────────────────┘
                       │ tRPC
┌──────────────────────▼───────────────────────────────────┐
│                     tRPC Server                           │
│  Routes · Trips · Briefings · Conditions                  │
└──────────┬────────────────────────────┬──────────────────┘
           │                            │
┌──────────▼──────────┐    ┌────────────▼─────────────────┐
│   Supabase (Postgres │    │     Inngest (Background)     │
│   + PostGIS + Auth)  │    │  generate-briefing function   │
│   16 migrations      │    │  parallel data source fetch   │
│   RLS policies       │    │  LLM synthesis via Claude     │
└──────────────────────┘    └──────────────────────────────┘
```

## Tech Stack

- **Frontend:** Next.js 16, React 19, TypeScript, MapLibre GL, Tailwind CSS, Radix UI, Recharts, D3
- **Backend:** tRPC, Inngest (serverless background jobs), Supabase (Postgres + PostGIS + Auth + Storage)
- **AI:** Anthropic Claude for briefing synthesis and condition interpretation
- **Satellite:** Copernicus Data Space Ecosystem (CDSE) Process API for Sentinel-2 imagery
- **Deployment:** Vercel (frontend + API routes), Supabase (managed Postgres)
- **Monitoring:** Sentry, Plausible Analytics
- **Testing:** Playwright (smoke + e2e)

## Setup

### Prerequisites

- Node.js >= 18
- A [Supabase](https://supabase.com/) project (free tier works)
- API keys: [Anthropic](https://console.anthropic.com/), [Copernicus CDSE](https://dataspace.copernicus.eu/), [MapTiler](https://www.maptiler.com/)

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.local.example .env.local
```

Fill in your Supabase credentials, Anthropic API key, CDSE OAuth credentials, and MapTiler key.

### 3. Apply database migrations

```bash
npm run dev
# In another terminal:
curl -X POST http://localhost:3000/api/setup
```

### 4. Seed station data

```bash
npm run seed
```

Downloads ~900 SNOTEL stations, USGS stream gauges for western US states, and avalanche zone boundaries. Idempotent — safe to re-run.

### 5. Start development server

```bash
npm run dev
```

## Scripts

| Command | Description |
|:---|:---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run seed` | Seed SNOTEL, USGS, and avalanche zone data |
| `npm run test` | Run Playwright tests |
| `npm run test:e2e` | Run briefing end-to-end test |
| `npm run test:prod` | Smoke test against production URL |

## Project Structure

```
src/
├── app/                    # Next.js App Router pages + API routes
│   ├── (auth)/             # Login, signup
│   ├── (dashboard)/        # Main app, trip management
│   ├── briefing/[token]/   # Shareable briefing view
│   ├── conditions/         # Route conditions pages
│   └── api/                # tRPC, Inngest, satellite endpoints
├── components/             # React components
│   ├── briefing/           # Briefing panel, PDF export, route walkthrough
│   ├── map/                # MapLibre map, layers, drawing tools
│   └── routes/             # Route toolbar, popular route detail
├── lib/
│   ├── data-sources/       # Adapters for each environmental data source
│   ├── inngest/            # Background job definitions
│   ├── routes/             # Route segmentation, GPX parsing, conditions
│   ├── synthesis/          # LLM prompt construction + briefing generation
│   ├── supabase/           # DB client + admin client
│   └── trpc/               # tRPC router definitions
└── stores/                 # Zustand state management
supabase/
└── migrations/             # 16 SQL migrations (PostGIS, RLS, RPCs)
```
