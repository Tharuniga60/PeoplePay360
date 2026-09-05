import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { canManageEmployees } from '@/lib/rbac';
import { db } from '@/db';
import { employees, leaveTypes } from '@/db/schema';
import { eq } from 'drizzle-orm';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { LeaveAllocationClient } from './leave-allocation-client';

export default async function NewLeaveAllocationPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const role = session.user.role;
  if (!canManageEmployees(role)) redirect('/leave-allocations');

  const companyId = session.user.companyId;

  const [empList, ltList] = await Promise.all([
    db.query.employees.findMany({
      where: eq(employees.companyId, companyId),
      columns: { id: true, firstName: true, lastName: true, employeeCode: true },
      orderBy: (e, { asc }) => [asc(e.firstName)],
    }),
    db.query.leaveTypes.findMany({
      where: eq(leaveTypes.companyId, companyId),
      orderBy: (lt, { asc }) => [asc(lt.name)],
    }),
  ]);

  return (
    <div className="space-y-6 animate-fade-in">
      <Link href="/leave-allocations" className="inline-flex items-center gap-1.5 text-sm text-[#6b7280] hover:text-white transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to Leave Allocations
      </Link>
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Allocate Leave</h1>
        <p className="text-[#6b7280] text-sm mt-0.5">Grant leave days to an employee for a specific year and leave type.</p>
      </div>
      <LeaveAllocationClient employees={empList} leaveTypes={ltList} />
    </div>
  );
}
