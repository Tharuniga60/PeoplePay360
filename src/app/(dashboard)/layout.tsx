import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/sidebar';
import { GlobalAttendanceWidget } from '@/components/global-attendance-widget';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  return (
    <div className="flex h-screen overflow-hidden bg-[#111318]">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Top Bar */}
        <header className="flex items-center justify-between px-6 py-3 border-b border-[#1e2235] bg-[#111318] flex-shrink-0">
          <div className="flex items-center gap-2 text-sm text-[#6b7280]">
            <span className="text-[#3b6ef0] font-medium">PeoplePay360</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-[#4b5563]">
            {/* Global Attendance Quick Action & Timer */}
            <GlobalAttendanceWidget />

            <div className="hidden md:flex items-center gap-3">
              <span className="w-1 h-1 rounded-full bg-[#2a2d3e]" />
              <span>FY 2025–26</span>
              <span className="w-1 h-1 rounded-full bg-[#2a2d3e]" />
              <span className="text-emerald-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Operational
              </span>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
