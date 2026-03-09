import { create } from 'zustand';
import type { Feature, FeatureCollection, LineString, Point, Position } from 'geojson';
import type { Route, RouteWaypoint } from '@/lib/types/route';
import {
  buildStraightSegment,
  interpolateAlongTrail,
} from '@/lib/routes/trail-interpolation';

interface RoutePlanningContext {
  center: { lat: number; lng: number };
  bbox: [number, number, number, number];
}

export interface SnappedTrailReference {
  trailId: string;
  trail: Feature<LineString>;
}

interface RouteState {
  currentRoute: Route | null;
  waypoints: RouteWaypoint[];
  isDrawing: boolean;
  selectedWaypointId: string | null;
  profileHoverPosition: Position | null;
  derivedGeometry: LineString | null;
  trailNetwork: FeatureCollection<LineString>;
  snapToTrailsEnabled: boolean;
  snappedWaypoints: Record<string, SnappedTrailReference>;

  setRoute: (route: Route, waypoints?: RouteWaypoint[]) => void;
  clearRoute: () => void;
  setIsDrawing: (drawing: boolean) => void;
  setSelectedWaypointId: (id: string | null) => void;
  setProfileHoverPosition: (position: Position | null) => void;
  setTrailNetwork: (trails: FeatureCollection<LineString>) => void;
  setSnapToTrailsEnabled: (enabled: boolean) => void;

  addWaypoint: (point: {
    coordinates: Position;
    name?: string;
    waypointType?: RouteWaypoint['waypointType'];
    elevationM?: number;
    snappedTrail?: SnappedTrailReference;
  }) => void;
  removeWaypoint: (id: string) => void;
  moveWaypoint: (id: string, newLocation: Position) => void;
  updateWaypoint: (
    id: string,
    updates: Partial<
      Pick<RouteWaypoint, 'name' | 'waypointType' | 'notes' | 'elevationM'>
    >,
  ) => void;
  reorderWaypoints: (waypoints: RouteWaypoint[]) => void;
}

const EMPTY_TRAIL_COLLECTION: FeatureCollection<LineString> = {
  type: 'FeatureCollection',
  features: [],
};

function appendSegment(
  coordinates: Position[],
  segment: LineString,
): void {
  if (segment.coordinates.length < 2) return;
  if (coordinates.length === 0) {
    coordinates.push(...segment.coordinates);
    return;
  }
  coordinates.push(...segment.coordinates.slice(1));
}

function segmentForWaypoints(
  from: RouteWaypoint,
  to: RouteWaypoint,
  snaps: Record<string, SnappedTrailReference>,
): LineString {
  const fromSnap = snaps[from.id];
  const toSnap = snaps[to.id];

  if (!fromSnap || !toSnap || fromSnap.trailId !== toSnap.trailId) {
    return buildStraightSegment(from.location.coordinates, to.location.coordinates);
  }

  try {
    const segment = interpolateAlongTrail(
      [from.location.coordinates[0], from.location.coordinates[1]],
      [to.location.coordinates[0], to.location.coordinates[1]],
      fromSnap.trail,
    );
    if (segment.coordinates.length >= 2) return segment;
  } catch {
    // Fall back to straight segment if trail slicing fails.
  }

  return buildStraightSegment(from.location.coordinates, to.location.coordinates);
}

function buildRouteGeometry(
  waypoints: RouteWaypoint[],
  snaps: Record<string, SnappedTrailReference>,
): LineString | null {
  const sorted = [...waypoints].sort((a, b) => a.sortOrder - b.sortOrder);
  if (sorted.length < 2) return null;

  const coordinates: Position[] = [];
  for (let index = 1; index < sorted.length; index += 1) {
    const from = sorted[index - 1];
    const to = sorted[index];
    const segment = segmentForWaypoints(from, to, snaps);
    appendSegment(coordinates, segment);
  }

  return {
    type: 'LineString',
    coordinates,
  };
}

function makeWaypointId(): string {
  return crypto.randomUUID();
}

function makePoint(coordinates: Position): Point {
  return { type: 'Point', coordinates };
}

