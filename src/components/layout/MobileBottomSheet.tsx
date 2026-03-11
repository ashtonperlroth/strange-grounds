'use client';

import { type ReactNode, useState, useCallback } from 'react';
import { Drawer } from 'vaul';
import { FileText, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePlanningStore } from '@/stores/planning-store';
import { useBriefingStore } from '@/stores/briefing-store';
import { ReadinessIndicator } from '@/components/briefing/ReadinessIndicator';

const SNAP_COLLAPSED = 0.12;
const SNAP_HALF = 0.5;
const SNAP_FULL = 1;
const SNAP_POINTS: (string | number)[] = [SNAP_COLLAPSED, SNAP_HALF, SNAP_FULL];

interface MobileBottomSheetProps {
  children: ReactNode;
  isVisible: boolean;
}

export function MobileBottomSheet({ children, isVisible }: MobileBottomSheetProps) {
  const [snap, setSnap] = useState<string | number | null>(SNAP_COLLAPSED);
  const location = usePlanningStore((s) => s.location);
  const readiness = useBriefingStore((s) => s.currentBriefing?.readiness ?? null);
  const isCollapsed = snap === SNAP_COLLAPSED;

  const handleOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setSnap(SNAP_COLLAPSED);
    }
  }, []);

  if (!isVisible) return null;

  return (
    <Drawer.Root
      open
      onOpenChange={handleOpenChange}
      modal={false}
      snapPoints={SNAP_POINTS}
      activeSnapPoint={snap}
      setActiveSnapPoint={setSnap}
      dismissible={false}
    >
      <Drawer.Portal>
        <Drawer.Content
          className="fixed inset-x-0 bottom-0 z-30 flex flex-col rounded-t-2xl bg-[#FAF7F2] shadow-[0_-4px_24px_rgba(0,0,0,0.12)] outline-none"
          aria-label="Briefing panel"
        >
          <button
            type="button"
            onClick={() =>
              setSnap((prev) =>
                prev === SNAP_COLLAPSED
                  ? SNAP_HALF
                  : prev === SNAP_HALF
                    ? SNAP_FULL
                    : SNAP_COLLAPSED,
              )
            }
            className="flex shrink-0 flex-col items-center gap-1 px-4 pb-1 pt-3"
            aria-label={isCollapsed ? 'Expand briefing panel' : 'Collapse briefing panel'}
          >
            <Drawer.Handle className="!w-10 !bg-stone-300" />
            {isCollapsed && (
              <div className="flex items-center gap-2 py-1">
                {readiness ? (
                  <ReadinessIndicator readiness={readiness} />
                ) : (
                  <FileText className="size-3.5 text-stone-400" />
                )}
                <span className="max-w-[200px] truncate text-xs font-medium text-stone-600">
                  {location?.name ?? 'Briefing'}
                </span>
                <ChevronUp className="size-3.5 text-stone-400" />
              </div>
            )}
          </button>

          <div
            className={cn(
              'flex-1 overflow-y-auto overscroll-contain px-4 pb-8',
              isCollapsed && 'pointer-events-none opacity-0',
            )}
          >
            {children}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
