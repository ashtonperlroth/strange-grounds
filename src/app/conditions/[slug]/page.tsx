import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import {
  getRouteBySlug,
  getPublishedPopularRoutes,
} from "@/lib/conditions/queries";
import { RouteConditionsContent } from "@/components/conditions/RouteConditionsContent";

export const revalidate = 86400;

export async function generateStaticParams() {
  try {
    const routes = await getPublishedPopularRoutes();
    return routes.map((r) => ({ slug: r.slug }));
  } catch {
    return [];
  }
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;

  try {
    const data = await getRouteBySlug(slug);
    if (!data) return { title: "Route Not Found" };

    const { route } = data;
    const activityLabel =
      route.activity === "ski_touring"
        ? "ski touring"
        : route.activity === "trail_running"
          ? "trail running"
          : route.activity;

    const title =
      route.metaTitle ??
      `${route.name} Conditions — ${route.region}, ${route.state} | Strange Grounds`;

    const description =
      route.metaDescription ??
      `Current backcountry conditions for ${route.name}. ${activityLabel.charAt(0).toUpperCase() + activityLabel.slice(1)} conditions including avalanche danger, snowpack, weather, and stream flows. Updated daily.`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        images: [{ url: `/api/og/route/${slug}` }],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
      },
    };
  } catch {
    return { title: "Route Not Found" };
  }
}

export default async function RouteConditionsPage({ params }: PageProps) {
  const { slug } = await params;

  let data;
  try {
    data = await getRouteBySlug(slug);
  } catch {
    notFound();
  }

  if (!data) notFound();

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <Link
            href="/conditions"
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
            href="/conditions"
            className="text-sm text-stone-500 transition-colors hover:text-stone-700"
          >
            All Routes
          </Link>
        </div>
      </header>

      <RouteConditionsContent
        route={data.route}
        waypoints={data.waypoints}
        briefing={data.briefing}
      />

      <footer className="border-t border-stone-200 bg-white py-8">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <p className="text-center text-xs text-stone-400">
            {data.briefing && (
              <>
                Conditions updated{" "}
                {new Date(data.briefing.generatedAt).toLocaleDateString(
                  "en-US",
                  {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  },
                )}
                .{" "}
              </>
            )}
            Data from NWS, SNOTEL, avalanche.org, USGS.
          </p>
          <div className="mt-4 flex items-center justify-center gap-4 text-xs text-stone-400">
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
        </div>
      </footer>
    </div>
  );
}
