import type { Metadata } from 'next';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { attendances, employees, type Attendance, type Employee } from '@/db/schema';
import { eq, desc, and } from 'drizzle-orm';
import Link from 'next/link';
import { Clock, Plus, CheckCircle, XCircle, AlertCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { canManageEmployees } from '@/lib/rbac';
import { AttendanceClient } from './attendance-client';
import { format } from 'date-fns';

export const metadata: Metadata = { title: 'Attendance' };

type AttendanceWithEmployee = Attendance & {
  employee: Employee;
};

export default async function AttendancePage({
  searchParams,
}: {
  searchParams?: { employee_id?: string; employeeId?: string };
}) {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const role = session.user.role ?? '';
  const isManager = canManageEmployees(role);
  const isEmployee = role === 'employee';
  const targetEmployeeId = searchParams?.employee_id || searchParams?.employeeId;

  // Access control
  if (isEmployee && targetEmployeeId && targetEmployeeId !== session.user.employeeId) {
    redirect('/attendance');
  }

  const filterEmployeeId = isEmployee
    ? session.user.employeeId
    : targetEmployeeId || undefined;

  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const recordsPromise = filterEmployeeId
    ? db.query.attendances.findMany({
        where: eq(attendances.employeeId, filterEmployeeId),
        with: { employee: true },
        orderBy: [desc(attendances.attendanceDate)],
        limit: 100,
      })
    : db.query.attendances.findMany({
        with: { employee: true },
        orderBy: [desc(attendances.attendanceDate)],
        limit: 200,
      });

  const todayRecordPromise = session.user.employeeId
    ? db.query.attendances.findFirst({
        where: and(
          eq(attendances.employeeId, session.user.employeeId),
          eq(attendances.attendanceDate, todayStr)
        ),
        with: { employee: true },
      })
    : Promise.resolve(null);

  const [recordsRaw, todayRecordRaw] = await Promise.all([recordsPromise, todayRecordPromise]);
  const records = recordsRaw as AttendanceWithEmployee[];
  const todayRecord = todayRecordRaw as AttendanceWithEmployee | null;

  // Counts for summary strip
  const presentCount = records.filter((r) => r.status === 'present').length;
  const absentCount = records.filter((r) => r.status === 'absent').length;
  const leaveCount = records.filter((r) => r.status === 'on_leave').length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Attendance Management</h1>
          <p className="text-[#6b7280] text-sm mt-0.5">
            {targetEmployeeId
              ? `Filtered attendance records for selected employee`
              : isEmployee
              ? 'Your attendance & daily check-in records'
              : `${records.length} records logged`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {targetEmployeeId && (
            <Link
              href="/attendance"
              className="inline-flex items-center gap-1 text-xs text-[#9ca3af] hover:text-white px-3 py-1.5 rounded-lg border border-[#2a2d3e] bg-[#111318]"
            >
              <X className="w-3.5 h-3.5" />
              Clear Filter
            </Link>
          )}
          {isManager && (
            <Link href="/attendance/new" className="btn-primary">
              <Plus className="w-4 h-4" />
              Manual Log
            </Link>
          )}
        </div>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Present', value: presentCount, icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: 'Absent', value: absentCount, icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10' },
          { label: 'On Leave', value: leaveCount, icon: AlertCircle, color: 'text-purple-400', bg: 'bg-purple-500/10' },
        ].map((s) => (
          <div key={s.label} className="kpi-card">
            <div className={cn('p-2 rounded-lg w-fit mb-3', s.bg)}>
              <s.icon className={cn('w-4 h-4', s.color)} />
            </div>
            <p className={cn('text-2xl font-bold', s.color)}>{s.value}</p>
            <p className="text-xs text-[#4b5563] mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Interactive Attendance Client */}
      <AttendanceClient
        records={records}
        currentEmployeeId={session.user.employeeId}
        isManager={isManager}
        todayRecord={todayRecord}
      />
    </div>
  );
}
