import type maplibregl from 'maplibre-gl';

export type CursorPriority = 'drag' | 'drawing' | 'hover-feature' | 'default';

const PRIORITY_ORDER: CursorPriority[] = [
  'drag',
  'drawing',
  'hover-feature',
  'default',
];

const managers = new WeakMap<maplibregl.Map, CursorManager>();

export function getCursorManager(map: maplibregl.Map): CursorManager {
  let manager = managers.get(map);
  if (!manager) {
    manager = new CursorManager(map);
    managers.set(map, manager);
  }
  return manager;
}

class CursorManager {
  private activeCursors = new Map<CursorPriority, string>();
  private mapInstance: maplibregl.Map;

  constructor(map: maplibregl.Map) {
    this.mapInstance = map;
  }

  request(priority: CursorPriority, cursor: string): void {
    this.activeCursors.set(priority, cursor);
    this.apply();
  }

  release(priority: CursorPriority): void {
    this.activeCursors.delete(priority);
    this.apply();
  }

  private apply(): void {
    for (const p of PRIORITY_ORDER) {
      const cursor = this.activeCursors.get(p);
      if (cursor !== undefined) {
        this.mapInstance.getCanvas().style.cursor = cursor;
        return;
      }
    }
    this.mapInstance.getCanvas().style.cursor = '';
  }
}
