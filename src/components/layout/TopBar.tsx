'use client';

import { Mountain, Search, CalendarDays, User } from 'lucide-react';

export function TopBar() {
  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-slate-700 bg-slate-800 px-4">
      <div className="flex items-center gap-2">
        <Mountain className="h-5 w-5 text-emerald-400" />
        <span className="text-sm font-semibold tracking-tight text-slate-100">
          Strange Grounds
        </span>
      </div>

      <div className="flex w-full max-w-md items-center gap-2 px-4">
        <div className="flex h-8 flex-1 items-center gap-2 rounded-md border border-slate-600 bg-slate-700/50 px-3 text-sm text-slate-400">
          <Search className="h-3.5 w-3.5 shrink-0" />
          <span>Search location&hellip;</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-slate-300 hover:bg-slate-700"
        >
          <CalendarDays className="h-3.5 w-3.5" />
          <span>Mar 1 – 3</span>
        </button>

        <div className="h-4 w-px bg-slate-700" />

        <button
          type="button"
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-slate-300 hover:bg-slate-700"
        >
          <span>Backpacking</span>
        </button>

        <div className="h-4 w-px bg-slate-700" />

        <button
          type="button"
          className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-700 text-slate-300 hover:bg-slate-600"
        >
          <User className="h-3.5 w-3.5" />
        </button>
      </div>
    </header>
  );
}
