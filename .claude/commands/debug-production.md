# Debug Production

Diagnose production issues by checking all observability endpoints.

## Steps

### API Health Checks
1. curl the tRPC health endpoint:
   ```bash
   curl -s -o /dev/null -w "%{http_code}" https://strange-ground.vercel.app/api/trpc
   ```
2. curl the Inngest serve endpoint:
   ```bash
   curl -s -o /dev/null -w "%{http_code}" https://strange-ground.vercel.app/api/inngest
   ```
3. Report any non-200 responses

### Inngest Function Status
4. If INNGEST_EVENT_KEY is available, check recent events:
   ```bash
   curl -s "https://api.inngest.com/v1/events?limit=5" \
     -H "Authorization: Bearer $INNGEST_EVENT_KEY"
   ```
5. Report any failed, timed-out, or stuck runs
6. Check for any `briefing/requested` events that never completed

### Vercel Deployment Logs
7. If VERCEL_TOKEN is available:
   ```bash
   npx vercel logs https://strange-ground.vercel.app --token $VERCEL_TOKEN --limit 50 2>&1 | grep -i "error\|500\|404\|timeout"
   ```
8. Report any errors in recent function invocations

### Supabase Health
9. If DATABASE_URL is available, run a connectivity check:
   ```bash
   npx tsx -e "
   const postgres = (await import('postgres')).default;
   const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });
   const result = await sql\`SELECT NOW() as ts, count(*) as briefing_count FROM briefings\`;
   console.log('DB OK:', result[0]);
   await sql.end();
   "
   ```
10. Report if DB is unreachable or if briefing count is unexpectedly low

### Playwright Network Check
11. Run the debug network spec:
    ```bash
    PLAYWRIGHT_BASE_URL=https://strange-ground.vercel.app npx playwright test tests/debug-network.spec.ts --reporter=list
    ```
12. This test navigates to /app, triggers a briefing, and captures all failed API requests

### Summary
13. Compile all findings into a diagnostic report
14. Identify the most likely root cause:
    - HTTP 5xx on API routes → code/deployment issue
    - Inngest events not processing → Inngest configuration or timeout
    - DB unreachable → Supabase connectivity
    - Network requests failing in browser → CORS, auth, or routing issue
15. If the root cause is a code issue, proceed to fix it
16. If the root cause is a configuration/environment issue, report it and stop (human intervention needed)

## Required environment variables
- `DATABASE_URL` — for Supabase health check
- `INNGEST_EVENT_KEY` — for Inngest API access (optional)
- `VERCEL_TOKEN` — for Vercel log access (optional)
