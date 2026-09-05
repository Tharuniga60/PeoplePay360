import type { Metadata } from 'next';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { contracts, employees, type Contract, type Employee, type SalaryStructure, type WorkingSchedule } from '@/db/schema';
import { eq, desc, and } from 'drizzle-orm';
import Link from 'next/link';
import { FileText, Plus, Filter, Search, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { formatDate, formatCurrency, CONTRACT_STATUS_COLORS, cn, snakeToTitle } from '@/lib/utils';
import { canManageEmployees } from '@/lib/rbac';
import { ContractsFilterClient } from './contracts-filter-client';

export const metadata: Metadata = { title: 'Contracts' };

type ContractWithRelations = Contract & {
  employee: Employee;
  salaryStructure: SalaryStructure | null;
  schedule: WorkingSchedule | null;
};

export default async function ContractsPage({
  searchParams,
}: {
  searchParams?: { employee_id?: string; employeeId?: string; status?: string };
}) {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const role = session.user.role || '';
  const isManager = canManageEmployees(role);
  const targetEmployeeId = searchParams?.employee_id || searchParams?.employeeId;

  if (!isManager && session.user.employeeId !== targetEmployeeId) {
    if (session.user.employeeId) {
      redirect(`/contracts?employee_id=${session.user.employeeId}`);
    } else {
      redirect('/?error=unauthorized');
    }
  }

  const conditions = [];
  if (targetEmployeeId) {
    conditions.push(eq(contracts.employeeId, targetEmployeeId));
  }
  if (searchParams?.status && ['active', 'draft', 'expired'].includes(searchParams.status)) {
    conditions.push(eq(contracts.status, searchParams.status as 'active'));
  }

  const contractList: ContractWithRelations[] = (await db.query.contracts.findMany({
    where: conditions.length > 0 ? and(...conditions) : undefined,
    with: {
      employee: true,
      salaryStructure: true,
      schedule: true,
    },
    orderBy: [desc(contracts.startDate)],
  })) as ContractWithRelations[];

  const activeCount = contractList.filter((c) => c.status === 'active').length;
  const draftCount = contractList.filter((c) => c.status === 'draft').length;
  const expiredCount = contractList.filter((c) => c.status === 'expired').length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Contracts Management</h1>
          <p className="text-[#6b7280] text-sm mt-0.5">
            {targetEmployeeId ? `Filtered for selected employee` : `${contractList.length} total contracts (${activeCount} active)`}
          </p>
        </div>
        {isManager && (
          <Link href="/contracts/new" className="btn-primary">
            <Plus className="w-4 h-4" />
            New Contract
          </Link>
        )}
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="kpi-card">
          <div className="flex items-center gap-2 mb-2 text-emerald-400">
            <CheckCircle className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Active</span>
          </div>
          <p className="text-2xl font-bold text-white">{activeCount}</p>
        </div>
        <div className="kpi-card">
          <div className="flex items-center gap-2 mb-2 text-yellow-400">
            <Clock className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Draft</span>
          </div>
          <p className="text-2xl font-bold text-white">{draftCount}</p>
        </div>
        <div className="kpi-card">
          <div className="flex items-center gap-2 mb-2 text-red-400">
            <AlertCircle className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Expired</span>
          </div>
          <p className="text-2xl font-bold text-white">{expiredCount}</p>
        </div>
      </div>

      {/* Contracts Table with Filter Client */}
      <ContractsFilterClient
        contracts={contractList}
        selectedStatus={searchParams?.status}
        isFilteredByEmployee={Boolean(targetEmployeeId)}
      />
    </div>
  );
}
