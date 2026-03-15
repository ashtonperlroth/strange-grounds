import { TRPCProvider } from '@/components/providers/TRPCProvider';
import { DashboardLayoutShell } from '@/components/layout/DashboardLayoutShell';

export default function TripsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TRPCProvider>
      <DashboardLayoutShell>{children}</DashboardLayoutShell>
    </TRPCProvider>
  );
}
