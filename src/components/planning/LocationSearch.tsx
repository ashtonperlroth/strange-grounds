'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, Search, X, Loader2 } from 'lucide-react';
import { usePlanningStore } from '@/stores/planning-store';
import { useMapStore } from '@/stores/map-store';

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

interface LocationSearchProps {
  variant?: 'compact' | 'hero';
}

export function LocationSearch({ variant = 'compact' }: LocationSearchProps) {
  const isHero = variant === 'hero';
  const [focused, setFocused] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  const abortRef = useRef<AbortController>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { location, setLocation } = usePlanningStore();
  const flyTo = useMapStore((s) => s.flyTo);

  const showDropdown = focused && query.length >= 2;

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
      setHighlightIndex(-1);
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

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setFocused(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (result: NominatimResult) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    const name = result.display_name.split(',')[0];

    setLocation({ lat, lng, name });
    flyTo({ center: [lng, lat], zoom: 11 });
    setFocused(false);
    setQuery('');
    setResults([]);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLocation(null);
    setQuery('');
    setResults([]);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || results.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex((i) => (i < results.length - 1 ? i + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((i) => (i > 0 ? i - 1 : results.length - 1));
    } else if (e.key === 'Enter' && highlightIndex >= 0) {
      e.preventDefault();
      handleSelect(results[highlightIndex]);
    } else if (e.key === 'Escape') {
      setFocused(false);
    }
  };

  const containerClass = isHero
    ? 'relative w-full'
    : 'relative min-w-[400px]';

  const inputWrapperClass = isHero
    ? 'flex h-12 items-center gap-3 rounded-xl border border-stone-200 bg-white px-4 shadow-lg shadow-stone-900/5 transition-colors focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-200'
    : 'flex h-8 items-center gap-2 rounded-md border border-stone-300 bg-white px-3 transition-colors focus-within:border-stone-400 focus-within:ring-1 focus-within:ring-stone-300';

  const iconSize = isHero ? 'h-5 w-5' : 'h-3.5 w-3.5';
  const clearIconSize = isHero ? 'h-4 w-4' : 'h-3 w-3';
  const textSize = isHero ? 'text-base' : 'text-sm';
  const placeholder = isHero ? 'Where are you headed?' : 'Search location…';

  const dropdownClass = isHero
    ? 'absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-xl'
    : 'absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-md border border-stone-200 bg-white shadow-lg';

  const dropdownItemClass = (highlighted: boolean) => isHero
    ? `flex w-full items-center gap-3 px-4 py-3 text-left ${textSize} transition-colors ${
        highlighted ? 'bg-stone-100 text-stone-800' : 'text-stone-600 hover:bg-stone-50'
      }`
    : `flex w-full items-center gap-2 px-3 py-2 text-left ${textSize} transition-colors ${
        highlighted ? 'bg-stone-100 text-stone-800' : 'text-stone-600 hover:bg-stone-50'
      }`;

  return (
    <div ref={containerRef} className={containerClass}>
      <div className={inputWrapperClass}>
        {location && !focused ? (
          <>
            <MapPin className={`${iconSize} shrink-0 text-emerald-600`} />
            <button
              type="button"
              className={`flex-1 truncate text-left ${textSize} text-stone-700`}
              onClick={() => {
                setFocused(true);
                setQuery('');
                setTimeout(() => inputRef.current?.focus(), 0);
              }}
            >
              {location.name ?? `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`}
            </button>
            <X
              className={`${clearIconSize} shrink-0 cursor-pointer text-stone-400 hover:text-stone-600`}
              onClick={handleClear}
            />
          </>
        ) : (
          <>
            <Search className={`${iconSize} shrink-0 text-stone-400`} />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setFocused(true)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className={`flex-1 bg-transparent ${textSize} text-stone-700 placeholder:text-stone-500 focus:outline-none`}
            />
            {loading && <Loader2 className={`${iconSize} shrink-0 animate-spin text-stone-400`} />}
          </>
        )}
      </div>

      {showDropdown && (
        <div className={dropdownClass}>
          {loading && results.length === 0 && (
            <div className={`px-4 py-3 text-center ${textSize} text-stone-400`}>
              Searching…
            </div>
          )}
          {!loading && results.length === 0 && (
            <div className={`px-4 py-3 text-center ${textSize} text-stone-400`}>
              No locations found.
            </div>
          )}
          {results.map((result, i) => (
            <button
              key={result.place_id}
              type="button"
              className={dropdownItemClass(i === highlightIndex)}
              onMouseEnter={() => setHighlightIndex(i)}
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(result);
              }}
            >
              <MapPin className={`${iconSize} shrink-0 text-stone-400`} />
              <span className="truncate">{result.display_name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
