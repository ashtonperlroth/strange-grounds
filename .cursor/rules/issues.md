# Issue Execution Rules
1. Read the full issue description and all comments before starting.
2. Check existing code patterns before creating new ones.
3. Run npm run build before committing to catch type errors.
4. If the issue references another file as a pattern to follow, read that file first.
5. Create small, focused commits with descriptive messages.
6. If you need a new dependency, add it to package.json and note it in the PR.
7. Never hardcode API keys. Use environment variables.
8. Add TypeScript types for all data structures. No any types.
9. When you create or modify a file in `supabase/migrations/`:
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
