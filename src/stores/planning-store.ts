import { create } from 'zustand';
import { addDays, startOfDay } from 'date-fns';

export interface PlanningLocation {
  lat: number;
  lng: number;
  name: string | null;
}

export interface DateRange {
  start: Date;
  end: Date;
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
  dateRange: DateRange;
  activity: Activity;
  activeTripId: string | null;
  activeBriefingId: string | null;
  isGenerating: boolean;

  setLocation: (location: PlanningLocation | null) => void;
  setDateRange: (dateRange: DateRange) => void;
  setActivity: (activity: Activity) => void;
  isReadyToGenerate: () => boolean;
  setActiveTripId: (id: string | null) => void;
  setActiveBriefingId: (id: string | null) => void;
  setIsGenerating: (generating: boolean) => void;
}

const today = startOfDay(new Date());

export const usePlanningStore = create<PlanningState>((set, get) => ({
  location: null,
  dateRange: { start: today, end: addDays(today, 2) },
  activity: 'Backpacking',
  activeTripId: null,
  activeBriefingId: null,
  isGenerating: false,

  setLocation: (location) => set({ location }),
  setDateRange: (dateRange) => set({ dateRange }),
  setActivity: (activity) => set({ activity }),
  isReadyToGenerate: () => {
    const { location, dateRange, activity } = get();
    return location !== null && dateRange !== null && activity.length > 0;
  },
  setActiveTripId: (id) => set({ activeTripId: id }),
  setActiveBriefingId: (id) => set({ activeBriefingId: id }),
  setIsGenerating: (generating) => set({ isGenerating: generating }),
}));
