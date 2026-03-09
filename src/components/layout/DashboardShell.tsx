'use client';

import { type ReactNode, useState, useEffect, useCallback, useRef } from 'react';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';
import { BottomDrawer } from './BottomDrawer';
import { usePlanningStore } from '@/stores/planning-store';
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
  const location = usePlanningStore((s) => s.location);
  const showBriefing = activeBriefingId !== null || isGenerating;
  const layoutMode = useLayoutMode();
  const showRoutesPanel = !showBriefing && !location && routesPanelSlot;

  if (!showBriefing && !showRoutesPanel) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1">{mapSlot}</div>
      </div>
    );
  }

  if (showRoutesPanel && !showBriefing) {
    if (layoutMode === 'mobile') {
      return (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1">{mapSlot}</div>
        </div>
      );
    }

    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <ResizablePanelGroup orientation="horizontal" className="min-h-0 flex-1 bg-white">
          <ResizablePanel defaultSize={65} minSize={40}>
            <div className="h-full w-full">{mapSlot}</div>
          </ResizablePanel>

          <ResizableHandle withHandle className="bg-stone-200 transition-colors hover:bg-emerald-200" />

          <ResizablePanel defaultSize={35} minSize={25}>
            <div className="h-full overflow-y-auto bg-[#FAF7F2] p-4">
              {routesPanelSlot}
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    );
  }

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

  if (layoutMode === 'tablet') {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1">{mapSlot}</div>
        <div className="h-[45vh] shrink-0 overflow-y-auto border-t border-stone-200 bg-[#FAF7F2] p-4">
          {briefingSlot}
        </div>
        <BottomDrawer>{drawerSlot}</BottomDrawer>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ResizablePanelGroup orientation="horizontal" className="min-h-0 flex-1 bg-white">
        <ResizablePanel defaultSize={65} minSize={40}>
          <div className="h-full w-full">{mapSlot}</div>
        </ResizablePanel>

        <ResizableHandle withHandle className="bg-stone-200 transition-colors hover:bg-emerald-200" />

        <ResizablePanel defaultSize={35} minSize={25}>
          <div className="h-full overflow-y-auto bg-[#FAF7F2] p-4">
            {briefingSlot}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>

      <BottomDrawer>{drawerSlot}</BottomDrawer>
    </div>
  );
}
