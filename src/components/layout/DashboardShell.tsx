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
      <ResizablePanelGroup orientation="horizontal" className="min-h-0 flex-1">
        <ResizablePanel defaultSize={60} minSize={40}>
          <div className="h-full w-full">{mapSlot}</div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize={40} minSize={25}>
          <div className="h-full overflow-y-auto bg-slate-900 p-4">
            {briefingSlot}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>

      <BottomDrawer />
    </div>
  );
}
