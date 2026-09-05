import type { Metadata } from 'next';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import {
  leaveRequests,
  type LeaveRequest,
  type Employee,
  type LeaveType,
} from '@/db/schema';
import { and, eq, desc } from 'drizzle-orm';
import Link from 'next/link';
import { Calendar, CheckCircle, XCircle, Clock, Plus } from 'lucide-react';
import { formatDate, LEAVE_STATUS_COLORS, cn, snakeToTitle, formatDateRange } from '@/lib/utils';
import { canApproveLeave } from '@/lib/rbac';
import { LeaveActionsClient } from './leave-actions-client';

export const metadata: Metadata = { title: 'Leaves' };

type LeaveWithRelations = LeaveRequest & {
  employee: Employee;
  leaveType: LeaveType | null;
};

export default async function LeavesPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const isEmployee = session.user.role === 'employee';
  const canApprove = canApproveLeave(session.user.role || '');

  const leaves: LeaveWithRelations[] = (await db.query.leaveRequests.findMany({
    where: isEmployee && session.user.employeeId ? eq(leaveRequests.employeeId, session.user.employeeId) : undefined,
    with: { employee: true, leaveType: true },
    orderBy: [desc(leaveRequests.createdAt)],
  })) as LeaveWithRelations[];

  const pending: LeaveWithRelations[] = leaves.filter((l: LeaveWithRelations) => l.status === 'pending');
  const others: LeaveWithRelations[] = leaves.filter((l: LeaveWithRelations) => l.status !== 'pending');

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Leave Management</h1>
          <p className="text-[#6b7280] text-sm mt-0.5">{pending.length} pending approval</p>
        </div>
        <Link href="/time-off/requests/new" className="btn-primary">
          <Plus className="w-4 h-4" />
          Request Leave
        </Link>
      </div>

      {/* Pending Section */}
      {canApprove && pending.length > 0 && (
        <div className="section-card">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-[#2a2d3e]">
            <Clock className="w-4 h-4 text-yellow-400" />
            <h2 className="text-sm font-semibold text-white">Pending Approval ({pending.length})</h2>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Leave Type</th>
                <th>Period</th>
                <th>Days</th>
                <th>Reason</th>
                <th>Applied On</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pending.map((leave: LeaveWithRelations) => (
                <tr key={leave.id}>
                  <td>
                    <p className="font-medium text-white">
                      {leave.employee.firstName} {leave.employee.lastName}
                    </p>
                    <p className="text-xs text-[#4b5563]">{leave.employee.employeeCode}</p>
                  </td>
                  <td>
                    <span className={cn('status-pill', 'bg-blue-500/10 text-blue-400 border border-blue-800/40')}>
                      {leave.leaveType?.name}
                    </span>
                  </td>
                  <td className="text-[#6b7280] text-xs">
                    {formatDateRange(leave.startDate, leave.endDate)}
                  </td>
                  <td className="font-bold text-white">{parseFloat(leave.numberOfDays.toString())}</td>
                  <td className="text-[#6b7280] max-w-48 truncate text-xs">{leave.reason ?? '—'}</td>
                  <td className="text-[#6b7280] text-xs">{formatDate(leave.createdAt)}</td>
                  <td>
                    <LeaveActionsClient leaveId={leave.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* All Requests */}
      <div className="section-card">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-[#2a2d3e]">
          <Calendar className="w-4 h-4 text-[#3b6ef0]" />
          <h2 className="text-sm font-semibold text-white">All Leave Requests</h2>
        </div>
        {leaves.length === 0 ? (
          <div className="py-16 text-center">
            <Calendar className="w-10 h-10 text-[#2a2d3e] mx-auto mb-3" />
            <p className="text-[#4b5563] text-sm">No leave requests found.</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Leave Type</th>
                <th>Period</th>
                <th>Days</th>
                <th>Status</th>
                <th>Applied On</th>
              </tr>
            </thead>
            <tbody>
              {leaves.map((leave: LeaveWithRelations) => (
                <tr key={leave.id}>
                  <td>
                    <p className="font-medium text-white">
                      {leave.employee.firstName} {leave.employee.lastName}
                    </p>
                    <p className="text-xs text-[#4b5563]">{leave.employee.employeeCode}</p>
                  </td>
                  <td>{leave.leaveType?.name ?? '—'}</td>
                  <td className="text-[#6b7280] text-xs">
                    {formatDateRange(leave.startDate, leave.endDate)}
                  </td>
                  <td className="font-bold text-white">{parseFloat(leave.numberOfDays.toString())}</td>
                  <td>
                    <span className={cn('status-pill', LEAVE_STATUS_COLORS[leave.status])}>
                      {snakeToTitle(leave.status)}
                    </span>
                  </td>
                  <td className="text-[#6b7280] text-xs">{formatDate(leave.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
