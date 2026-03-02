import { create } from 'zustand';

export interface Viewport {
  center: [number, number];
  zoom: number;
  pitch: number;
  bearing: number;
}

export interface SelectedPoint {
  lat: number;
  lng: number;
  name?: string;
}

export interface FlyToTarget {
  center: [number, number];
  zoom?: number;
}

interface MapState {
  viewport: Viewport;
  activeOverlays: Set<string>;
  selectedPoint: SelectedPoint | null;
  flyToTarget: FlyToTarget | null;
  setViewport: (viewport: Partial<Viewport>) => void;
  toggleOverlay: (overlay: string) => void;
  setSelectedPoint: (point: SelectedPoint | null) => void;
  flyTo: (target: FlyToTarget) => void;
  clearFlyTo: () => void;
}

const DEFAULT_VIEWPORT: Viewport = {
  center: [-110.5, 40.5],
  zoom: 5,
  pitch: 50,
  bearing: -15,
};

export const useMapStore = create<MapState>((set) => ({
  viewport: DEFAULT_VIEWPORT,
  activeOverlays: new Set<string>(),
  selectedPoint: null,
  flyToTarget: null,

  setViewport: (partial) =>
    set((state) => ({
      viewport: { ...state.viewport, ...partial },
    })),

  toggleOverlay: (overlay) =>
    set((state) => {
      const next = new Set(state.activeOverlays);
      if (next.has(overlay)) {
        next.delete(overlay);
      } else {
        next.add(overlay);
      }
      return { activeOverlays: next };
    }),

  setSelectedPoint: (point) => set({ selectedPoint: point }),

  flyTo: (target) => set({ flyToTarget: target }),
  clearFlyTo: () => set({ flyToTarget: null }),
}));
