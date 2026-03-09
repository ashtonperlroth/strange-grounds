import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Mountain, Map, Compass } from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#FAF7F2]">
      <header className="flex h-14 items-center border-b border-stone-200 bg-white px-6">
        <Link href="/" className="flex items-center gap-2">
          <Mountain className="h-5 w-5 text-emerald-600" />
          <span className="text-sm font-semibold tracking-tight text-stone-800">
            Strange Grounds
          </span>
        </Link>
        <span className="ml-auto text-sm text-stone-500">{user.email}</span>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-4 text-center">
        <div className="mb-5 flex size-20 items-center justify-center rounded-2xl bg-stone-100">
          <Map className="size-10 text-stone-300" />
        </div>
        <h2 className="mb-2 text-lg font-semibold text-stone-800">
          No saved trips yet
        </h2>
        <p className="mb-8 max-w-sm text-sm leading-relaxed text-stone-500">
          Your saved trips will appear here. Generate a conditions briefing and
          save it to track conditions over time.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
        >
          <Compass className="size-4" />
          Plan a Trip
        </Link>
      </main>
    </div>
  );
}
