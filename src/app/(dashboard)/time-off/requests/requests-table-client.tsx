'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { formatDate, LEAVE_STATUS_COLORS, cn, snakeToTitle, formatDateRange } from '@/lib/utils';
import { LeaveActionsClient } from '../../leaves/leave-actions-client';

export interface LeaveRequestRow {
  id: string;
  startDate: string;
  endDate: string;
  numberOfDays: string | number;
  reason: string | null;
  status: string;
  createdAt: string | Date;
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    employeeCode: string;
  };
  leaveType: {
    id: string;
    name: string;
  } | null;
}

interface RequestsTableClientProps {
  leaves: LeaveRequestRow[];
  isPendingTable?: boolean;
}

export function RequestsTableClient({ leaves, isPendingTable = false }: RequestsTableClientProps) {
  const router = useRouter();

  if (leaves.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-[#4b5563]">
        No requests to display.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="data-table">
        <thead>
          <tr>
            <th>Employee</th>
            <th>Leave Type</th>
            <th>Period</th>
            <th>Days</th>
            {isPendingTable ? <th>Reason</th> : <th>Status</th>}
            <th>Applied On</th>
            {isPendingTable && <th>Quick Action</th>}
            <th className="text-right">Details</th>
          </tr>
        </thead>
        <tbody>
          {leaves.map((leave) => (
            <tr
              key={leave.id}
              onClick={() => router.push(`/time-off/requests/${leave.id}`)}
              className="hover:bg-[#1f2438]/50 transition-colors cursor-pointer group"
            >
              <td>
                <span className="font-medium text-white group-hover:text-[#3b6ef0] transition-colors">
                  {leave.employee.firstName} {leave.employee.lastName}
                </span>
                <p className="text-xs text-[#4b5563]">{leave.employee.employeeCode}</p>
              </td>
              <td>
                <span className="status-pill bg-blue-500/10 text-blue-400 border border-blue-800/40">
                  {leave.leaveType?.name ?? 'General'}
                </span>
              </td>
              <td className="text-[#6b7280] text-xs font-mono">
                {formatDateRange(leave.startDate, leave.endDate)}
              </td>
              <td className="font-bold text-white font-mono">
                {parseFloat(leave.numberOfDays.toString())}
              </td>
              {isPendingTable ? (
                <td className="text-[#6b7280] max-w-48 truncate text-xs">
                  {leave.reason ?? '—'}
                </td>
              ) : (
                <td>
                  <span className={cn('status-pill', LEAVE_STATUS_COLORS[leave.status])}>
                    {snakeToTitle(leave.status)}
                  </span>
                </td>
              )}
              <td className="text-[#6b7280] text-xs font-mono">{formatDate(leave.createdAt)}</td>
              {isPendingTable && (
                <td onClick={(e) => e.stopPropagation()}>
                  <LeaveActionsClient leaveId={leave.id} />
                </td>
              )}
              <td className="text-right">
                <Link
                  href={`/time-off/requests/${leave.id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="p-1.5 rounded text-[#6b7280] hover:text-white inline-flex transition-colors"
                  title="View Request Details"
                >
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
