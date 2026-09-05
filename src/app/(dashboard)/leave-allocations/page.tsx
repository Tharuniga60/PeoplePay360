import type { Metadata } from 'next';
import { auth } from '@/auth';
import { db } from '@/db';
import { leaveAllocations, leaveTypes, employees } from '@/db/schema';
import { eq } from 'drizzle-orm';
import Link from 'next/link';
import { Calendar, Plus, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { canManageEmployees } from '@/lib/rbac';

export const metadata: Metadata = { title: 'Leave Allocations' };

export default async function LeaveAllocationsPage() {
  const session = await auth();
  const isEmployee = session?.user?.role === 'employee';
  const canManage = canManageEmployees(session?.user?.role ?? '');

  let allocations;
  if (isEmployee && session?.user?.employeeId) {
    allocations = await db.query.leaveAllocations.findMany({
      where: eq(leaveAllocations.employeeId, session.user.employeeId),
      with: { leaveType: true, employee: true },
      orderBy: (la, { desc }) => [desc(la.year)],
    });
  } else {
    allocations = await db.query.leaveAllocations.findMany({
      with: { leaveType: true, employee: true },
      orderBy: (la, { desc }) => [desc(la.year), la.employeeId],
    });
  }

  const currentYear = new Date().getFullYear();

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Leave Allocations</h1>
          <p className="text-[#6b7280] text-sm mt-0.5">
            {isEmployee ? 'Your leave balances' : `${allocations.length} allocation(s)`}
          </p>
        </div>
        {canManage && (
          <Link href="/leave-allocations/new" className="btn-primary">
            <Plus className="w-4 h-4" />
            Allocate Leave
          </Link>
        )}
      </div>

      <div className="section-card">
        {allocations.length === 0 ? (
          <div className="py-20 text-center">
            <Calendar className="w-12 h-12 text-[#2a2d3e] mx-auto mb-4" />
            <p className="text-[#4b5563] text-sm">No leave allocations found.</p>
            {canManage && (
              <Link href="/leave-allocations/new" className="btn-primary mt-4 inline-flex">
                <Plus className="w-4 h-4" />
                Create First Allocation
              </Link>
            )}
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                {!isEmployee && <th>Employee</th>}
                <th>Leave Type</th>
                <th>Year</th>
                <th>Total Days</th>
                <th>Used Days</th>
                <th>Balance</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {allocations.map((alloc) => {
                const total = parseFloat(alloc.totalDays?.toString() ?? '0');
                const used = parseFloat(alloc.usedDays?.toString() ?? '0');
                const balance = total - used;
                const pct = total > 0 ? (used / total) * 100 : 0;
                const isLow = balance > 0 && balance < 3;
                const isExhausted = balance <= 0;

                return (
                  <tr key={alloc.id}>
                    {!isEmployee && (
                      <td>
                        <p className="font-medium text-white">{alloc.employee.firstName} {alloc.employee.lastName}</p>
                        <p className="text-xs text-[#4b5563]">{alloc.employee.employeeCode}</p>
                      </td>
                    )}
                    <td>
                      <p className="font-medium text-white">{alloc.leaveType.name}</p>
                      <p className="text-xs text-[#4b5563]">{alloc.leaveType.isPaid ? 'Paid' : 'Unpaid'}</p>
                    </td>
                    <td>
                      <span className={cn(
                        'font-mono text-sm px-2 py-0.5 rounded border',
                        alloc.year === currentYear
                          ? 'bg-[#3b6ef0]/10 text-[#3b6ef0] border-[#3b6ef0]/30'
                          : 'bg-[#1e2235] text-[#4b5563] border-[#2a2d3e]'
                      )}>
                        {alloc.year}
                      </span>
                    </td>
                    <td className="font-mono font-medium text-white">{total}</td>
                    <td className="font-mono text-yellow-400">{used}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-1.5 bg-[#2a2d3e] rounded-full overflow-hidden">
                          <div
                            className={cn('h-full rounded-full transition-all', isExhausted ? 'bg-red-500' : isLow ? 'bg-yellow-500' : 'bg-emerald-500')}
                            style={{ width: `${Math.min(100, pct)}%` }}
                          />
                        </div>
                        <span className={cn('font-mono font-bold text-sm',
                          isExhausted ? 'text-red-400' : isLow ? 'text-yellow-400' : 'text-emerald-400'
                        )}>
                          {balance}
                        </span>
                        {isLow && !isExhausted && <AlertTriangle className="w-3.5 h-3.5 text-yellow-400" />}
                      </div>
                    </td>
                    <td>
                      <span className={cn('status-pill',
                        isExhausted
                          ? 'bg-red-500/10 text-red-400 border border-red-800/40'
                          : isLow
                          ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-800/40'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-800/40'
                      )}>
                        {isExhausted ? 'Exhausted' : isLow ? 'Low' : 'Available'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
