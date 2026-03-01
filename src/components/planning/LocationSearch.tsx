'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, Search, X } from 'lucide-react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { usePlanningStore } from '@/stores/planning-store';
import { useMapStore } from '@/stores/map-store';

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

export function LocationSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  const abortRef = useRef<AbortController>(null);

  const { location, setLocation } = usePlanningStore();
  const flyTo = useMapStore((s) => s.flyTo);

  const searchNominatim = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    try {
      const params = new URLSearchParams({
        q,
        format: 'json',
        limit: '5',
        countrycodes: 'us',
      });
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?${params}`,
        { signal: controller.signal },
      );
      const data: NominatimResult[] = await res.json();
      setResults(data);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchNominatim(query), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, searchNominatim]);

  const handleSelect = (result: NominatimResult) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    const name = result.display_name.split(',')[0];

    setLocation({ lat, lng, name });
    flyTo({ center: [lng, lat], zoom: 11 });
    setOpen(false);
    setQuery('');
    setResults([]);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLocation(null);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex h-8 min-w-[180px] max-w-[260px] flex-1 items-center gap-2 rounded-md border border-slate-600 bg-slate-700/50 px-3 text-sm transition-colors hover:border-slate-500 hover:bg-slate-700"
        >
          {location ? (
            <>
              <MapPin className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
              <span className="truncate text-slate-200">{location.name}</span>
              <X
                className="ml-auto h-3 w-3 shrink-0 text-slate-400 hover:text-slate-200"
                onClick={handleClear}
              />
            </>
          ) : (
            <>
              <Search className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <span className="text-slate-400">Search location&hellip;</span>
            </>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[320px] border-slate-600 bg-slate-800 p-0"
        align="start"
      >
        <Command
          className="bg-transparent"
          shouldFilter={false}
        >
          <CommandInput
            placeholder="Search US locations..."
            value={query}
            onValueChange={setQuery}
            className="text-slate-200"
          />
          <CommandList>
            {loading && (
              <div className="px-4 py-3 text-center text-sm text-slate-400">
                Searching...
              </div>
            )}
            {!loading && query.length >= 2 && results.length === 0 && (
              <CommandEmpty className="text-slate-400">
                No locations found.
              </CommandEmpty>
            )}
            {results.length > 0 && (
              <CommandGroup>
                {results.map((result) => (
                  <CommandItem
                    key={result.place_id}
                    value={String(result.place_id)}
                    onSelect={() => handleSelect(result)}
                    className="cursor-pointer text-slate-200 aria-selected:bg-slate-700"
                  >
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <span className="truncate">{result.display_name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
