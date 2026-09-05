import type { Metadata } from 'next';
import { auth } from '@/auth';
import { db } from '@/db';
import { leaveRequests } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import Link from 'next/link';
import { Calendar, CheckCircle, XCircle, Clock } from 'lucide-react';
import { formatDate, LEAVE_STATUS_COLORS, cn, snakeToTitle, formatDateRange } from '@/lib/utils';

export const metadata: Metadata = { title: 'Leaves' };

export default async function LeavesPage() {
  const session = await auth();

  const leaves = await db.query.leaveRequests.findMany({
    with: { employee: true, leaveType: true },
    orderBy: (l, { desc }) => [desc(l.createdAt)],
  });

  const pending = leaves.filter((l) => l.status === 'pending');
  const others = leaves.filter((l) => l.status !== 'pending');

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Leave Management</h1>
          <p className="text-[#6b7280] text-sm mt-0.5">{pending.length} pending approval</p>
        </div>
      </div>

      {/* Pending Section */}
      {pending.length > 0 && (
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
              {pending.map((leave) => (
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
                    <div className="flex items-center gap-2">
                      <button
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-800/40 hover:bg-emerald-500/20 transition-colors"
                        onClick={() => {}} // Client action — wire separately
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        Approve
                      </button>
                      <button
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-red-500/10 text-red-400 border border-red-800/40 hover:bg-red-500/20 transition-colors"
                        onClick={() => {}}
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Reject
                      </button>
                    </div>
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
              {leaves.map((leave) => (
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
