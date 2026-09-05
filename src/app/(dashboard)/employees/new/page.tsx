import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { canManageEmployees } from '@/lib/rbac';
import { EmployeeFormClient } from './employee-form-client';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { db } from '@/db';
import { departments, jobPositions, workingSchedules } from '@/db/schema';
import { eq } from 'drizzle-orm';

export default async function NewEmployeePage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const role = session.user.role || '';
  if (!canManageEmployees(role)) {
    redirect('/employees');
  }

  const companyId = session.user.companyId;

  const [depts, positions, schedules] = await Promise.all([
    db.query.departments.findMany({
      where: eq(departments.companyId, companyId),
      orderBy: (d, { asc }) => [asc(d.name)],
    }),
    db.query.jobPositions.findMany({
      where: eq(jobPositions.companyId, companyId),
      orderBy: (jp, { asc }) => [asc(jp.title)],
    }),
    db.query.workingSchedules.findMany({
      where: eq(workingSchedules.companyId, companyId),
      orderBy: (ws, { asc }) => [asc(ws.name)],
    }),
  ]);

  return (
    <div className="space-y-6 animate-fade-in">
      <Link href="/employees" className="inline-flex items-center gap-1.5 text-sm text-[#6b7280] hover:text-white transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to Employees
      </Link>
      
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Add New Employee</h1>
        <p className="text-[#6b7280] text-sm mt-0.5">Enter details for the new team member. Fields marked * are required.</p>
      </div>

      <EmployeeFormClient
        companyId={companyId}
        departments={depts}
        jobPositions={positions}
        workingSchedules={schedules}
      />
    </div>
  );
}
