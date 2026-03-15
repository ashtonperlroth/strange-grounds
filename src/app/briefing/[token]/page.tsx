import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { ReadinessIndicator } from "@/components/briefing/ReadinessIndicator";
import { BriefingSummary } from "@/components/briefing/BriefingSummary";
import { ConditionCardsSection } from "@/components/briefing/ConditionCardsSection";

const ACTIVITY_LABELS: Record<string, string> = {
  backpacking: "Backpacking",
  ski_touring: "Ski Touring",
  mountaineering: "Mountaineering",
  trail_running: "Trail Running",
  hiking: "Hiking",
};

interface PageProps {
  params: Promise<{ token: string }>;
}

async function getSharedBriefing(token: string) {
  const admin = createAdminClient();

  const { data: briefing } = await admin
    .from("briefings")
    .select("*")
    .eq("share_token", token)
    .single();

  if (!briefing) return null;

  const { data: trip } = await admin
    .from("trips")
    .select("location_name, activity, start_date, end_date")
    .eq("id", briefing.trip_id)
    .single();

  return { briefing, trip };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { token } = await params;
  const data = await getSharedBriefing(token);

  if (!data) return { title: "Briefing Not Found | Strange Grounds" };

  const { briefing, trip } = data;
  const activity = ACTIVITY_LABELS[trip?.activity ?? ""] ?? "Backcountry";
  const locationName = trip?.location_name ?? "Unknown Location";
  const title = `${locationName} — ${activity} Conditions | Strange Grounds`;
  const description =
    (briefing.bottom_line as string | null) ??
    `${activity} conditions briefing for ${locationName}. Includes weather, avalanche, snowpack, and stream data.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: `/api/og/briefing/${token}` }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function SharedBriefingPage({ params }: PageProps) {
  const { token } = await params;
  const data = await getSharedBriefing(token);

  if (!data || !(data.briefing.narrative as string | null)) notFound();

  const { briefing, trip } = data;

  const readiness = briefing.readiness as "green" | "yellow" | "red" | null;
  const narrative = briefing.narrative as string | null;
  const bottomLine = briefing.bottom_line as string | null;
  const readinessRationale = briefing.readiness_rationale as string | null;
  const conditions = briefing.conditions as Record<string, unknown>;
  const activity = ACTIVITY_LABELS[trip?.activity ?? ""] ?? "Backcountry";
  const locationName = trip?.location_name ?? "Unknown Location";

  const startDate = trip?.start_date
    ? new Date(trip.start_date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;
  const endDate = trip?.end_date
    ? new Date(trip.end_date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  // Derive progress: mark all known condition sources as fetched
  const progress: Record<string, unknown> = {
    weatherFetched: !!conditions.weather,
    snowpackFetched: !!conditions.snowpack,
    avalancheFetched: !!conditions.avalanche,
    streamFlowFetched: !!conditions.streamFlow,
    firesFetched: !!conditions.fires,
    daylightFetched: !!conditions.daylight,
  };

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-stone-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold text-stone-800">
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
            href="/dashboard"
            className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-700"
          >
            Plan your own trip →
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6">
        {/* Trip header */}
        <div className="mb-6 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-stone-900">{locationName}</h1>
              <p className="mt-0.5 text-sm text-stone-500">
                {activity}
                {startDate && (
                  <>
                    {" · "}
                    {startDate}
                    {endDate && endDate !== startDate && ` – ${endDate}`}
                  </>
                )}
              </p>
            </div>
            {readiness && (
              <div className="shrink-0 pt-0.5">
                <ReadinessIndicator readiness={readiness} />
              </div>
            )}
          </div>

          <p className="text-[11px] text-stone-400">
            Shared briefing — generated by Strange Grounds
          </p>
        </div>

        {/* Narrative */}
        <div className="mb-6 rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
          <BriefingSummary
            bottomLine={bottomLine}
            narrative={narrative}
            readinessRationale={readinessRationale}
          />
        </div>

        {/* Condition cards */}
        <ConditionCardsSection
          conditions={conditions}
          progress={progress}
          allConditionsComplete={true}
        />

        {/* Footer CTA */}
        <div className="mt-8 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
          <p className="mb-2 text-sm font-medium text-emerald-800">
            Plan your own backcountry trip
          </p>
          <p className="mb-3 text-xs text-emerald-700">
            Generate AI-powered conditions briefings with weather, avalanche, snowpack, and route analysis.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
          >
            Get started →
          </Link>
        </div>
      </main>
    </div>
  );
}
