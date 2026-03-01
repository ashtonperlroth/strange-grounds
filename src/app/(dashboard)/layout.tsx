import { TopBar } from '@/components/layout/TopBar';
import { TRPCProvider } from '@/components/providers/TRPCProvider';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TRPCProvider>
      <div className="flex h-screen flex-col bg-[#FAF7F2] text-stone-800">
        <TopBar />
        {children}
      </div>
    </TRPCProvider>
  );
}
