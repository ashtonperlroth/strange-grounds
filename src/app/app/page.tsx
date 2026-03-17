"use client";

import {
  AlertTriangle,
  Cloud,
  Mountain,
  Snowflake,
  Droplets,
  Flame,
  Sun,
} from "lucide-react";
import { MapContainer } from "@/components/map/map-container";
import { DATA_SOURCES } from "@/lib/constants";
import { RouteStatsBar } from "@/components/trip/route-stats-bar";
import { SafetyBanner } from "@/components/trip/safety-banner";
import { SafetyCard } from "@/components/cards/safety-card";
import { ConditionsGrid } from "@/components/cards/conditions-grid";
import { AppToolbar } from "@/components/layout/app-toolbar";

import type { LucideIcon } from "lucide-react";

const DATA_SOURCE_ICONS: Record<string, LucideIcon> = {
  "sentinel-2": Mountain,
  nws: Cloud,
  "avalanche-org": AlertTriangle,
  snotel: Snowflake,
  usgs: Droplets,
  nifc: Flame,
  suncalc: Sun,
};

export default function NewTripPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Unified toolbar: search + activity dropdown + check conditions */}
      <AppToolbar />

      {/* Map */}
      <MapContainer className="w-full h-[50vh] lg:h-[70vh]" />

      {/* Route stats bar */}
      <RouteStatsBar
        stats={[
          { label: "distance", value: "2.5 mi" },
          { label: "gain", value: "3,950 ft gain" },
          { label: "time", value: "Est. 3h 14m" },
        ]}
      />

      {/* AI headline placeholder */}
      <SafetyBanner concerns={0} sourcesChecked={0} />

      {/* Safety cards grid */}
      <ConditionsGrid>
        {DATA_SOURCES.map((source) => {
          const Icon = DATA_SOURCE_ICONS[source.id] ?? Mountain;
          return (
            <SafetyCard
              key={source.id}
              source={source.id}
              title={source.name}
              icon={Icon}
              badge="info"
              badgeLabel="—"
              subtitle={`${source.label} data loads here`}
            />
          );
        })}
      </ConditionsGrid>

      {/* Recent trips */}
      <div data-testid="recent-trips-section">
        <h2 className="text-sm font-semibold text-foreground mb-3">
          Recent Trips
        </h2>
        <p className="text-sm text-muted-foreground">
          No trips yet. Search a location to get started.
        </p>
      </div>
    </div>
  );
}
