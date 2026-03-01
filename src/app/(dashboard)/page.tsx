import { Map } from '@/components/map/Map';
import { DashboardShell } from '@/components/layout/DashboardShell';

function BriefingPlaceholder() {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-100">
        Conditions Briefing
      </h2>
      <p className="text-sm text-slate-400">
        Select a location on the map to generate a conditions briefing.
      </p>

      <div className="space-y-3">
        {(['Weather Forecast', 'Avalanche Conditions', 'Snowpack', 'Stream Flow'] as const).map(
          (section) => (
            <div
              key={section}
              className="rounded-lg border border-dashed border-slate-700 p-4"
            >
              <h3 className="text-sm font-medium text-slate-300">{section}</h3>
              <div className="mt-2 h-16 rounded bg-slate-800/50" />
            </div>
          ),
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <DashboardShell
      mapSlot={<Map />}
      briefingSlot={<BriefingPlaceholder />}
    />
  );
}
