import {
  Satellite,
  Cloud,
  AlertTriangle,
  Snowflake,
  Droplets,
  Flame,
  Sun,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

const DATA_SOURCE_INFO = [
  {
    name: "Sentinel-2",
    icon: Satellite,
    description:
      "ESA satellite imagery providing 10m-resolution multispectral views of terrain, snow cover, and vegetation health.",
    frequency: "Every 5 days",
  },
  {
    name: "NWS",
    icon: Cloud,
    description:
      "National Weather Service point forecasts, zone alerts, and gridded forecast data for temperature, wind, and precipitation.",
    frequency: "Hourly updates",
  },
  {
    name: "Avalanche.org",
    icon: AlertTriangle,
    description:
      "Avalanche danger ratings, problem types, and field observations from regional avalanche centers across the US.",
    frequency: "Daily forecasts",
  },
  {
    name: "SNOTEL",
    icon: Snowflake,
    description:
      "USDA snowpack telemetry stations measuring snow water equivalent, snow depth, temperature, and precipitation.",
    frequency: "Hourly telemetry",
  },
  {
    name: "USGS",
    icon: Droplets,
    description:
      "Real-time streamflow and gage height data from the USGS National Water Information System for river crossings.",
    frequency: "15-min intervals",
  },
  {
    name: "NIFC",
    icon: Flame,
    description:
      "National Interagency Fire Center active fire perimeters, prescribed burns, and fire weather outlooks.",
    frequency: "Twice daily",
  },
  {
    name: "SunCalc",
    icon: Sun,
    description:
      "Calculated sunrise, sunset, golden hour, and solar position data for trip timing and photo planning.",
    frequency: "Computed on demand",
  },
] as const;

import { PageHeader } from "@/components/layout/page-header";

export default function DataSourcesPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title="Data Sources"
        description="Strange Grounds synthesizes 7 environmental data sources into unified conditions intelligence"
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {DATA_SOURCE_INFO.map((source) => (
          <Card key={source.name} className="bg-card border-border">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-lg bg-secondary flex items-center justify-center">
                  <source.icon size={20} className="text-muted-foreground" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    {source.name}
                  </h3>
                  <p className="font-mono text-xs text-muted-foreground">
                    {source.frequency}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {source.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
