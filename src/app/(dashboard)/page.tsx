import { Map } from '@/components/map/Map';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { BriefingPanel } from '@/components/briefing/BriefingPanel';
import { DrawerCharts } from '@/components/charts/DrawerCharts';
import { MapErrorBoundary, BriefingPanelErrorBoundary } from './error-boundaries';

export default function DashboardPage() {
  return (
    <DashboardShell
      mapSlot={
        <MapErrorBoundary>
          <Map />
        </MapErrorBoundary>
      }
      briefingSlot={
        <BriefingPanelErrorBoundary>
          <BriefingPanel />
        </BriefingPanelErrorBoundary>
      }
      drawerSlot={<DrawerCharts />}
    />
  );
}
