"use client";

import { useRef, useEffect } from "react";
import maplibregl from "maplibre-gl";
import { cn } from "@/lib/utils";

interface MapContainerProps {
  className?: string;
  center?: [number, number];
  zoom?: number;
}

const MAPTILER_KEY = process.env.NEXT_PUBLIC_MAPTILER_KEY;

export function MapContainer({
  className,
  center = [-105.5, 39.5],
  zoom = 5,
}: MapContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    if (!MAPTILER_KEY) {
      console.warn("NEXT_PUBLIC_MAPTILER_KEY is not set — map will not render");
      return;
    }

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: `https://api.maptiler.com/maps/outdoor-v2/style.json?key=${MAPTILER_KEY}`,
      center,
      zoom,
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!MAPTILER_KEY) {
    return (
      <div
        data-testid="map-container"
        className={cn(
          "flex items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground",
          className
        )}
      >
        <p className="text-sm">Map requires NEXT_PUBLIC_MAPTILER_KEY</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      data-testid="map-container"
      className={cn("rounded-lg overflow-hidden border border-border", className)}
    />
  );
}
