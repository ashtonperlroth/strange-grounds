'use client';

import { type ReactNode } from 'react';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';
import { BottomDrawer } from './BottomDrawer';

interface DashboardShellProps {
  mapSlot: ReactNode;
  briefingSlot: ReactNode;
}

export function DashboardShell({ mapSlot, briefingSlot }: DashboardShellProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ResizablePanelGroup orientation="horizontal" className="min-h-0 flex-1 bg-white">
        <ResizablePanel defaultSize={65} minSize={40}>
          <div className="h-full w-full">{mapSlot}</div>
        </ResizablePanel>

        <ResizableHandle withHandle className="bg-stone-200" />

        <ResizablePanel defaultSize={35} minSize={25}>
          <div className="h-full overflow-y-auto bg-[#FAF7F2] p-4">
            {briefingSlot}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>

      <BottomDrawer />
    </div>
  );
}
