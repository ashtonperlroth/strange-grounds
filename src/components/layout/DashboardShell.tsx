'use client';

import { type ReactNode, useState, useEffect } from 'react';
import { BottomDrawer } from './BottomDrawer';
import { MobileBottomSheet } from './MobileBottomSheet';
import { usePlanningStore } from '@/stores/planning-store';
import { usePopularRoutesStore } from '@/stores/popular-routes-store';
import { cn } from '@/lib/utils';

type LayoutMode = 'desktop' | 'tablet' | 'mobile';

function useLayoutMode(): LayoutMode {
  const [mode, setMode] = useState<LayoutMode>('desktop');

  useEffect(() => {
    function update() {
      const w = window.innerWidth;
      if (w < 768) setMode('mobile');
      else if (w < 1024) setMode('tablet');
      else setMode('desktop');
    }
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return mode;
}

interface DashboardShellProps {
  mapSlot: ReactNode;
  briefingSlot: ReactNode;
  routesPanelSlot?: ReactNode;
  drawerSlot?: ReactNode;
}

export function DashboardShell({ mapSlot, briefingSlot, routesPanelSlot, drawerSlot }: DashboardShellProps) {
  const activeBriefingId = usePlanningStore((s) => s.activeBriefingId);
  const isGenerating = usePlanningStore((s) => s.isGenerating);
  const routesPanelOpen = usePopularRoutesStore((s) => s.panelOpen);
  const showBriefing = activeBriefingId !== null || isGenerating;
  const layoutMode = useLayoutMode();
  const showRoutesPanel = !showBriefing && routesPanelOpen && !!routesPanelSlot;
  const showSidePanel = showBriefing || (showRoutesPanel && layoutMode !== 'mobile');

  const sidePanelContent = showBriefing
    ? briefingSlot
    : showRoutesPanel
      ? routesPanelSlot
      : null;

  if (layoutMode === 'mobile') {
    return (
      <div className="relative flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1">{mapSlot}</div>
        <MobileBottomSheet isVisible={showBriefing}>
          {briefingSlot}
        </MobileBottomSheet>
      </div>
    );
  }

  if (layoutMode === 'tablet' && showBriefing) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1">{mapSlot}</div>
        <div className="h-[45vh] shrink-0 overflow-y-auto overscroll-contain border-t border-stone-200 bg-[#FAF7F2] p-4">
          {briefingSlot}
        </div>
        {drawerSlot && <BottomDrawer>{drawerSlot}</BottomDrawer>}
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1">
        <div className="min-h-0 flex-1">{mapSlot}</div>
        <div
          className={cn(
            'shrink-0 overflow-hidden transition-[width,border-width,padding] duration-300 ease-out',
            showSidePanel
              ? 'w-[40%] max-w-lg border-l border-stone-200 bg-[#FAF7F2] p-4'
              : 'w-0 border-l-0 p-0',
          )}
        >
          {showSidePanel && (
            <div className="h-full overflow-y-auto overflow-x-hidden overscroll-contain">
              {sidePanelContent}
            </div>
          )}
        </div>
      </div>
      {showBriefing && drawerSlot && <BottomDrawer>{drawerSlot}</BottomDrawer>}
    </div>
  );
}
