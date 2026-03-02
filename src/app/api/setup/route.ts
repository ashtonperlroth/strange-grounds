import { NextResponse } from "next/server";
import postgres from "postgres";
import { readFileSync } from "fs";
import { join } from "path";

export const dynamic = "force-dynamic";

export async function POST() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return NextResponse.json(
      { error: "DATABASE_URL environment variable is not set" },
      { status: 500 },
    );
  }

  const sql = postgres(databaseUrl, { ssl: "require", max: 1 });

  const results: string[] = [];

  try {
    const migrationsDir = join(process.cwd(), "supabase", "migrations");
    const files = [
      "001_initial_schema.sql",
      "002_usgs_station_rpc.sql",
      "003_snotel_avalanche_rpcs.sql",
    ];

    for (const file of files) {
      try {
        const migration = readFileSync(join(migrationsDir, file), "utf-8");
        await sql.unsafe(migration);
        results.push(`✓ ${file}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("already exists")) {
          results.push(`⊘ ${file} (already applied)`);
        } else {
          throw err;
        }
      }
    }

    const triggerSql = `
      CREATE OR REPLACE FUNCTION public.handle_new_user()
      RETURNS trigger
      LANGUAGE plpgsql
      SECURITY DEFINER SET search_path = ''
      AS $$
      BEGIN
        INSERT INTO public.profiles (id)
        VALUES (new.id)
        ON CONFLICT (id) DO NOTHING;
        RETURN new;
      END;
      $$;

      DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
      CREATE TRIGGER on_auth_user_created
        AFTER INSERT ON auth.users
        FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
    `;
    await sql.unsafe(triggerSql);
    results.push("✓ Profile auto-creation trigger");

    const backfill = await sql`
      INSERT INTO public.profiles (id)
      SELECT id FROM auth.users
      WHERE id NOT IN (SELECT id FROM public.profiles)
    `;
    results.push(`✓ Backfilled ${backfill.count} missing profile(s)`);

    return NextResponse.json({ success: true, results });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: message, results },
      { status: 500 },
    );
  } finally {
    await sql.end();
  }
}
