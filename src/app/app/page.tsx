"use client";

import { useState } from "react";
import {
  MapPin,
  AlertTriangle,
  Cloud,
  Mountain,
  Snowflake,
  Droplets,
  Flame,
  Sun,
} from "lucide-react";
import { MapContainer } from "@/components/map/map-container";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ACTIVITY_TYPES, DATA_SOURCES } from "@/lib/constants";
import { RouteStatsBar } from "@/components/trip/route-stats-bar";
import { SafetyBanner } from "@/components/trip/safety-banner";
import { SafetyCard } from "@/components/cards/safety-card";
import { ConditionsGrid } from "@/components/cards/conditions-grid";

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
  const [activeActivity, setActiveActivity] = useState<string>(
    ACTIVITY_TYPES[0]
  );

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Search + activity tabs row */}
      <div className="flex flex-col gap-3">
        <div className="relative">
          <MapPin
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            data-testid="location-search-hero"
            className="pl-9 h-10 bg-background border-border"
            placeholder="Describe your trip — e.g., 3-day loop from Whitney Portal..."
          />
        </div>

        <div className="flex items-center justify-between gap-4">
          <Tabs value={activeActivity} onValueChange={setActiveActivity}>
            <TabsList className="bg-secondary overflow-x-auto whitespace-nowrap max-w-full">
              {ACTIVITY_TYPES.map((type) => (
                <TabsTrigger
                  key={type}
                  value={type}
                  data-testid={`activity-tab-${type.toLowerCase().replace(/\s+/g, "-")}`}
                  className="text-xs data-[state=active]:bg-accent data-[state=active]:text-white"
                >
                  {type}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              data-testid="check-conditions-button"
              className="bg-accent text-white hover:bg-accent/90 rounded-md"
            >
              Check conditions
            </Button>
            <Button size="sm" variant="ghost" className="rounded-md">
              Share
            </Button>
          </div>
        </div>
      </div>

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
