import type { Metadata } from 'next';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { payslips, employees } from '@/db/schema';
import { eq, desc, and } from 'drizzle-orm';
import Link from 'next/link';
import { Receipt, ChevronRight, Eye, X } from 'lucide-react';
import { formatDate, formatCurrency, PAYRUN_STATUS_COLORS, cn, snakeToTitle } from '@/lib/utils';
import { canComputePayrun } from '@/lib/rbac';

export const metadata: Metadata = { title: 'Payslips' };

export default async function PayslipsPage({
  searchParams,
}: {
  searchParams?: { employee_id?: string; employeeId?: string };
}) {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const role = session.user.role || '';
  const isEmployee = role === 'employee';
  const targetEmployeeId = searchParams?.employee_id || searchParams?.employeeId;

  if (isEmployee && targetEmployeeId && targetEmployeeId !== session.user.employeeId) {
    redirect('/payroll/payslips');
  }

  const filterEmployeeId = isEmployee ? session.user.employeeId : targetEmployeeId;

  const conditions = [];
  if (filterEmployeeId) {
    conditions.push(eq(payslips.employeeId, filterEmployeeId));
  } else if (!isEmployee) {
    // Managers default to seeing all computed/approved/paid payslips
  }

  const payslipList = await db.query.payslips.findMany({
    where: conditions.length > 0 ? and(...conditions) : undefined,
    with: {
      employee: { columns: { firstName: true, lastName: true, employeeCode: true } },
      payrun: { columns: { id: true, name: true, periodStart: true, periodEnd: true, status: true } },
    },
    orderBy: [desc(payslips.createdAt)],
    limit: 200,
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Payslips Archive</h1>
          <p className="text-[#6b7280] text-sm mt-0.5">
            {targetEmployeeId
              ? `Filtered payslip history for selected employee`
              : isEmployee
              ? 'Your issued salary statements'
              : `${payslipList.length} payslip(s) in system`}
          </p>
        </div>
        {targetEmployeeId && (
          <Link
            href="/payroll/payslips"
            className="inline-flex items-center gap-1 text-xs text-[#9ca3af] hover:text-white px-3 py-1.5 rounded-lg border border-[#2a2d3e] bg-[#111318]"
          >
            <X className="w-3.5 h-3.5" />
            Clear Filter
          </Link>
        )}
      </div>

      <div className="section-card">
        {payslipList.length === 0 ? (
          <div className="py-20 text-center">
            <Receipt className="w-12 h-12 text-[#2a2d3e] mx-auto mb-4" />
            <p className="text-[#4b5563] text-sm">No payslips found.</p>
            {!isEmployee && (
              <p className="text-[#374151] text-xs mt-1">Run and validate a payrun to generate payslips.</p>
            )}
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Payrun / Period</th>
                <th>Gross Total</th>
                <th>Deductions</th>
                <th>Net Salary</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {payslipList.map((ps) => (
                <tr key={ps.id}>
                  <td>
                    <p className="font-medium text-white">{ps.employee.firstName} {ps.employee.lastName}</p>
                    <p className="text-xs text-[#4b5563]">{ps.employee.employeeCode}</p>
                  </td>
                  <td>
                    <p className="text-xs font-medium text-white">{ps.payrun?.name ?? 'Off-cycle'}</p>
                    {ps.payrun && (
                      <p className="text-[11px] text-[#6b7280]">
                        {formatDate(ps.payrun.periodStart)} → {formatDate(ps.payrun.periodEnd)}
                      </p>
                    )}
                  </td>
                  <td className="font-mono text-xs">{formatCurrency(parseFloat(ps.grossTotal?.toString() ?? '0'))}</td>
                  <td className="font-mono text-xs text-red-400">{formatCurrency(parseFloat(ps.deductionsTotal?.toString() ?? '0'))}</td>
                  <td className="font-mono text-xs font-bold text-emerald-400">{formatCurrency(parseFloat(ps.netTotal?.toString() ?? '0'))}</td>
                  <td>
                    <span className={cn('status-pill', PAYRUN_STATUS_COLORS[ps.status])}>
                      {snakeToTitle(ps.status)}
                    </span>
                  </td>
                  <td>
                    <Link
                      href={`/payroll/payslips/${ps.id}`}
                      className="inline-flex items-center gap-1 text-xs text-[#3b6ef0] hover:text-[#5887ff] font-medium transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View Slip
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
