import { TopBar } from '@/components/layout/TopBar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen flex-col bg-[#FAF7F2] text-stone-800">
      <TopBar />
      {children}
    </div>
  );
}
