import { create } from 'zustand';
import { addDays, startOfDay } from 'date-fns';
import type { LineString } from 'geojson';

export interface PlanningLocation {
  lat: number;
  lng: number;
  name: string | null;
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface PlanningRouteContext {
  center: {
    lat: number;
    lng: number;
  };
  bbox: [number, number, number, number];
  geometry: LineString;
}

export const ACTIVITIES = [
  'Ski Touring',
  'Backpacking',
  'Day Hike',
  'Mountaineering',
  'Trail Running',
] as const;

export type Activity = (typeof ACTIVITIES)[number];

interface PlanningState {
  location: PlanningLocation | null;
  routeContext: PlanningRouteContext | null;
  dateRange: DateRange;
  activity: Activity;
  activeTripId: string | null;
  activeBriefingId: string | null;
  isGenerating: boolean;
  generationError: string | null;

  setLocation: (location: PlanningLocation | null) => void;
  setRouteContext: (routeContext: PlanningRouteContext | null) => void;
  setDateRange: (dateRange: DateRange) => void;
  setActivity: (activity: Activity) => void;
  isReadyToGenerate: () => boolean;
  setActiveTripId: (id: string | null) => void;
  setActiveBriefingId: (id: string | null) => void;
  setIsGenerating: (generating: boolean) => void;
  setGenerationError: (error: string | null) => void;
}

const today = startOfDay(new Date());

export const usePlanningStore = create<PlanningState>((set, get) => ({
  location: null,
  routeContext: null,
  dateRange: { start: today, end: addDays(today, 2) },
  activity: 'Backpacking',
  activeTripId: null,
  activeBriefingId: null,
  isGenerating: false,
  generationError: null,

  setLocation: (location) => set({ location }),
  setRouteContext: (routeContext) => set({ routeContext }),
  setDateRange: (dateRange) => set({ dateRange }),
  setActivity: (activity) => set({ activity }),
  isReadyToGenerate: () => {
    const { location, routeContext, dateRange, activity } = get();
    return (location !== null || routeContext !== null) && dateRange !== null && activity.length > 0;
  },
  setActiveTripId: (id) => set({ activeTripId: id }),
  setActiveBriefingId: (id) => set({ activeBriefingId: id }),
  setIsGenerating: (generating) => set({ isGenerating: generating }),
  setGenerationError: (error) => set({ generationError: error }),
}));
