import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { auth } from '@/auth';
import { db } from '@/db';
import { employees, contracts, attendances, leaveAllocations, payslips } from '@/db/schema';
import { eq, and, count, sum, desc } from 'drizzle-orm';
import Link from 'next/link';
import { ArrowLeft, Mail, Phone, Building2, Briefcase, CreditCard, Calendar, Plus } from 'lucide-react';
import { formatDate, formatCurrency, getInitials, CONTRACT_STATUS_COLORS, cn, snakeToTitle } from '@/lib/utils';
import { EmployeeSmartButtons } from '@/components/employee-smart-buttons';
import { canManageEmployees } from '@/lib/rbac';
import { redirect } from 'next/navigation';

export const metadata: Metadata = { title: 'Employee Details' };

export default async function EmployeeDetailPage({ params }: { params: { id: string } }) {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const role = session.user.role || '';
  const isManager = canManageEmployees(role);

  if (!isManager && session.user.employeeId !== params.id) {
    redirect('/?error=unauthorized');
  }

  const employee = await db.query.employees.findFirst({
    where: and(eq(employees.id, params.id), eq(employees.companyId, session!.user.companyId)),
    with: {
      department: true,
      jobPosition: true,
      branch: true,
      contracts: {
        orderBy: [desc(contracts.startDate)],
        with: { salaryStructure: true },
      },
    },
  });

  if (!employee) notFound();

  // Counts for smart buttons
  const activeContractCount = employee.contracts.filter((c) => c.status === 'active').length;

  const [attCount] = await db
    .select({ count: count() })
    .from(attendances)
    .where(eq(attendances.employeeId, employee.id));

  const leaveBalances = await db
    .select({ used: leaveAllocations.usedDays, total: leaveAllocations.totalDays })
    .from(leaveAllocations)
    .where(eq(leaveAllocations.employeeId, employee.id));

  const totalLeaveBalance = leaveBalances.reduce(
    (acc, lb) => acc + parseFloat(lb.total.toString()) - parseFloat(lb.used.toString()),
    0
  );

  const [psCount] = await db
    .select({ count: count() })
    .from(payslips)
    .where(eq(payslips.employeeId, employee.id));

  const activeContract = employee.contracts.find((c) => c.status === 'active');

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back */}
      {isManager && (
        <Link href="/employees" className="inline-flex items-center gap-1.5 text-sm text-[#6b7280] hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Employees
        </Link>
      )}

      {/* Employee Header */}
      <div className="section-card p-6">
        <div className="flex items-start gap-5">
          <div className="w-16 h-16 rounded-2xl bg-[#3b6ef0]/20 flex items-center justify-center text-[#3b6ef0] text-2xl font-bold flex-shrink-0">
            {getInitials(employee.firstName, employee.lastName)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">
                  {employee.firstName} {employee.lastName}
                </h1>
                <p className="text-[#6b7280] text-sm mt-0.5">
                  {employee.jobPosition?.title ?? 'No position'} · {employee.department?.name ?? 'No department'}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs text-[#4b5563] bg-[#111318] border border-[#2a2d3e] px-2 py-1 rounded">
                  {employee.employeeCode}
                </span>
                <span className={cn('status-pill', employee.isActive
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-800/40'
                  : 'bg-red-500/10 text-red-400 border border-red-800/40')}>
                  {employee.isActive ? 'Active' : 'Inactive'}
                </span>
                <span className="status-pill bg-[#1e2235] text-[#6b7280] border border-[#2a2d3e]">
                  {snakeToTitle(employee.employmentType)}
                </span>
              </div>
            </div>

            {/* Info Row */}
            <div className="flex flex-wrap gap-5 mt-4 text-sm text-[#6b7280]">
              <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" />{employee.email}</span>
              {employee.phone && <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" />{employee.phone}</span>}
              {employee.branch && <span className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" />{employee.branch.name}</span>}
              <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />Joined {formatDate(employee.dateOfJoining)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Smart Buttons */}
      <EmployeeSmartButtons
        employeeId={employee.id}
        contractCount={activeContractCount}
        attendanceCount={attCount.count}
        leaveBalance={Math.floor(totalLeaveBalance)}
        payslipCount={psCount.count}
      />

      {/* Active Contract Summary */}
      {activeContract && (
        <div className="section-card p-5">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#2a2d3e]">
            <Briefcase className="w-4 h-4 text-[#3b6ef0]" />
            <h2 className="text-sm font-semibold text-white">Active Contract</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            <div>
              <p className="text-xs text-[#4b5563] mb-1">Contract Name</p>
              <p className="text-sm font-medium text-white">{activeContract.name}</p>
            </div>
            <div>
              <p className="text-xs text-[#4b5563] mb-1">Monthly Wage</p>
              <p className="text-sm font-bold text-emerald-400">{formatCurrency(parseFloat(activeContract.wage.toString()))}</p>
            </div>
            <div>
              <p className="text-xs text-[#4b5563] mb-1">Salary Structure</p>
              <p className="text-sm font-medium text-white">{activeContract.salaryStructure?.name ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-[#4b5563] mb-1">Start Date</p>
              <p className="text-sm font-medium text-white">{formatDate(activeContract.startDate)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Bank Details */}
      {(employee.bankAccountNumber || employee.bankName) && (
        <div className="section-card p-5">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#2a2d3e]">
            <CreditCard className="w-4 h-4 text-[#3b6ef0]" />
            <h2 className="text-sm font-semibold text-white">Bank Details</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            <div>
              <p className="text-xs text-[#4b5563] mb-1">Bank Name</p>
              <p className="text-sm font-medium text-white">{employee.bankName ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-[#4b5563] mb-1">Account Number</p>
              <p className="text-sm font-mono text-white">{employee.bankAccountNumber ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-[#4b5563] mb-1">IFSC Code</p>
              <p className="text-sm font-mono text-white">{employee.bankIfscCode ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-[#4b5563] mb-1">Branch</p>
              <p className="text-sm font-medium text-white">{employee.bankBranch ?? '—'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Contract History */}
      <div className="section-card">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a2d3e]">
          <h2 className="text-sm font-semibold text-white">Contract History</h2>
          {isManager && (
            <Link href={`/employees/${employee.id}/contracts/new`} className="btn-primary text-xs">
              <Plus className="w-3.5 h-3.5" />
              New Contract
            </Link>
          )}
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Contract</th>
              <th>Structure</th>
              <th>Wage</th>
              <th>Start</th>
              <th>End</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {employee.contracts.map((c) => (
              <tr key={c.id}>
                <td className="font-medium text-white">{c.name}</td>
                <td>{c.salaryStructure?.name ?? '—'}</td>
                <td className="font-mono">{formatCurrency(parseFloat(c.wage.toString()))}</td>
                <td className="text-[#6b7280]">{formatDate(c.startDate)}</td>
                <td className="text-[#6b7280]">{c.endDate ? formatDate(c.endDate) : 'Open-ended'}</td>
                <td>
                  <span className={cn('status-pill', CONTRACT_STATUS_COLORS[c.status])}>
                    {snakeToTitle(c.status)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
