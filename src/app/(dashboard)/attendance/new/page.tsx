import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { canManageEmployees } from '@/lib/rbac';
import { db } from '@/db';
import { employees } from '@/db/schema';
import { eq } from 'drizzle-orm';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { AttendanceLogClient } from './attendance-log-client';

export default async function NewAttendancePage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const role = session.user.role || '';
  if (!canManageEmployees(role)) redirect('/attendance');

  const empList = await db.query.employees.findMany({
    where: eq(employees.companyId, session.user.companyId),
    columns: { id: true, firstName: true, lastName: true, employeeCode: true },
    orderBy: (e, { asc }) => [asc(e.firstName)],
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <Link href="/attendance" className="inline-flex items-center gap-1.5 text-sm text-[#6b7280] hover:text-white transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to Attendance
      </Link>
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Log Attendance</h1>
        <p className="text-[#6b7280] text-sm mt-0.5">Record attendance for an employee.</p>
      </div>
      <AttendanceLogClient employees={empList} />
    </div>
  );
}
