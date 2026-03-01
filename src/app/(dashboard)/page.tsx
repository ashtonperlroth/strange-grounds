import { Map } from '@/components/map/Map';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { BriefingPanel } from '@/components/briefing/BriefingPanel';

export default function DashboardPage() {
  return (
    <DashboardShell
      mapSlot={<Map />}
      briefingSlot={<BriefingPanel />}
    />
  );
}
