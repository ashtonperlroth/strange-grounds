import { create } from 'zustand';
import type { RouteSegment } from '@/lib/types/route';

interface SegmentState {
  segments: RouteSegment[];
  isSegmenting: boolean;
  visible: boolean;
  error: string | null;

  setSegments: (segments: RouteSegment[]) => void;
  clearSegments: () => void;
  setIsSegmenting: (loading: boolean) => void;
  setVisible: (visible: boolean) => void;
  setError: (error: string | null) => void;
}

export const useSegmentStore = create<SegmentState>((set) => ({
  segments: [],
  isSegmenting: false,
  visible: true,
  error: null,

  setSegments: (segments) => set({ segments, error: null }),
  clearSegments: () => set({ segments: [], error: null }),
  setIsSegmenting: (isSegmenting) => set({ isSegmenting }),
  setVisible: (visible) => set({ visible }),
  setError: (error) => set({ error }),
}));
