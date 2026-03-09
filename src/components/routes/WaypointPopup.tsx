'use client';

import { useEffect, useMemo, useRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import maplibregl from 'maplibre-gl';
import { lineString, length as turfLength } from '@turf/turf';
import type { RouteWaypoint } from '@/lib/types/route';
import { useRouteStore } from '@/stores/route-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface WaypointPopupProps {
  map: maplibregl.Map | null;
}

interface PopupCardProps {
  waypoint: RouteWaypoint;
  distanceFromStartMi: number;
}

const WAYPOINT_TYPE_OPTIONS: Array<{
  label: string;
  value: RouteWaypoint['waypointType'];
}> = [
  { label: 'Start', value: 'start' },
  { label: 'Waypoint', value: 'waypoint' },
  { label: 'Camp', value: 'camp' },
  { label: 'Pass', value: 'pass' },
  { label: 'Water Source', value: 'water' },
  { label: 'End', value: 'end' },
];

function PopupCard({ waypoint, distanceFromStartMi }: PopupCardProps) {
  const updateWaypoint = useRouteStore((s) => s.updateWaypoint);
  const removeWaypoint = useRouteStore((s) => s.removeWaypoint);
  const setSelectedWaypointId = useRouteStore((s) => s.setSelectedWaypointId);

  const elevationFeet = waypoint.elevationM
    ? Math.round(waypoint.elevationM * 3.28084)
    : null;

  return (
    <div className="w-[260px] space-y-3 p-1">
      <div className="space-y-1">
        <div className="text-xs font-semibold uppercase tracking-wide text-stone-500">
          Waypoint
        </div>
        <Input
          value={waypoint.name ?? ''}
          placeholder={`Waypoint ${waypoint.sortOrder + 1}`}
          onChange={(e) => updateWaypoint(waypoint.id, { name: e.target.value || null })}
          className="h-8 text-xs"
        />
      </div>

      <div className="space-y-1">
        <div className="text-xs font-semibold uppercase tracking-wide text-stone-500">
          Type
        </div>
        <Select
          value={waypoint.waypointType}
          onValueChange={(value) =>
            updateWaypoint(waypoint.id, {
              waypointType: value as RouteWaypoint['waypointType'],
            })
          }
        >
          <SelectTrigger className="h-8 w-full text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {WAYPOINT_TYPE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-md bg-stone-100 p-2 text-[11px] text-stone-600">
        <div>
          <div className="font-semibold text-stone-700">Elevation</div>
          <div>{elevationFeet ? `${elevationFeet.toLocaleString()} ft` : '—'}</div>
        </div>
        <div>
          <div className="font-semibold text-stone-700">From start</div>
          <div>{distanceFromStartMi.toFixed(2)} mi</div>
        </div>
      </div>

      <Button
        size="sm"
        variant="destructive"
        className="h-8 w-full text-xs"
        onClick={() => {
          removeWaypoint(waypoint.id);
          setSelectedWaypointId(null);
        }}
      >
        Delete waypoint
      </Button>
    </div>
  );
}

function distanceFromStartMiles(
  sortedWaypoints: RouteWaypoint[],
  waypointId: string,
): number {
  const index = sortedWaypoints.findIndex((wp) => wp.id === waypointId);
  if (index <= 0) return 0;
  const coords = sortedWaypoints
    .slice(0, index + 1)
    .map((wp) => wp.location.coordinates);
  if (coords.length < 2) return 0;
  return turfLength(lineString(coords), { units: 'miles' });
}

export function WaypointPopup({ map }: WaypointPopupProps) {
  const selectedWaypointId = useRouteStore((s) => s.selectedWaypointId);
  const setSelectedWaypointId = useRouteStore((s) => s.setSelectedWaypointId);
  const waypoints = useRouteStore((s) => s.waypoints);

  const popupRef = useRef<maplibregl.Popup | null>(null);
  const rootRef = useRef<Root | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const sortedWaypoints = useMemo(
    () => [...waypoints].sort((a, b) => a.sortOrder - b.sortOrder),
    [waypoints],
  );
  const selectedWaypoint = sortedWaypoints.find((wp) => wp.id === selectedWaypointId) ?? null;

  useEffect(() => {
    if (!map || !selectedWaypoint) {
      popupRef.current?.remove();
      popupRef.current = null;
      rootRef.current?.unmount();
      rootRef.current = null;
      containerRef.current = null;
      return;
    }

    if (!containerRef.current) {
      containerRef.current = document.createElement('div');
    }

    if (!rootRef.current) {
      rootRef.current = createRoot(containerRef.current);
    }

    if (!popupRef.current) {
      popupRef.current = new maplibregl.Popup({
        closeButton: true,
        closeOnClick: false,
        maxWidth: '280px',
      }).setDOMContent(containerRef.current);
      popupRef.current.on('close', () => setSelectedWaypointId(null));
      popupRef.current.addTo(map);
    }

    popupRef.current.setLngLat(selectedWaypoint.location.coordinates as [number, number]);

    rootRef.current.render(
      <PopupCard
        waypoint={selectedWaypoint}
        distanceFromStartMi={distanceFromStartMiles(
          sortedWaypoints,
          selectedWaypoint.id,
        )}
      />,
    );
  }, [map, selectedWaypoint, setSelectedWaypointId, sortedWaypoints]);

  useEffect(
    () => () => {
      popupRef.current?.remove();
      rootRef.current?.unmount();
    },
    [],
  );

  return null;
}
