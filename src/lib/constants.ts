import {
  House,
  PlusCircle,
  Bookmark,
  Map,
  Database,
  Settings,
} from "lucide-react";

export const NAV_ITEMS = [
  { href: "/app", label: "Home", icon: House },
  { href: "/app?new=true", label: "New Trip", icon: PlusCircle },
  { href: "/app/saved", label: "Saved Trips", icon: Bookmark },
  { href: "/app/routes", label: "Popular Routes", icon: Map },
] as const;

export const RESOURCE_ITEMS = [
  { href: "/app/sources", label: "Data Sources", icon: Database },
  { href: "/app/settings", label: "Settings", icon: Settings },
] as const;

export const ACTIVITY_TYPES = [
  "Backpacking",
  "Day Hike",
  "Ski Touring",
  "Mountaineering",
  "Trail Running",
] as const;

export const DATA_SOURCES = [
  { id: "sentinel-2", name: "Sentinel-2", label: "Satellite" },
  { id: "nws", name: "NWS", label: "Weather" },
  { id: "avalanche-org", name: "Avalanche.org", label: "Avalanche" },
  { id: "snotel", name: "SNOTEL", label: "Snowpack" },
  { id: "usgs", name: "USGS", label: "Streamflow" },
  { id: "nifc", name: "NIFC", label: "Fire" },
  { id: "suncalc", name: "SunCalc", label: "Solar" },
] as const;
