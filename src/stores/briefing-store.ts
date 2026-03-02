import { create } from 'zustand';

export type ConditionStatus = 'good' | 'caution' | 'concern' | 'unknown';

export type ConditionCategory =
  | 'avalanche'
  | 'weather'
  | 'snowpack'
  | 'stream_crossings'
  | 'fires'
  | 'daylight'
  | 'remoteness'
  | 'wildlife'
  | 'insects'
  | 'footing';

export interface ConditionCardData {
  category: ConditionCategory;
  status: ConditionStatus;
  summary: string;
  detail?: string;
}

export interface Briefing {
  id: string;
  trip_id: string;
  narrative: string | null;
  bottom_line: string | null;
  readiness_rationale: string | null;
  conditions: Record<string, unknown>;
  raw_data: Record<string, unknown>;
  readiness: 'green' | 'yellow' | 'red' | null;
  share_token: string | null;
  created_at: string;
}

interface BriefingState {
  currentBriefing: Briefing | null;
  isLoading: boolean;
  conditionCards: ConditionCardData[];

  setBriefing: (briefing: Briefing | null) => void;
  setIsLoading: (loading: boolean) => void;
  setConditionCards: (cards: ConditionCardData[]) => void;
  clearBriefing: () => void;
  getWarningCount: () => number;
  getCriticalCount: () => number;
}

export const useBriefingStore = create<BriefingState>((set, get) => ({
  currentBriefing: null,
  isLoading: false,
  conditionCards: [],

  setBriefing: (briefing) => set({ currentBriefing: briefing }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setConditionCards: (cards) => set({ conditionCards: cards }),
  clearBriefing: () =>
    set({ currentBriefing: null, isLoading: false, conditionCards: [] }),

  getWarningCount: () =>
    get().conditionCards.filter((c) => c.status === 'caution').length,
  getCriticalCount: () =>
    get().conditionCards.filter((c) => c.status === 'concern').length,
}));
