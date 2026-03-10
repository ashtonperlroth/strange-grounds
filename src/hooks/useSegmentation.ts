import { useEffect, useRef, useCallback } from 'react';
import type { LineString } from 'geojson';
import { selectRouteGeometry, useRouteStore } from '@/stores/route-store';
import { useSegmentStore } from '@/stores/segment-store';
import { sampleElevationAlongRoute } from '@/lib/routes/dem-sampler';
import { decomposeRoute } from '@/lib/routes/segmentation';
import type { RouteSegment } from '@/lib/types/route';

const DEBOUNCE_MS = 1500;
const MIN_COORDS_FOR_SEGMENTATION = 4;

function toRouteSegments(
  computed: ReturnType<typeof decomposeRoute>,
  routeId: string,
): RouteSegment[] {
  return computed.map((seg, i) => ({
    id: `local-${i}`,
    routeId,
    segmentOrder: seg.segmentOrder,
    geometry: seg.geometry,
    distanceM: seg.distanceM,
    elevationGainM: seg.elevationGainM,
    elevationLossM: seg.elevationLossM,
    avgSlopeDegrees: seg.avgSlopeDegrees,
    dominantAspect: seg.dominantAspect,
    maxSlopeDegrees: seg.maxSlopeDegrees,
    terrainType: seg.terrainType,
    hazardLevel: null,
    hazardNotes: null,
  }));
}

export function useSegmentation() {
  const routeGeometry = useRouteStore(selectRouteGeometry);
  const currentRoute = useRouteStore((s) => s.currentRoute);
  const { setSegments, clearSegments, setIsSegmenting, setError } =
    useSegmentStore();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  const abortRef = useRef<AbortController | null>(null);
  const lastGeometryRef = useRef<string | null>(null);

  const runSegmentation = useCallback(
    async (geometry: LineString, routeId: string) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsSegmenting(true);
      setError(null);

      try {
        const samples = await sampleElevationAlongRoute(geometry, 75);
        if (controller.signal.aborted) return;

        const computed = decomposeRoute(samples, geometry);
        if (controller.signal.aborted) return;

        setSegments(toRouteSegments(computed, routeId));
      } catch (err) {
        if (controller.signal.aborted) return;
        const message = err instanceof Error ? err.message : 'Segmentation failed';
        setError(message);
        console.error('[segmentation]', message);
      } finally {
        if (!controller.signal.aborted) {
          setIsSegmenting(false);
        }
      }
    },
    [setSegments, setIsSegmenting, setError],
  );

  useEffect(() => {
    if (!routeGeometry || routeGeometry.coordinates.length < MIN_COORDS_FOR_SEGMENTATION) {
      clearSegments();
      lastGeometryRef.current = null;
      return;
    }

    const key = JSON.stringify(routeGeometry.coordinates);
    if (key === lastGeometryRef.current) return;
    lastGeometryRef.current = key;

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      runSegmentation(routeGeometry, currentRoute?.id ?? '');
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [routeGeometry, currentRoute?.id, runSegmentation, clearSegments]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return {
    runSegmentationNow: () => {
      if (routeGeometry && routeGeometry.coordinates.length >= MIN_COORDS_FOR_SEGMENTATION) {
        runSegmentation(routeGeometry, currentRoute?.id ?? '');
      }
    },
  };
}
