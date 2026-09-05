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
import { Calendar, CheckCircle, XCircle, Clock, Plus, X, ChevronRight } from 'lucide-react';
import { formatDate, LEAVE_STATUS_COLORS, cn, snakeToTitle, formatDateRange } from '@/lib/utils';
import { canApproveLeave } from '@/lib/rbac';
import { LeaveActionsClient } from '../../leaves/leave-actions-client';

import { RequestsTableClient } from './requests-table-client';

export const metadata: Metadata = { title: 'Time Off Requests' };

type LeaveWithRelations = LeaveRequest & {
  employee: Employee;
  leaveType: LeaveType | null;
};

export default async function TimeOffRequestsPage({
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
  const canApprove = canApproveLeave(role);
  const targetEmployeeId = searchParams?.employee_id || searchParams?.employeeId;

  if (isEmployee && targetEmployeeId && targetEmployeeId !== session.user.employeeId) {
    redirect('/time-off/requests');
  }

  const filterEmployeeId = isEmployee
    ? session.user.employeeId
    : targetEmployeeId || undefined;

  const leaves: LeaveWithRelations[] = (await db.query.leaveRequests.findMany({
    where: filterEmployeeId ? eq(leaveRequests.employeeId, filterEmployeeId) : undefined,
    with: { employee: true, leaveType: true },
    orderBy: [desc(leaveRequests.createdAt)],
  })) as LeaveWithRelations[];

  const pending: LeaveWithRelations[] = leaves.filter((l: LeaveWithRelations) => l.status === 'pending');

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Time Off Requests</h1>
          <p className="text-[#6b7280] text-sm mt-0.5">
            {targetEmployeeId
              ? `Filtered leave records for selected employee`
              : `${pending.length} pending manager approval`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {targetEmployeeId && (
            <Link
              href="/time-off/requests"
              className="inline-flex items-center gap-1 text-xs text-[#9ca3af] hover:text-white px-3 py-1.5 rounded-lg border border-[#2a2d3e] bg-[#111318]"
            >
              <X className="w-3.5 h-3.5" />
              Clear Filter
            </Link>
          )}
          <Link href="/time-off/requests/new" className="btn-primary">
            <Plus className="w-4 h-4" />
            Request Time Off
          </Link>
        </div>
      </div>

      {/* Pending Section for Managers */}
      {canApprove && pending.length > 0 && (
        <div className="section-card">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-[#2a2d3e]">
            <Clock className="w-4 h-4 text-yellow-400" />
            <h2 className="text-sm font-semibold text-white">Pending Approval ({pending.length})</h2>
          </div>
          <RequestsTableClient
            leaves={pending.map((l) => ({
              id: l.id,
              startDate: l.startDate,
              endDate: l.endDate,
              numberOfDays: l.numberOfDays,
              reason: l.reason,
              status: l.status,
              createdAt: l.createdAt,
              employee: {
                id: l.employee.id,
                firstName: l.employee.firstName,
                lastName: l.employee.lastName,
                employeeCode: l.employee.employeeCode,
              },
              leaveType: l.leaveType ? { id: l.leaveType.id, name: l.leaveType.name } : null,
            }))}
            isPendingTable={true}
          />
        </div>
      )}

      {/* All Requests */}
      <div className="section-card">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-[#2a2d3e]">
          <Calendar className="w-4 h-4 text-[#3b6ef0]" />
          <h2 className="text-sm font-semibold text-white">All Time Off Requests</h2>
        </div>
        <RequestsTableClient
          leaves={leaves.map((l) => ({
            id: l.id,
            startDate: l.startDate,
            endDate: l.endDate,
            numberOfDays: l.numberOfDays,
            reason: l.reason,
            status: l.status,
            createdAt: l.createdAt,
            employee: {
              id: l.employee.id,
              firstName: l.employee.firstName,
              lastName: l.employee.lastName,
              employeeCode: l.employee.employeeCode,
            },
            leaveType: l.leaveType ? { id: l.leaveType.id, name: l.leaveType.name } : null,
          }))}
          isPendingTable={false}
        />
      </div>
    </div>
  );
}
