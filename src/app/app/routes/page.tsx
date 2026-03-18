import { PageHeader } from "@/components/layout/page-header";
import { RouteCard } from "@/components/cards/route-card";
import {
  BentoGrid,
  BentoCard,
} from "@/components/ui/bento-grid";

const POPULAR_ROUTES = [
  {
    name: "John Muir Trail",
    location: "Sierra Nevada, CA",
    distance: "211 mi",
    elevationGain: "47,000 ft gain",
    season: "Jul - Oct",
  },
  {
    name: "Teton Crest Trail",
    location: "Grand Teton NP, WY",
    distance: "40 mi",
    elevationGain: "9,700 ft gain",
    season: "Jul - Sep",
  },
  {
    name: "Enchantments Traverse",
    location: "Cascades, WA",
    distance: "18 mi",
    elevationGain: "4,400 ft gain",
    season: "Jun - Oct",
  },
  {
    name: "Haute Route",
    location: "Wasatch Range, UT",
    distance: "15 mi",
    elevationGain: "7,800 ft gain",
    season: "Dec - Apr",
  },
  {
    name: "Rim to Rim",
    location: "Grand Canyon NP, AZ",
    distance: "21 mi",
    elevationGain: "10,600 ft gain",
    season: "Mar - May, Sep - Nov",
  },
  {
    name: "Wonderland Trail",
    location: "Mt. Rainier NP, WA",
    distance: "93 mi",
    elevationGain: "22,000 ft gain",
    season: "Jul - Sep",
  },
] as const;

export default function PopularRoutesPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title="Popular Routes"
        description="Classic backcountry routes with real-time conditions intelligence"
      />

      <BentoGrid className="rounded-2xl border-border">
        {POPULAR_ROUTES.map((route) => (
          <BentoCard
            key={route.name}
            className="border-b border-r border-border last:border-b-0 md:col-span-3 sm:[&:nth-last-child(-n+2)]:border-b-0"
          >
            <RouteCard
              name={route.name}
              location={route.location}
              distance={route.distance}
              elevationGain={route.elevationGain}
              season={route.season}
              status="coming-soon"
              className="border-0"
            />
          </BentoCard>
        ))}
      </BentoGrid>
    </div>
  );
}
