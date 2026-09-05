import { auth } from '@/auth';
import { redirect, notFound } from 'next/navigation';
import { canManageEmployees } from '@/lib/rbac';
import { db } from '@/db';
import { employees, salaryStructures, workingSchedules } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ContractFormClient } from './contract-form-client';

export default async function NewContractPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const role = session.user.role || '';
  if (!canManageEmployees(role)) redirect('/employees');

  const companyId = session.user.companyId;

  const [employee, structures, schedules] = await Promise.all([
    db.query.employees.findFirst({
      where: and(eq(employees.id, params.id), eq(employees.companyId, companyId)),
    }),
    db.query.salaryStructures.findMany({
      where: and(eq(salaryStructures.companyId, companyId), eq(salaryStructures.isActive, true)),
      orderBy: (s, { asc }) => [asc(s.name)],
    }),
    db.query.workingSchedules.findMany({
      where: and(eq(workingSchedules.companyId, companyId), eq(workingSchedules.isActive, true)),
      orderBy: (ws, { asc }) => [asc(ws.name)],
    }),
  ]);

  if (!employee) notFound();

  return (
    <div className="space-y-6 animate-fade-in">
      <Link href={`/employees/${params.id}`} className="inline-flex items-center gap-1.5 text-sm text-[#6b7280] hover:text-white transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to {employee.firstName} {employee.lastName}
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">New Contract</h1>
        <p className="text-[#6b7280] text-sm mt-0.5">
          Create a new employment contract for {employee.firstName} {employee.lastName} ({employee.employeeCode})
        </p>
      </div>

      <ContractFormClient
        employeeId={params.id}
        salaryStructures={structures}
        workingSchedules={schedules}
      />
    </div>
  );
}
