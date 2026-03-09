import { create } from "zustand";
import type { Route, RouteWaypoint } from "@/lib/types/route";
import type { LineString, Point, Position } from "geojson";

interface RoutePlanningContext {
  center: { lat: number; lng: number };
  bbox: [number, number, number, number];
}

interface RouteState {
  currentRoute: Route | null;
  waypoints: RouteWaypoint[];
  isDrawing: boolean;
  selectedWaypointId: string | null;
  profileHoverPosition: Position | null;

  setRoute: (route: Route, waypoints?: RouteWaypoint[]) => void;
  clearRoute: () => void;
  setIsDrawing: (drawing: boolean) => void;
  setSelectedWaypointId: (id: string | null) => void;
  setProfileHoverPosition: (position: Position | null) => void;

  addWaypoint: (point: {
    coordinates: Position;
    name?: string;
    waypointType?: RouteWaypoint["waypointType"];
    elevationM?: number;
  }) => void;
  removeWaypoint: (id: string) => void;
  moveWaypoint: (id: string, newLocation: Position) => void;
  updateWaypoint: (
    id: string,
    updates: Partial<
      Pick<RouteWaypoint, "name" | "waypointType" | "notes" | "elevationM">
    >,
  ) => void;
  reorderWaypoints: (waypoints: RouteWaypoint[]) => void;
}

function buildRouteGeometry(waypoints: RouteWaypoint[]): LineString {
  const sorted = [...waypoints].sort((a, b) => a.sortOrder - b.sortOrder);
  return {
    type: "LineString",
    coordinates: sorted.map((wp) => wp.location.coordinates),
  };
}

function makeWaypointId(): string {
  return crypto.randomUUID();
}

function makePoint(coordinates: Position): Point {
  return { type: "Point", coordinates };
}

export const useRouteStore = create<RouteState>((set) => ({
  currentRoute: null,
  waypoints: [],
  isDrawing: false,
  selectedWaypointId: null,
  profileHoverPosition: null,

  setRoute: (route, waypoints) =>
    set({
      currentRoute: route,
      waypoints: waypoints ?? [],
    }),

  clearRoute: () =>
    set({
      currentRoute: null,
      waypoints: [],
      isDrawing: false,
      selectedWaypointId: null,
      profileHoverPosition: null,
    }),

  setIsDrawing: (drawing) => set({ isDrawing: drawing }),
  setSelectedWaypointId: (id) => set({ selectedWaypointId: id }),
  setProfileHoverPosition: (position) => set({ profileHoverPosition: position }),

  addWaypoint: (point) =>
    set((state) => {
      const maxOrder = state.waypoints.reduce(
        (max, wp) => Math.max(max, wp.sortOrder),
        -1,
      );
      const newWaypoint: RouteWaypoint = {
        id: makeWaypointId(),
        routeId: state.currentRoute?.id ?? "",
        sortOrder: maxOrder + 1,
        name: point.name ?? null,
        location: makePoint(point.coordinates),
        elevationM: point.elevationM ?? null,
        waypointType: point.waypointType ?? "waypoint",
        notes: null,
      };
      const updatedWaypoints = [...state.waypoints, newWaypoint];
      const geometry = buildRouteGeometry(updatedWaypoints);
      return {
        waypoints: updatedWaypoints,
        currentRoute: state.currentRoute
          ? { ...state.currentRoute, geometry }
          : null,
      };
    }),

  removeWaypoint: (id) =>
    set((state) => {
      const updatedWaypoints = state.waypoints
        .filter((wp) => wp.id !== id)
        .map((wp, i) => ({ ...wp, sortOrder: i }));
      const geometry = buildRouteGeometry(updatedWaypoints);
      return {
        waypoints: updatedWaypoints,
        selectedWaypointId:
          state.selectedWaypointId === id ? null : state.selectedWaypointId,
        currentRoute: state.currentRoute
          ? { ...state.currentRoute, geometry }
          : null,
      };
    }),

  moveWaypoint: (id, newLocation) =>
    set((state) => {
      const updatedWaypoints = state.waypoints.map((wp) =>
        wp.id === id ? { ...wp, location: makePoint(newLocation) } : wp,
      );
      const geometry = buildRouteGeometry(updatedWaypoints);
      return {
        waypoints: updatedWaypoints,
        currentRoute: state.currentRoute
          ? { ...state.currentRoute, geometry }
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
      const geometry = buildRouteGeometry(reordered);
      return {
        waypoints: reordered,
        currentRoute: state.currentRoute
          ? { ...state.currentRoute, geometry }
          : null,
      };
    }),
}));

export function selectRouteGeometry(state: RouteState): LineString | null {
  if (state.waypoints.length < 2) return null;
  return buildRouteGeometry(state.waypoints);
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
