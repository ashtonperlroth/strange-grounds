## Cursor Cloud specific instructions

This repository (`strange-grounds`) is a **Backcountry Conditions Intelligence Platform** built with Next.js 15 (App Router), TypeScript, and Tailwind CSS.

### How to install dependencies

```bash
npm install
```

### How to run

```bash
npm run dev    # Start development server
npm run build  # Production build
npm run start  # Start production server
```

### How to lint

```bash
npm run lint
```

### Project structure

- `src/app/` — Pages and route handlers (App Router)
- `src/components/` — UI components organized by domain (map/, briefing/, charts/, planning/, layout/, ui/)
- `src/lib/` — Library code (supabase/, data-sources/, synthesis/, terrain/, trpc/, inngest/)
- `src/hooks/` — Custom React hooks
- `src/stores/` — Zustand state stores

### Key conventions

- See `.cursor/rules/project.md` for full project conventions
- See `.cursor/rules/issues.md` for issue execution rules
- Use named exports (except page.tsx which needs default)
- Server Components by default; only add `'use client'` when interactivity is needed
- Tailwind utility classes only — no CSS modules or styled-components
- Environment variables: server-only vars have no prefix, client vars use `NEXT_PUBLIC_` prefix
- Copy `.env.local.example` to `.env.local` and fill in values before running

### Database migrations

When you create or modify a file in `supabase/migrations/`:
- You MUST apply it to the database immediately after creating it.
- Run the migration directly using the DATABASE_URL environment variable:
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
- Replace YOUR_FILE.sql with the actual filename you created.
- If the migration fails, fix the SQL and retry before proceeding with code changes.
- Use IF NOT EXISTS / IF EXISTS guards in all DDL statements so migrations are safe to re-run.

### Scope rules
- Only modify files explicitly mentioned in the issue description.
- Do not add new features, refactor code, or fix "nearby" bugs that aren't in the issue.
- If the issue says "Files to modify: A.tsx, B.ts" — only modify A.tsx and B.ts.
- If you think something else needs fixing, add a comment to the Linear issue describing what you found. Do not fix it yourself.

### Testing rules

- Run `npm run build` and `npm run lint` on every issue. This is mandatory.
- Only do visual browser testing for issues tagged with `polish` or `map-layers` labels.
- For all other issues (backend, data pipeline, new API routes), build verification is sufficient. Do NOT start the dev server.
- When you do visual test: take ONE screenshot of the relevant change. Do NOT record video. Do NOT navigate through the whole app.
