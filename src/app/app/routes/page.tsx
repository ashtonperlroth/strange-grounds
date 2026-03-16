import { MapPin, Mountain, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const POPULAR_ROUTES = [
  {
    name: "John Muir Trail",
    region: "Sierra Nevada, CA",
    distance: "211 mi",
    elevation: "47,000 ft gain",
    season: "Jul - Oct",
  },
  {
    name: "Teton Crest Trail",
    region: "Grand Teton NP, WY",
    distance: "40 mi",
    elevation: "8,700 ft gain",
    season: "Jul - Sep",
  },
  {
    name: "Enchantments Traverse",
    region: "Cascades, WA",
    distance: "18 mi",
    elevation: "4,400 ft gain",
    season: "Jun - Oct",
  },
  {
    name: "Haute Route",
    region: "Wasatch Range, UT",
    distance: "15 mi",
    elevation: "7,800 ft gain",
    season: "Dec - Apr",
  },
  {
    name: "Rim to Rim",
    region: "Grand Canyon NP, AZ",
    distance: "21 mi",
    elevation: "10,600 ft gain",
    season: "Mar - May, Sep - Nov",
  },
  {
    name: "Wonderland Trail",
    region: "Mt. Rainier NP, WA",
    distance: "93 mi",
    elevation: "22,000 ft gain",
    season: "Jul - Sep",
  },
] as const;

import { PageHeader } from "@/components/layout/page-header";

export default function PopularRoutesPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title="Popular Routes"
        description="Classic backcountry routes with real-time conditions intelligence"
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {POPULAR_ROUTES.map((route) => (
          <Card
            key={route.name}
            className="bg-card border-border hover:border-accent/30 transition-colors"
          >
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="size-8 rounded-md bg-secondary flex items-center justify-center">
                    <Mountain size={16} className="text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">
                      {route.name}
                    </h3>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin size={10} />
                      <span>{route.region}</span>
                    </div>
                  </div>
                </div>
                <Badge variant="secondary" className="text-xs shrink-0">
                  Coming soon
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono">
                <span>{route.distance}</span>
                <span className="text-border">|</span>
                <span>{route.elevation}</span>
              </div>
              <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-muted-foreground">
                  Season: {route.season}
                </span>
                <ArrowRight
                  size={14}
                  className="text-muted-foreground/50"
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
