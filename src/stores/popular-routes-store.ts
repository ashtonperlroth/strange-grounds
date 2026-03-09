import { create } from 'zustand';
import type { PopularRoute, Activity, Difficulty } from '@/lib/types/popular-route';

interface PopularRoutesState {
  view: 'list' | 'detail';
  selectedSlug: string | null;
  previewRoute: PopularRoute | null;
  filters: {
    activity: Activity | null;
    difficulty: Difficulty | null;
    region: string | null;
    inSeasonOnly: boolean;
  };
  searchQuery: string;

  setView: (view: 'list' | 'detail') => void;
  setSelectedSlug: (slug: string | null) => void;
  setPreviewRoute: (route: PopularRoute | null) => void;
  setActivityFilter: (activity: Activity | null) => void;
  setDifficultyFilter: (difficulty: Difficulty | null) => void;
  setRegionFilter: (region: string | null) => void;
  setInSeasonOnly: (inSeason: boolean) => void;
  setSearchQuery: (query: string) => void;
  openDetail: (slug: string) => void;
  goBackToList: () => void;
  reset: () => void;
}

const initialFilters = {
  activity: null as Activity | null,
  difficulty: null as Difficulty | null,
  region: null as string | null,
  inSeasonOnly: false,
};

export const usePopularRoutesStore = create<PopularRoutesState>((set) => ({
  view: 'list',
  selectedSlug: null,
  previewRoute: null,
  filters: { ...initialFilters },
  searchQuery: '',

  setView: (view) => set({ view }),
  setSelectedSlug: (slug) => set({ selectedSlug: slug }),
  setPreviewRoute: (route) => set({ previewRoute: route }),
  setActivityFilter: (activity) =>
    set((s) => ({ filters: { ...s.filters, activity } })),
  setDifficultyFilter: (difficulty) =>
    set((s) => ({ filters: { ...s.filters, difficulty } })),
  setRegionFilter: (region) =>
    set((s) => ({ filters: { ...s.filters, region } })),
  setInSeasonOnly: (inSeason) =>
    set((s) => ({ filters: { ...s.filters, inSeasonOnly: inSeason } })),
  setSearchQuery: (query) => set({ searchQuery: query }),
  openDetail: (slug) => set({ view: 'detail', selectedSlug: slug }),
  goBackToList: () => set({ view: 'list', selectedSlug: null }),
  reset: () =>
    set({
      view: 'list',
      selectedSlug: null,
      previewRoute: null,
      filters: { ...initialFilters },
      searchQuery: '',
    }),
}));
