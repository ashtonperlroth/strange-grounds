import type { Metadata } from "next";
import Link from "next/link";
import { getRoutesWithBriefings } from "@/lib/conditions/queries";
import { ConditionsIndexContent } from "@/components/conditions/ConditionsIndexContent";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Backcountry Conditions — All Routes | Strange Grounds",
  description:
    "Current backcountry conditions for popular routes. Avalanche danger, snowpack, weather, stream flows, and more. Updated daily.",
  openGraph: {
    title: "Backcountry Conditions — All Routes | Strange Grounds",
    description:
      "Current backcountry conditions for popular routes. Avalanche danger, snowpack, weather, stream flows, and more. Updated daily.",
  },
};

export default async function ConditionsIndexPage() {
  let routesWithBriefings: Awaited<ReturnType<typeof getRoutesWithBriefings>>;
  try {
    routesWithBriefings = await getRoutesWithBriefings();
  } catch {
    routesWithBriefings = [];
  }

  const regions = [
    ...new Set(routesWithBriefings.map((r) => r.route.region)),
  ].sort();
  const activities = [
    ...new Set(routesWithBriefings.map((r) => r.route.activity)),
  ].sort();

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-medium text-stone-600 transition-colors hover:text-stone-900"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#059669"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m8 3 4 8 5-5 5 15H2L8 3z" />
            </svg>
            Strange Grounds
          </Link>
          <Link
            href="/"
            className="text-sm text-stone-500 transition-colors hover:text-stone-700"
          >
            Dashboard
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">
            Backcountry Conditions
          </h1>
          <p className="mt-2 text-lg text-stone-500">
            Current conditions for popular backcountry routes. Updated daily
            from NWS, SNOTEL, avalanche.org, and USGS.
          </p>
        </div>

        <ConditionsIndexContent
          routes={routesWithBriefings}
          regions={regions}
          activities={activities}
        />
      </div>

      <footer className="border-t border-stone-200 bg-white py-6">
        <div className="mx-auto flex max-w-6xl items-center justify-center gap-4 px-4 text-xs text-stone-400 sm:px-6">
          <Link
            href="/privacy"
            className="transition-colors hover:text-stone-600"
          >
            Privacy
          </Link>
          <span aria-hidden="true">&middot;</span>
          <Link
            href="/terms"
            className="transition-colors hover:text-stone-600"
          >
            Terms
          </Link>
        </div>
      </footer>
    </div>
  );
}
