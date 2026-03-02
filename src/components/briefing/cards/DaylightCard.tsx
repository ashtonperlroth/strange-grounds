'use client';

import { Sun, Sunrise, Sunset, Moon, Clock } from 'lucide-react';
import { ConditionCard } from '../ConditionCard';
import { type ConditionStatus } from '@/stores/briefing-store';
import { type DaylightData, type DaylightDay } from '@/lib/data-sources/daylight';

interface DaylightCardProps {
  data: DaylightData | null;
}

const MOON_ICONS: Record<string, string> = {
  'New Moon': '🌑',
  'Waxing Crescent': '🌒',
  'First Quarter': '🌓',
  'Waxing Gibbous': '🌔',
  'Full Moon': '🌕',
  'Waning Gibbous': '🌖',
  'Last Quarter': '🌗',
  'Waning Crescent': '🌘',
};

function getStatus(): ConditionStatus {
  return 'good';
}

function buildSummary(day: DaylightDay): string {
  const h = Math.floor(day.daylightHours);
  const m = Math.round((day.daylightHours - h) * 60);
  return `${h}h ${m}m of daylight · ${day.sunrise} – ${day.sunset}`;
}

function DayRow({ day, showDate }: { day: DaylightDay; showDate: boolean }) {
  const moonIcon = MOON_ICONS[day.moonPhaseName] ?? '🌑';

  return (
    <div className="space-y-2 border-b border-stone-100 py-2.5 last:border-b-0">
      {showDate && (
        <span className="text-[11px] font-medium text-stone-500">
          {new Date(day.date + 'T12:00:00').toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
          })}
        </span>
      )}

      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        <div className="flex items-center gap-1.5">
          <Sunrise className="size-3 text-amber-500" />
          <span className="text-xs text-stone-600">
            Sunrise {day.sunrise}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Sunset className="size-3 text-orange-500" />
          <span className="text-xs text-stone-600">
            Sunset {day.sunset}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Sun className="size-3 text-stone-400" />
          <span className="text-xs text-stone-500">
            Twilight {day.civilTwilightStart}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Sun className="size-3 text-stone-400" />
          <span className="text-xs text-stone-500">
            Dusk {day.civilTwilightEnd}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="size-3 text-stone-400" />
          <span className="text-xs text-stone-500">
            Solar noon {day.solarNoon}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Moon className="size-3 text-indigo-400" />
          <span className="text-xs text-stone-500">
            {moonIcon} {day.moonPhaseName} · {day.moonIllumination}%
          </span>
        </div>
      </div>
    </div>
  );
}

export function DaylightCard({ data }: DaylightCardProps) {
  if (!data || data.days.length === 0) {
    return (
      <ConditionCard
        category="Daylight"
        icon={<Sun className="size-4 text-amber-500" />}
        status="unknown"
        summary="Daylight data unavailable"
      />
    );
  }

  const firstDay = data.days[0];
  const status = getStatus();
  const summary = buildSummary(firstDay);
  const showDates = data.days.length > 1;

  return (
    <ConditionCard
      category="Daylight"
      icon={<Sun className="size-4 text-amber-500" />}
      status={status}
      summary={summary}
    >
      <div>
        {data.days.map((day) => (
          <DayRow key={day.date} day={day} showDate={showDates} />
        ))}
      </div>
    </ConditionCard>
  );
}
