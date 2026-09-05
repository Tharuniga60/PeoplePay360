import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { salaryStructures, workingSchedules, employees } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';
import { canManageEmployees } from '@/lib/rbac';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { NewContractClient } from './new-contract-client';

export default async function NewContractPage({
  searchParams,
}: {
  searchParams?: { employee_id?: string; employeeId?: string };
}) {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  if (!canManageEmployees(session.user.role || '')) {
    redirect('/contracts?error=unauthorized');
  }

  const [structures, schedules, empList] = await Promise.all([
    db.query.salaryStructures.findMany({
      where: eq(salaryStructures.companyId, session.user.companyId),
      orderBy: [asc(salaryStructures.name)],
    }),
    db.query.workingSchedules.findMany({
      where: eq(workingSchedules.companyId, session.user.companyId),
      orderBy: [asc(workingSchedules.name)],
    }),
    db.query.employees.findMany({
      where: eq(employees.companyId, session.user.companyId),
      with: { department: true, jobPosition: true },
      orderBy: [asc(employees.firstName)],
    }),
  ]);

  const preselectedEmployeeId = searchParams?.employee_id || searchParams?.employeeId;

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <Link
        href="/contracts"
        className="inline-flex items-center gap-1.5 text-sm text-[#6b7280] hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Contracts
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Create Contract</h1>
        <p className="text-[#6b7280] text-sm mt-0.5">
          Define working schedule, salary, and salary structure with period matching.
        </p>
      </div>

      <NewContractClient
        employees={empList.map((e) => ({
          id: e.id,
          firstName: e.firstName,
          lastName: e.lastName,
          employeeCode: e.employeeCode,
          department: e.department?.name,
          jobPosition: e.jobPosition?.title,
        }))}
        salaryStructures={structures.map((s) => ({ id: s.id, name: s.name, code: s.code }))}
        workingSchedules={schedules.map((s) => ({ id: s.id, name: s.name, hoursPerWeek: s.hoursPerWeek }))}
        preselectedEmployeeId={preselectedEmployeeId}
      />
    </div>
  );
}
