# strange-grounds

Backcountry Conditions Intelligence Platform — synthesize multi-source environmental data into actionable briefings.

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.local.example .env.local
```

Fill in your Supabase credentials (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`) and other API keys.

### 3. Apply database migrations

Run the setup endpoint to apply migrations (starts the dev server first, or use the Supabase dashboard):

```bash
npm run dev
# In another terminal:
curl -X POST http://localhost:3000/api/setup
```

### 4. Seed station data

Seed SNOTEL stations, USGS stream gauges, and avalanche zone boundaries into the database:

```bash
npm run seed
```

This downloads ~900 SNOTEL stations from NRCS, active USGS streamflow gauges for western US states (UT, CO, WA, OR, CA, MT, WY, ID), and inserts UAC + CAIC avalanche zone boundaries. The script is idempotent and safe to re-run.

### 5. Start development server

```bash
npm run dev
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run seed` | Seed SNOTEL, USGS, and avalanche zone data |
