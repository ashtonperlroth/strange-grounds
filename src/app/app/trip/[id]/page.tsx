import { Map, ShieldAlert, Thermometer, Mountain, Clock, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/page-header";

interface TripPageProps {
  params: Promise<{ id: string }>;
}

export default async function TripPage({ params }: TripPageProps) {
  const { id } = await params;

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title={`Trip briefing for ${id}`}
        description="Conditions intelligence and safety assessment"
        actions={<Badge variant="secondary">Draft</Badge>}
      />

      {/* Map area placeholder */}
      <div
        className="w-full bg-muted rounded-lg flex items-center justify-center text-muted-foreground border border-border"
        style={{ height: "40vh" }}
      >
        <div className="text-center">
          <Map className="mx-auto h-10 w-10 mb-2 text-muted-foreground" />
          <p className="text-sm">Route map renders here</p>
        </div>
      </div>

      {/* Route stats bar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { icon: TrendingUp, label: "Distance", value: "--" },
          { icon: Mountain, label: "Elevation Gain", value: "--" },
          { icon: Clock, label: "Est. Time", value: "--" },
          { icon: Thermometer, label: "High / Low", value: "-- / --" },
        ].map((stat) => (
          <Card key={stat.label} className="bg-card border-border">
            <CardContent className="flex items-center gap-3 py-3 px-4">
              <div className="size-8 rounded-md bg-secondary flex items-center justify-center">
                <stat.icon size={16} className="text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className="font-mono text-sm font-medium text-foreground">
                  {stat.value}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Safety headline */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <ShieldAlert size={16} className="text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">
              Safety Headline
            </h2>
          </div>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-3/4 mb-2" />
          <Skeleton className="h-4 w-1/2" />
          <p className="text-xs text-muted-foreground mt-3">
            AI-generated safety assessment loads after conditions are fetched
          </p>
        </CardContent>
      </Card>

      {/* Conditions cards placeholder */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3">
          Conditions
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {["Weather", "Snowpack", "Avalanche", "Streamflow", "Fire", "Solar", "Satellite"].map(
            (source) => (
              <Card key={source} className="bg-card border-border">
                <CardHeader className="pb-2 pt-4 px-4">
                  <span className="text-xs font-medium text-foreground">
                    {source}
                  </span>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <Skeleton className="h-3 w-full mb-2" />
                  <Skeleton className="h-3 w-2/3" />
                </CardContent>
              </Card>
            )
          )}
        </div>
      </div>
    </div>
  );
}
