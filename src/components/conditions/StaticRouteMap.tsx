"use client";

import { useEffect, useRef } from "react";
import type { PopularRoute, PopularRouteWaypoint } from "@/lib/types/popular-route";

interface StaticRouteMapProps {
  route: PopularRoute;
  waypoints: PopularRouteWaypoint[];
}

export function StaticRouteMap({ route, waypoints }: StaticRouteMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    if (route.geometry.coordinates.length < 2) return;

    let cancelled = false;

    import("maplibre-gl").then((maplibregl) => {
      if (cancelled || !containerRef.current) return;

      const coords = route.geometry.coordinates;
      let minLng = Infinity,
        maxLng = -Infinity,
        minLat = Infinity,
        maxLat = -Infinity;
      for (const [lng, lat] of coords) {
        minLng = Math.min(minLng, lng);
        maxLng = Math.max(maxLng, lng);
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
      }

      const maptilerKey = process.env.NEXT_PUBLIC_MAPTILER_KEY ?? "";
      const map = new maplibregl.Map({
        container: containerRef.current,
        style: `https://api.maptiler.com/maps/outdoor-v2/style.json?key=${maptilerKey}`,
        bounds: [
          [minLng, minLat],
          [maxLng, maxLat],
        ],
        fitBoundsOptions: { padding: 40 },
        interactive: false,
        attributionControl: false,
      });

      mapRef.current = map;

      map.on("load", () => {
        map.addSource("route", {
          type: "geojson",
          data: {
            type: "Feature",
            properties: {},
            geometry: route.geometry,
          },
        });

        map.addLayer({
          id: "route-line-shadow",
          type: "line",
          source: "route",
          layout: { "line-join": "round", "line-cap": "round" },
          paint: {
            "line-color": "#000000",
            "line-width": 5,
            "line-opacity": 0.15,
          },
        });

        map.addLayer({
          id: "route-line",
          type: "line",
          source: "route",
          layout: { "line-join": "round", "line-cap": "round" },
          paint: {
            "line-color": "#059669",
            "line-width": 3,
          },
        });

        const waypointFeatures = waypoints.map((wp) => ({
          type: "Feature" as const,
          properties: {
            name: wp.name,
            type: wp.waypointType,
          },
          geometry: wp.location,
        }));

        if (waypointFeatures.length > 0) {
          map.addSource("waypoints", {
            type: "geojson",
            data: { type: "FeatureCollection", features: waypointFeatures },
          });

          map.addLayer({
            id: "waypoints",
            type: "circle",
            source: "waypoints",
            paint: {
              "circle-radius": 5,
              "circle-color": "#ffffff",
              "circle-stroke-color": "#059669",
              "circle-stroke-width": 2,
            },
          });
        }
      });
    });

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [route, waypoints]);

  if (route.geometry.coordinates.length < 2) {
    return null;
  }

  return (
    <div className="overflow-hidden rounded-lg border border-stone-200">
      <div
        ref={containerRef}
        className="h-64 w-full sm:h-80"
        aria-label={`Map showing ${route.name} route`}
      />
    </div>
  );
}
