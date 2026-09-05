import type { Metadata } from 'next';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { contracts, employees, type Contract, type Employee, type SalaryStructure, type WorkingSchedule } from '@/db/schema';
import { eq, desc, and, count } from 'drizzle-orm';
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

  // Base conditions for total counts (scoped to employee if specified)
  const baseCountConditions = targetEmployeeId ? [eq(contracts.employeeId, targetEmployeeId)] : [];

  // Filter conditions for the listing table
  const listConditions = [];
  if (targetEmployeeId) {
    listConditions.push(eq(contracts.employeeId, targetEmployeeId));
  }
  if (searchParams?.status && ['active', 'expired'].includes(searchParams.status)) {
    listConditions.push(eq(contracts.status, searchParams.status as 'active'));
  }

  // Run total KPI counts and list query concurrently in parallel
  const [
    activeRes,
    expiredRes,
    contractListRaw,
  ] = await Promise.all([
    db
      .select({ count: count() })
      .from(contracts)
      .where(
        baseCountConditions.length > 0
          ? and(...baseCountConditions, eq(contracts.status, 'active'))
          : eq(contracts.status, 'active')
      ),
    db
      .select({ count: count() })
      .from(contracts)
      .where(
        baseCountConditions.length > 0
          ? and(...baseCountConditions, eq(contracts.status, 'expired'))
          : eq(contracts.status, 'expired')
      ),
    db.query.contracts.findMany({
      where: listConditions.length > 0 ? and(...listConditions) : undefined,
      with: {
        employee: true,
        salaryStructure: true,
        schedule: true,
      },
      orderBy: [desc(contracts.startDate)],
    }),
  ]);

  const activeCount = activeRes[0]?.count ?? 0;
  const expiredCount = expiredRes[0]?.count ?? 0;
  const totalCount = activeCount + expiredCount;
  const contractList = contractListRaw as ContractWithRelations[];

  const currentStatus = searchParams?.status;
  const buildStatusUrl = (s: string) => {
    const params = new URLSearchParams();
    if (targetEmployeeId) params.set('employee_id', targetEmployeeId);
    if (currentStatus !== s) params.set('status', s);
    const qs = params.toString();
    return qs ? `/contracts?${qs}` : '/contracts';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Contracts Management</h1>
          <p className="text-[#6b7280] text-sm mt-0.5">
            {targetEmployeeId
              ? `Filtered for selected employee (${activeCount} active, ${expiredCount} expired)`
              : `${totalCount} total contracts (${activeCount} active, ${expiredCount} expired)`}
          </p>
        </div>
        {isManager && (
          <Link href="/contracts/new" className="btn-primary">
            <Plus className="w-4 h-4" />
            New Contract
          </Link>
        )}
      </div>

      {/* KPI Stats (Clickable to Filter) */}
      <div className="grid grid-cols-2 gap-4">
        <Link
          href={buildStatusUrl('active')}
          className={cn(
            'kpi-card transition-all hover:border-emerald-500/50 block',
            currentStatus === 'active' && 'border-emerald-500/80 ring-1 ring-emerald-500/40'
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-emerald-400">
              <CheckCircle className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">Active</span>
            </div>
            {currentStatus === 'active' && (
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-mono">
                Filtered
              </span>
            )}
          </div>
          <p className="text-2xl font-bold text-white">{activeCount}</p>
        </Link>

        <Link
          href={buildStatusUrl('expired')}
          className={cn(
            'kpi-card transition-all hover:border-red-500/50 block',
            currentStatus === 'expired' && 'border-red-500/80 ring-1 ring-red-500/40'
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-red-400">
              <AlertCircle className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">Expired</span>
            </div>
            {currentStatus === 'expired' && (
              <span className="text-[10px] bg-red-500/20 text-red-300 px-1.5 py-0.5 rounded font-mono">
                Filtered
              </span>
            )}
          </div>
          <p className="text-2xl font-bold text-white">{expiredCount}</p>
        </Link>
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
