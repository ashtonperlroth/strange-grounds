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
      className="shrink-0 border-t border-stone-200 bg-white transition-[height] duration-200 ease-in-out"
      style={{ height: isOpen ? EXPANDED_HEIGHT : COLLAPSED_HEIGHT }}
      role="region"
      aria-label="Charts and data"
    >
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex h-10 w-full items-center gap-2 px-4 text-xs text-stone-500 transition-colors hover:bg-stone-50 hover:text-stone-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500"
        aria-expanded={isOpen}
        aria-controls="drawer-content"
      >
        <BarChart3 className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="font-medium">Charts &amp; Data</span>
        {isOpen ? (
          <ChevronDown className="ml-auto h-3.5 w-3.5" aria-hidden="true" />
        ) : (
          <ChevronUp className="ml-auto h-3.5 w-3.5" aria-hidden="true" />
        )}
      </button>

      <div
        id="drawer-content"
        className={cn(
          'overflow-hidden px-4 pb-3 transition-opacity duration-200',
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        aria-hidden={!isOpen}
      >
        {children ?? (
          <div className="flex h-[244px] items-center justify-center rounded-md border border-dashed border-stone-200 text-sm text-stone-400">
            Charts will appear here
          </div>
        )}
      </div>
    </div>
  );
}
