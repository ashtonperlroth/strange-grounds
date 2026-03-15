# Project: Backcountry Conditions Intelligence Platform

## Stack
- Next.js 16 (App Router) with TypeScript
- MapLibre GL JS for maps, MapTiler for tiles, AWS Terrain Tiles for DEM
- shadcn/ui + Tailwind CSS + Radix UI for components
- Supabase for database (Postgres + PostGIS), auth, storage
- tRPC for type-safe API layer
- Zustand for client state management
- Recharts for charts, D3 only for polar/rose visualizations
- Inngest for background job orchestration
- Anthropic Claude API for LLM synthesis

## Architecture Rules
- ALL server logic lives in Next.js Route Handlers or Server Components. No separate backend.
- Use Server Components by default. Only add 'use client' when the component needs interactivity.
- Data fetching happens in Server Components or tRPC Route Handlers, never in useEffect.
- Environment variables: server-only vars have no prefix. Client vars use NEXT_PUBLIC_ prefix.

## File Structure
- Pages/routes: src/app/
- Components: src/components/{domain}/ (map/, briefing/, charts/, planning/, layout/, ui/)
- Library code: src/lib/ (supabase/, data-sources/, synthesis/, terrain/, trpc/, inngest/)
- Hooks: src/hooks/
- State stores: src/stores/

## Component Patterns
- Use named exports, not default exports (except for page.tsx which needs default).
- Client components start with 'use client' directive.
- Props use TypeScript interfaces, defined in the same file above the component.
- Loading states use shadcn Skeleton components.
- Error states show a message with a retry button.

## Data Source Adapter Pattern
Every file in src/lib/data-sources/ follows this shape:
interface [Source]Data { /* typed response */ }
interface [Source]Options { lat: number; lng: number; /* source-specific params */ }
export async function fetch[Source](options: [Source]Options): Promise<[Source]Data> {
  // 1. Check cache in Supabase (data_cache table)
  // 2. If cache miss or expired, fetch from external API
  // 3. Parse and type the response
  // 4. Cache the result with appropriate TTL
  // 5. Return typed data
}

## Styling
- Tailwind utility classes only. No CSS modules, no styled-components.
- Color system: green (#22c55e), yellow (#eab308), red (#ef4444) for condition status.
- Modern theme preferred (beige map background, modern text).
- Responsive: design for 1440px+ desktop first, then adapt for 1024px.

## Naming
- Directories: lowercase with dashes (e.g., data-sources)
- Components: PascalCase (e.g., WeatherCard.tsx)
- Hooks: camelCase with use prefix (e.g., useBriefing.ts)
- Utils/lib: camelCase (e.g., nws.ts, snotel.ts)
- Database tables: snake_case
- TypeScript interfaces: PascalCase

## Map
- MapLibre GL JS, NOT Mapbox GL JS.
- Import from 'maplibre-gl', CSS from 'maplibre-gl/dist/maplibre-gl.css'.
- MapTiler style URL with env var NEXT_PUBLIC_MAPTILER_KEY.
- Terrain: AWS free tiles at 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png' with encoding: 'terrarium'.
- Map instance managed via Zustand store (src/stores/map-store.ts).

## Database
- Supabase client: @supabase/ssr for server-side, @supabase/supabase-js for client.
- Always use Row Level Security. Every table has RLS enabled.
- Spatial queries use PostGIS: ST_DWithin, ST_Distance for nearest-station lookups.
