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

### Testing rules

- Run `npm run build` and `npm run lint` on every issue. This is mandatory.
- Only do visual browser testing for issues tagged with `polish` or `map-layers` labels.
- For all other issues (backend, data pipeline, new API routes), build verification is sufficient. Do NOT start the dev server.
- When you do visual test: take ONE screenshot of the relevant change. Do NOT record video. Do NOT navigate through the whole app.