export const useRouteStore = create<RouteState>((set) => ({
  currentRoute: null,
  waypoints: [],
  isDrawing: false,
  selectedWaypointId: null,
  profileHoverPosition: null,
  derivedGeometry: null,
  trailNetwork: EMPTY_TRAIL_COLLECTION,
  snapToTrailsEnabled: true,
  snappedWaypoints: {},

  setRoute: (route, waypoints) =>
    set({
      currentRoute: route,
      waypoints: waypoints ?? [],
      snappedWaypoints: {},
      derivedGeometry:
        route.geometry.coordinates.length >= 2
          ? route.geometry
          : buildRouteGeometry(waypoints ?? [], {}),
    }),

  clearRoute: () =>
    set({
      currentRoute: null,
      waypoints: [],
      isDrawing: false,
      selectedWaypointId: null,
      profileHoverPosition: null,
      derivedGeometry: null,
      snappedWaypoints: {},
    }),

  setIsDrawing: (drawing) => set({ isDrawing: drawing }),
  setSelectedWaypointId: (id) => set({ selectedWaypointId: id }),
  setProfileHoverPosition: (position) => set({ profileHoverPosition: position }),
  setTrailNetwork: (trailNetwork) => set({ trailNetwork }),
  setSnapToTrailsEnabled: (enabled) => set({ snapToTrailsEnabled: enabled }),

  addWaypoint: (point) =>
    set((state) => {
      const maxOrder = state.waypoints.reduce(
        (max, wp) => Math.max(max, wp.sortOrder),
        -1,
      );
      const newWaypoint: RouteWaypoint = {
        id: makeWaypointId(),
        routeId: state.currentRoute?.id ?? '',
        sortOrder: maxOrder + 1,
        name: point.name ?? null,
        location: makePoint(point.coordinates),
        elevationM: point.elevationM ?? null,
        waypointType: point.waypointType ?? 'waypoint',
        notes: null,
      };
      const updatedWaypoints = [...state.waypoints, newWaypoint];
      const updatedSnaps = { ...state.snappedWaypoints };
      if (point.snappedTrail) {
        updatedSnaps[newWaypoint.id] = point.snappedTrail;
      }
      const geometry = buildRouteGeometry(updatedWaypoints, updatedSnaps);
      return {
        waypoints: updatedWaypoints,
        snappedWaypoints: updatedSnaps,
        derivedGeometry: geometry,
        currentRoute: state.currentRoute
          ? {
              ...state.currentRoute,
              geometry: geometry ?? state.currentRoute.geometry,
            }
          : null,
      };
    }),

  removeWaypoint: (id) =>
    set((state) => {
      const updatedWaypoints = state.waypoints
        .filter((wp) => wp.id !== id)
        .map((wp, i) => ({ ...wp, sortOrder: i }));
      const updatedSnaps = { ...state.snappedWaypoints };
      delete updatedSnaps[id];
      const geometry = buildRouteGeometry(updatedWaypoints, updatedSnaps);
      return {
        waypoints: updatedWaypoints,
        snappedWaypoints: updatedSnaps,
        derivedGeometry: geometry,
        selectedWaypointId:
          state.selectedWaypointId === id ? null : state.selectedWaypointId,
        currentRoute: state.currentRoute
          ? {
              ...state.currentRoute,
              geometry: geometry ?? state.currentRoute.geometry,
            }
          : null,
      };
    }),

  moveWaypoint: (id, newLocation) =>
    set((state) => {
      const updatedWaypoints = state.waypoints.map((wp) =>
        wp.id === id ? { ...wp, location: makePoint(newLocation) } : wp,
      );
      const updatedSnaps = { ...state.snappedWaypoints };
      delete updatedSnaps[id];
      const geometry = buildRouteGeometry(updatedWaypoints, updatedSnaps);
      return {
        waypoints: updatedWaypoints,
        snappedWaypoints: updatedSnaps,
        derivedGeometry: geometry,
        currentRoute: state.currentRoute
          ? {
              ...state.currentRoute,
              geometry: geometry ?? state.currentRoute.geometry,
            }
          : null,
      };
    }),

  updateWaypoint: (id, updates) =>
    set((state) => ({
      waypoints: state.waypoints.map((wp) =>
        wp.id === id ? { ...wp, ...updates } : wp,
      ),
    })),

  reorderWaypoints: (waypoints) =>
    set((state) => {
      const reordered = waypoints.map((wp, i) => ({
        ...wp,
        sortOrder: i,
      }));
      const geometry = buildRouteGeometry(reordered, state.snappedWaypoints);
      return {
        waypoints: reordered,
        derivedGeometry: geometry,
        currentRoute: state.currentRoute
          ? {
              ...state.currentRoute,
              geometry: geometry ?? state.currentRoute.geometry,
            }
          : null,
      };
    }),
}));

export function selectRouteGeometry(state: RouteState): LineString | null {
  return state.derivedGeometry;
}

export function selectRoutePlanningContext(
  state: RouteState,
): RoutePlanningContext | null {
  const geometry = selectRouteGeometry(state);
  if (!geometry || geometry.coordinates.length === 0) return null;

  let minLng = Number.POSITIVE_INFINITY;
  let minLat = Number.POSITIVE_INFINITY;
  let maxLng = Number.NEGATIVE_INFINITY;
  let maxLat = Number.NEGATIVE_INFINITY;
  let sumLng = 0;
  let sumLat = 0;

  for (const [lng, lat] of geometry.coordinates) {
    minLng = Math.min(minLng, lng);
    minLat = Math.min(minLat, lat);
    maxLng = Math.max(maxLng, lng);
    maxLat = Math.max(maxLat, lat);
    sumLng += lng;
    sumLat += lat;
  }

  const count = geometry.coordinates.length;
  return {
    center: { lng: sumLng / count, lat: sumLat / count },
    bbox: [minLng, minLat, maxLng, maxLat],
  };
}
