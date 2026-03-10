import Link from "next/link";
import { Mountain } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#FAF7F2] text-stone-800">
      <header className="border-b border-stone-200 bg-white px-4 py-3">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm font-medium text-stone-600 transition-colors hover:text-stone-800"
        >
          <Mountain className="h-5 w-5 text-emerald-600" />
          Strange Grounds
        </Link>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-bold text-stone-900">Privacy Policy</h1>
        <p className="mt-1 text-sm text-stone-500">Last updated: March 2025</p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed">
          <section>
            <h2 className="font-semibold text-stone-800">
              What we collect
            </h2>
            <p className="mt-1 text-stone-600">
              We collect: email (if you sign up), trip data (locations, dates,
              routes), session tokens for anonymous users, and usage analytics
              via Plausible (no personal data). We use this to generate
              briefings, save trips, and improve the product.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-stone-800">Third parties</h2>
            <p className="mt-1 text-stone-600">
              Your data is shared with: Supabase (database), Anthropic (AI
              synthesis), government APIs (NWS, SNOTEL, USGS — we send
              coordinates to fetch conditions), Sentinel Hub (satellite imagery),
              and Plausible (analytics). We do not sell your data to anyone.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-stone-800">Location data</h2>
            <p className="mt-1 text-stone-600">
              We send your coordinates to external APIs (weather, snow, stream
              gauges, avalanche zones, etc.) to fetch conditions data for your
              selected locations. This is necessary to generate briefings.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-stone-800">
              Data retention
            </h2>
            <p className="mt-1 text-stone-600">
              Trips and briefings are stored until you delete them or request
              account deletion. Anonymous session data is temporary.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-stone-800">Deletion</h2>
            <p className="mt-1 text-stone-600">
              To request data deletion, delete your account in settings or
              email us. We will remove your data within 30 days.
            </p>
          </section>
        </div>

        <p className="mt-10 text-sm text-stone-500">
          <Link href="/" className="underline hover:text-stone-700">
            ← Back to app
          </Link>
          {" · "}
          <Link href="/terms" className="underline hover:text-stone-700">
            Terms of Service
          </Link>
        </p>
      </main>
    </div>
  );
}
