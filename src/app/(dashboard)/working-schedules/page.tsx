import type { Metadata } from 'next';
import { auth } from '@/auth';
import { db } from '@/db';
import { workingSchedules } from '@/db/schema';
import { eq } from 'drizzle-orm';
import Link from 'next/link';
import { Clock, Plus, ChevronRight } from 'lucide-react';
import { cn, snakeToTitle } from '@/lib/utils';

export const metadata: Metadata = { title: 'Working Schedules' };

const DAY_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_ABBR: Record<string, string> = {
  monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu',
  friday: 'Fri', saturday: 'Sat', sunday: 'Sun',
};

export default async function WorkingSchedulesPage() {
  const session = await auth();
  const canManage = ['admin', 'hr_manager', 'hr_payroll_manager'].includes(session?.user?.role ?? '');

  const schedules = await db.query.workingSchedules.findMany({
    where: eq(workingSchedules.companyId, session!.user.companyId),
    with: { scheduleLines: true },
    orderBy: (ws, { asc }) => [asc(ws.name)],
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Working Schedules</h1>
          <p className="text-[#6b7280] text-sm mt-0.5">{schedules.length} schedule(s) configured</p>
        </div>
        {canManage && (
          <Link href="/working-schedules/new" className="btn-primary">
            <Plus className="w-4 h-4" />
            New Schedule
          </Link>
        )}
      </div>

      {schedules.length === 0 ? (
        <div className="section-card py-20 text-center">
          <Clock className="w-12 h-12 text-[#2a2d3e] mx-auto mb-4" />
          <p className="text-[#4b5563] text-sm">No working schedules defined.</p>
          <p className="text-[#374151] text-xs mt-1">Schedules are used to compute planned hours and LOP during payroll.</p>
          {canManage && (
            <Link href="/working-schedules/new" className="btn-primary mt-4 inline-flex">
              <Plus className="w-4 h-4" />
              Create Schedule
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {schedules.map((sched) => {
            const sortedLines = [...sched.scheduleLines].sort(
              (a, b) => DAY_ORDER.indexOf(a.dayOfWeek) - DAY_ORDER.indexOf(b.dayOfWeek)
            );
            const workingDays = sortedLines.filter((l) => l.isWorkingDay);

            return (
              <div key={sched.id} className="section-card p-5">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="font-semibold text-white">{sched.name}</h2>
                      <span className={cn(
                        'status-pill',
                        sched.isActive
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-800/40'
                          : 'bg-[#1e2235] text-[#4b5563] border border-[#2a2d3e]'
                      )}>
                        {sched.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="text-sm text-[#6b7280]">
                      {sched.hoursPerWeek}h/week · {sched.timezone}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-[#3b6ef0]">{sched.hoursPerWeek}</p>
                    <p className="text-xs text-[#4b5563]">hrs/week</p>
                  </div>
                </div>

                {/* Day Grid */}
                <div className="grid grid-cols-7 gap-1 mb-4">
                  {DAY_ORDER.map((day) => {
                    const line = sortedLines.find((l) => l.dayOfWeek === day);
                    const isWorking = line?.isWorkingDay ?? false;
                    return (
                      <div key={day} className={cn(
                        'rounded-lg p-1.5 text-center',
                        isWorking ? 'bg-[#3b6ef0]/10 border border-[#3b6ef0]/30' : 'bg-[#1e2235] border border-[#2a2d3e]'
                      )}>
                        <p className={cn('text-[10px] font-semibold', isWorking ? 'text-[#3b6ef0]' : 'text-[#374151]')}>
                          {DAY_ABBR[day]}
                        </p>
                        {isWorking && line && (
                          <p className="text-[8px] text-[#4b5563] mt-0.5">
                            {line.workFrom.slice(0, 5)}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Lines detail */}
                {workingDays.length > 0 && (
                  <div className="space-y-1.5">
                    {workingDays.map((line) => (
                      <div key={line.id} className="flex items-center justify-between text-xs text-[#6b7280]">
                        <span className="font-medium text-white capitalize">{line.dayOfWeek}</span>
                        <span className="font-mono">
                          {line.workFrom.slice(0, 5)} – {line.workTo.slice(0, 5)}
                        </span>
                        <span className="text-[#4b5563]">
                          {line.breakDurationMinutes}min break
                        </span>
                        <span className="text-[#3b6ef0]">
                          {(() => {
                            const [fh, fm] = line.workFrom.split(':').map(Number);
                            const [th, tm] = line.workTo.split(':').map(Number);
                            const total = (th * 60 + tm) - (fh * 60 + fm) - line.breakDurationMinutes;
                            return `${(total / 60).toFixed(1)}h`;
                          })()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="pt-3 mt-3 border-t border-[#1e2235] flex items-center justify-between">
                  <span className="text-[11px] text-[#4b5563]">
                    {sched.scheduleLines.length} daily line(s)
                  </span>
                  <Link
                    href={`/working-schedules/${sched.id}`}
                    className="inline-flex items-center gap-1 text-xs text-[#3b6ef0] hover:text-blue-400 font-medium transition-colors"
                  >
                    Configure & Assign <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
