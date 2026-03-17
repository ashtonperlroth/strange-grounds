"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import maplibregl from "maplibre-gl";
import { cn } from "@/lib/utils";
import { LayerSwitcher } from "@/components/map/layer-switcher";

const MAPTILER_KEY = process.env.NEXT_PUBLIC_MAPTILER_KEY;

const MAP_STYLES = [
  { id: "outdoor", label: "Outdoor", url: `https://api.maptiler.com/maps/outdoor-v2/style.json?key=${MAPTILER_KEY}` },
  { id: "satellite", label: "Satellite", url: `https://api.maptiler.com/maps/satellite/style.json?key=${MAPTILER_KEY}` },
  { id: "topo", label: "Topo", url: `https://api.maptiler.com/maps/topo-v2/style.json?key=${MAPTILER_KEY}` },
] as const;

interface MapContainerProps {
  className?: string;
  center?: [number, number];
  zoom?: number;
}

export function MapContainer({
  className,
  center = [-105.5, 39.5],
  zoom = 5,
}: MapContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [activeStyle, setActiveStyle] = useState("outdoor");

  const addTerrain = useCallback((map: maplibregl.Map) => {
    if (map.getSource("terrain-dem")) return;
    map.addSource("terrain-dem", {
      type: "raster-dem",
      url: `https://api.maptiler.com/tiles/terrain-rgb-v2/tiles.json?key=${MAPTILER_KEY}`,
      tileSize: 256,
    });
    map.setTerrain({ source: "terrain-dem", exaggeration: 1.2 });
  }, []);

  const [webglError, setWebglError] = useState(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    if (!MAPTILER_KEY) return;

    try {
      const map = new maplibregl.Map({
        container: containerRef.current,
        style: MAP_STYLES[0].url,
        center,
        zoom,
      });

      // Controls
      map.addControl(new maplibregl.NavigationControl(), "bottom-right");
      map.addControl(new maplibregl.ScaleControl(), "bottom-left");
      map.addControl(
        new maplibregl.GeolocateControl({
          positionOptions: { enableHighAccuracy: true },
          trackUserLocation: true,
        }),
        "bottom-right"
      );

      // 3D terrain
      map.on("load", () => addTerrain(map));

      mapRef.current = map;

      return () => {
        map.remove();
        mapRef.current = null;
      };
    } catch {
      setWebglError(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleStyleChange(styleId: string) {
    const map = mapRef.current;
    const style = MAP_STYLES.find((s) => s.id === styleId);
    if (!map || !style) return;

    setActiveStyle(styleId);
    map.setStyle(style.url);

    // Re-add terrain after style change
    if (styleId !== "satellite") {
      map.once("style.load", () => addTerrain(map));
    }
  }

  if (!MAPTILER_KEY || webglError) {
    return (
      <div
        data-testid="map-container"
        className={cn(
          "flex items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground",
          className
        )}
      >
        <p className="text-sm">
          {webglError ? "WebGL is not available" : "Map requires NEXT_PUBLIC_MAPTILER_KEY"}
        </p>
      </div>
    );
  }

  return (
    <div className={cn("relative rounded-lg overflow-hidden border border-border", className)}>
      <div ref={containerRef} data-testid="map-container" className="absolute inset-0" />

      {/* Layer switcher */}
      <LayerSwitcher
        options={MAP_STYLES.map((s) => ({ id: s.id, label: s.label }))}
        activeId={activeStyle}
        onChange={handleStyleChange}
        className="absolute top-3 right-3 z-10"
      />
    </div>
  );
}
