'use client';

import { type ReactNode, useState, useEffect, useCallback, useRef } from 'react';
import { BottomDrawer } from './BottomDrawer';
import { usePlanningStore } from '@/stores/planning-store';
import { usePopularRoutesStore } from '@/stores/popular-routes-store';
import { ChevronUp, FileText } from 'lucide-react';
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

function MobileBottomSheet({
  children,
  isVisible,
}: {
  children: ReactNode;
  isVisible: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startYRef.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const deltaY = startYRef.current - e.changedTouches[0].clientY;
    if (deltaY > 50) setIsExpanded(true);
    else if (deltaY < -50) setIsExpanded(false);
  }, []);

  if (!isVisible) return null;

  return (
    <div
      ref={sheetRef}
      className={cn(
        'absolute inset-x-0 bottom-0 z-30 flex flex-col rounded-t-2xl bg-[#FAF7F2] shadow-[0_-4px_24px_rgba(0,0,0,0.12)] transition-[max-height] duration-300 ease-out',
        isExpanded ? 'max-h-[85vh]' : 'max-h-[48px]',
      )}
    >
      <button
        type="button"
        onClick={() => setIsExpanded((v) => !v)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="flex shrink-0 items-center justify-center gap-2 px-4 py-3"
        aria-label={isExpanded ? 'Collapse briefing panel' : 'Expand briefing panel'}
      >
        <div className="h-1 w-8 rounded-full bg-stone-300" />
        {!isExpanded && (
          <span className="flex items-center gap-1.5 text-xs font-medium text-stone-500">
            <FileText className="size-3.5" />
            Briefing
            <ChevronUp className="size-3.5" />
          </span>
        )}
      </button>

      <div
        className={cn(
          'flex-1 overflow-y-auto overscroll-contain px-4 pb-6 transition-opacity duration-200',
          isExpanded ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      >
        {children}
      </div>
    </div>
  );
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
        <div className="h-[45vh] shrink-0 overflow-y-auto border-t border-stone-200 bg-[#FAF7F2] p-4">
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
              ? 'w-[35%] max-w-md border-l border-stone-200 bg-[#FAF7F2] p-4'
              : 'w-0 border-l-0 p-0',
          )}
        >
          {showSidePanel && (
            <div className="h-full overflow-y-auto">
              {sidePanelContent}
            </div>
          )}
        </div>
      </div>
      {showBriefing && drawerSlot && <BottomDrawer>{drawerSlot}</BottomDrawer>}
    </div>
  );
}
