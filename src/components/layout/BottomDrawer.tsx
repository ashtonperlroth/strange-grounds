'use client';

import { useState, type ReactNode } from 'react';
import { ChevronUp, ChevronDown, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

const COLLAPSED_HEIGHT = 40;
const EXPANDED_HEIGHT = 300;

interface BottomDrawerProps {
  children?: ReactNode;
}

export function BottomDrawer({ children }: BottomDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      className="shrink-0 border-t border-slate-700 bg-slate-900 transition-[height] duration-200 ease-in-out"
      style={{ height: isOpen ? EXPANDED_HEIGHT : COLLAPSED_HEIGHT }}
    >
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex h-10 w-full items-center gap-2 px-4 text-xs text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
      >
        <BarChart3 className="h-3.5 w-3.5" />
        <span className="font-medium">Charts &amp; Data</span>
        {isOpen ? (
          <ChevronDown className="ml-auto h-3.5 w-3.5" />
        ) : (
          <ChevronUp className="ml-auto h-3.5 w-3.5" />
        )}
      </button>

      <div
        className={cn(
          'overflow-hidden px-4 pb-3',
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      >
        {children ?? (
          <div className="flex h-[244px] items-center justify-center rounded-md border border-dashed border-slate-700 text-sm text-slate-500">
            Charts will appear here
          </div>
        )}
      </div>
    </div>
  );
}
