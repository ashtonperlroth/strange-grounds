import { TopBar } from '@/components/layout/TopBar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen flex-col bg-slate-900 text-slate-100">
      <TopBar />
      {children}
    </div>
  );
}
