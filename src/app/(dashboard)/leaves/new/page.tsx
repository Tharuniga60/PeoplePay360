import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { leaveTypes, employees, leaveAllocations } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';
import { canManageEmployees } from '@/lib/rbac';
import { LeaveRequestClient } from './leave-request-client';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default async function NewLeaveRequestPage({
  searchParams,
}: {
  searchParams?: { employee_id?: string; employeeId?: string };
}) {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const role = session.user.role || '';
  const isManager = canManageEmployees(role);

  // If regular employee, must have employeeId
  if (!isManager && !session.user.employeeId) {
    redirect('/?error=employee_required');
  }

  const [types, empList, allocations] = await Promise.all([
    db.query.leaveTypes.findMany({
      where: eq(leaveTypes.companyId, session.user.companyId),
      columns: { id: true, name: true, isPaid: true },
      orderBy: [asc(leaveTypes.name)],
    }),
    isManager
      ? db.query.employees.findMany({
          where: eq(employees.companyId, session.user.companyId),
          columns: { id: true, firstName: true, lastName: true, employeeCode: true },
          orderBy: [asc(employees.firstName)],
        })
      : Promise.resolve([]),
    db.query.leaveAllocations.findMany({
      columns: { employeeId: true, leaveTypeId: true, year: true, totalDays: true, usedDays: true },
    }),
  ]);

  const targetEmployeeId = searchParams?.employee_id || searchParams?.employeeId || session.user.employeeId;

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <Link
        href="/time-off/requests"
        className="inline-flex items-center gap-1.5 text-sm text-[#6b7280] hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Leave Requests
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Request Leave</h1>
        <p className="text-[#6b7280] text-sm mt-0.5">
          {isManager
            ? 'Submit a leave request for yourself or on behalf of an employee.'
            : 'Submit a new time off request for manager approval.'}
        </p>
      </div>

      <LeaveRequestClient
        initialEmployeeId={targetEmployeeId}
        leaveTypes={types}
        employees={empList}
        isManager={isManager}
        allocations={allocations}
        redirectPath="/time-off/requests"
      />
    </div>
  );
}
