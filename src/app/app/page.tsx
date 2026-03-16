"use client";

import { useState } from "react";
import {
  MapPin,
  Map as MapIcon,
  AlertTriangle,
  Cloud,
  Mountain,
  Snowflake,
  Droplets,
  Flame,
  Sun,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ACTIVITY_TYPES, DATA_SOURCES } from "@/lib/constants";

const DATA_SOURCE_ICONS: Record<string, React.ElementType> = {
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

      {/* Map placeholder */}
      <div
        data-testid="map-container"
        className="w-full bg-muted rounded-lg flex items-center justify-center text-muted-foreground border border-border h-[50vh] lg:h-[70vh]"
      >
        <div className="text-center">
          <MapIcon className="mx-auto h-12 w-12 mb-2 text-muted-foreground" />
          <p className="text-sm">Map loads here (MapLibre GL JS — next issue)</p>
        </div>
      </div>

      {/* Route stats bar */}
      <div className="rounded-md bg-secondary border border-border px-4 py-2.5">
        <p className="font-mono text-sm text-muted-foreground">
          2.5 mi &nbsp;·&nbsp; 3,950 ft gain &nbsp;·&nbsp; Est. 3h 14m
        </p>
      </div>

      {/* AI headline placeholder */}
      <Card data-testid="ai-headline-card" className="bg-card border-border">
        <CardContent className="pt-4 pb-4">
          <p className="text-sm text-muted-foreground italic">
            Safety headline appears here after conditions are checked
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            0 concerns · 0 sources checked
          </p>
        </CardContent>
      </Card>

      {/* Safety cards grid */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3">
          Conditions
        </h2>
        <div
          data-testid="safety-cards-grid"
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
        >
          {DATA_SOURCES.map((source) => {
            const Icon = DATA_SOURCE_ICONS[source.id] ?? Mountain;
            return (
              <Card
                key={source.id}
                data-testid={`safety-card-${source.id}`}
                className="bg-card border-border"
              >
                <CardHeader className="pb-2 pt-4 px-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="size-7 rounded-full bg-muted flex items-center justify-center">
                        <Icon size={14} className="text-muted-foreground" />
                      </div>
                      <span className="text-xs font-medium text-foreground">
                        {source.name}
                      </span>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      —
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <p className="text-xs text-muted-foreground">
                    {source.label} data loads here
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

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
