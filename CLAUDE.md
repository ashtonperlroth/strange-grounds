# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Strange Grounds** — Backcountry Conditions Intelligence Platform. Synthesizes multi-source environmental data (weather, snowpack, avalanche, stream flows, fires, satellite imagery) into AI-generated briefings for backcountry travel.

## Commands

```bash
npm run dev          # Start dev server at localhost:3000
npm run build        # Production build (run before committing to catch type errors)
npm run lint         # ESLint
npm run seed         # Seed SNOTEL, USGS, avalanche zones, popular routes into DB
```

**Apply a migration:**
```bash
npx tsx -e "
const postgres = (await import('postgres')).default;
const { readFileSync } = await import('fs');
const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });
await sql.unsafe(readFileSync('supabase/migrations/YOUR_FILE.sql', 'utf-8'));
await sql.end();
console.log('Migration applied successfully');
"
```

**First-time setup:**
1. `cp .env.local.example .env.local` and fill in secrets
2. `npm run dev`
3. `curl -X POST http://localhost:3000/api/setup` (run migrations)
4. `npm run seed`

## Architecture

**Stack:** Next.js 16 App Router · TypeScript · Supabase (Postgres + PostGIS) · tRPC · Zustand · Inngest · Anthropic Claude API · MapLibre GL JS

### Key Rules

- **Server by default.** All server logic lives in Next.js Route Handlers or Server Components — no separate backend. Add `'use client'` only when interactivity is needed.
- **Data fetching** happens in Server Components or tRPC Route Handlers, never in `useEffect`.
- **Environment variables:** no prefix = server-only. `NEXT_PUBLIC_` = safe for client.
- **Maps:** MapLibre GL JS (not Mapbox). Import from `maplibre-gl`, CSS from `maplibre-gl/dist/maplibre-gl.css`. MapTiler for basemap tiles. Terrain via AWS free tiles at `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png` with `encoding: 'terrarium'`. Map instance is managed in `src/stores/map-store.ts`.
- **Database:** Always enable RLS on every table. Use PostGIS (`ST_DWithin`, `ST_Distance`) for nearest-station lookups. Supabase: `@supabase/ssr` for server, `@supabase/supabase-js` for client. Use `IF NOT EXISTS` / `IF EXISTS` guards in all DDL.
- **Styling:** Tailwind utility classes only — no CSS modules, no styled-components. Condition status colors: green `#22c55e`, yellow `#eab308`, red `#ef4444`. Desktop-first at 1440px+, adapt to 1024px.
- **No `any` types.** Add TypeScript types for all data structures.

### Directory Layout

| Path | Purpose |
|------|---------|
| `src/app/` | Next.js App Router pages and API routes |
| `src/app/api/trpc/` | tRPC HTTP handler |
| `src/app/api/stream-narrative/` | SSE endpoint for Claude streaming |
| `src/app/api/inngest/` | Inngest background job handler |
| `src/components/{domain}/` | UI components grouped by domain |
| `src/lib/data-sources/` | External API adapters (NWS, SNOTEL, USGS, etc.) |
| `src/lib/synthesis/` | Claude prompts + response parsing |
| `src/lib/trpc/` | tRPC router, context, middleware, rate limiting |
| `src/lib/inngest/` | Inngest client + background functions |
| `src/lib/supabase/` | Supabase client factories (admin, server, client) |
| `src/hooks/` | React hooks (`useNarrativeStream`, `useRealtimeBriefing`, etc.) |
| `src/stores/` | Zustand stores (planning, briefing, map, route) |
| `supabase/migrations/` | Ordered SQL migration files |

### Data Source Adapter Pattern

Every file in `src/lib/data-sources/` follows this shape:
```typescript
interface [Source]Data { /* typed response */ }
interface [Source]Options { lat: number; lng: number; /* source-specific params */ }
export async function fetch[Source](options: [Source]Options): Promise<[Source]Data> {
  // 1. Check data_cache table in Supabase
  // 2. If cache miss or expired, fetch from external API
  // 3. Parse and type the response
  // 4. Cache result with appropriate TTL
  // 5. Return typed data
}
```

### Briefing Generation Flow

1. User creates a trip → tRPC call triggers `briefing/requested` Inngest event
2. `generate-briefing.ts` fetches all data sources in parallel (with per-source timeouts)
3. Bundled conditions sent to Claude via `src/lib/synthesis/briefing.ts`
4. Narrative streamed back to client via SSE at `/api/stream-narrative`
5. Final briefing stored in `briefings` table; realtime subscription (`useRealtimeBriefing`) updates UI

### tRPC Procedures

- `publicProcedure` — no auth
- `protectedProcedure` — requires authenticated session; rejects with UNAUTHORIZED otherwise

### Naming Conventions

- Directories: `lowercase-with-dashes`
- Components: `PascalCase`
- Hooks: `camelCase` with `use` prefix
- Utils/lib: `camelCase`
- DB tables: `snake_case`
- TypeScript interfaces: `PascalCase`
- Named exports everywhere except `page.tsx` (which needs default export)

## Sub-Agent Routing Rules

**Parallel dispatch** (ALL conditions must be met):
- 3+ independent tasks with no shared files
- No dependencies between tasks
- Clear file boundaries with no overlap

**Sequential dispatch** (ANY condition triggers):
- Tasks have dependencies (B needs output from A)
- Shared files or state (merge conflict risk)
- Unclear scope (need diagnosis before implementation)

**Background dispatch** (use for non-blocking work):
- Research or analysis tasks
- Code review after implementation
- Running tests while working on something else

## Automated Verification

After every implementation, run this sequence:
1. `npm run build` — must pass with zero errors
2. `npm run lint` — must pass
3. `npm run test:smoke` — Playwright smoke tests must pass
4. If smoke tests fail, fix implementation (never modify tests), iterate up to 3 times

## Slash Commands

- `/fix-issue STR-XX` — Read one issue from Linear, implement with full verification
- `/ship-issues STR-XX STR-YY STR-ZZ` — Read multiple issues, auto-detect parallelism, execute with agent team if safe

## Scope Discipline

**Only modify files explicitly mentioned in the task.** If you find a related bug in a nearby file, note it in a commit message or PR comment — do not fix it. Scope creep is the #1 cause of regressions in this project.

## Migrations

When creating or modifying a file in `supabase/migrations/`:
- Apply it to the database immediately after creating it (use the command above)
- Fix any SQL errors before proceeding with code changes
- All DDL must use `IF NOT EXISTS` / `IF EXISTS` guards for safe re-runs
