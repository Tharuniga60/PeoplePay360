import { db } from '@/db';
import { leaveAllocations, leaveRequests } from '@/db/schema';
import { and, eq, notInArray } from 'drizzle-orm';

export interface LeaveBalanceSummary {
  allocatedDays: number;
  takenDays: number;
  pendingDays: number;
  remainingDays: number;
  isEligible: boolean;
  notes: string[];
}

/**
 * Compute the live leave balance for an employee for a specific leave type and year/date.
 * Enforces business rules:
 * - Refused/to_approve allocations count as 0. Only 'approved' allocations count.
 * - Allocations past validityEnd are expired and count as 0.
 * - Allocations before validityStart are not yet active.
 * - Taken days = approved leaves in period.
 * - Pending days = leaves awaiting approval.
 * - Remaining days = allocated - (taken + pending).
 */
export async function computeLeaveBalance(params: {
  employeeId: string;
  leaveTypeId: string;
  year: number;
  requestStartDate?: string;
  requestEndDate?: string;
}): Promise<LeaveBalanceSummary> {
  const { employeeId, leaveTypeId, year, requestStartDate } = params;

  // 1. Fetch allocations for employee and leave type
  const allocations = await db.query.leaveAllocations.findMany({
    where: and(
      eq(leaveAllocations.employeeId, employeeId),
      eq(leaveAllocations.leaveTypeId, leaveTypeId),
      eq(leaveAllocations.year, year)
    ),
  });

  const notes: string[] = [];
  const reqDate = requestStartDate ? new Date(requestStartDate) : new Date();

  // Filter approved and valid allocations
  let totalAllocated = 0;
  for (const alloc of allocations) {
    if (alloc.status !== 'approved') {
      notes.push(`Allocation of ${alloc.totalDays} days ignored (status: ${alloc.status})`);
      continue;
    }

    if (alloc.validityStart && new Date(alloc.validityStart) > reqDate) {
      notes.push(`Allocation of ${alloc.totalDays} days is not yet active until ${alloc.validityStart}`);
      continue;
    }

    if (alloc.validityEnd && new Date(alloc.validityEnd) < reqDate) {
      notes.push(`Allocation of ${alloc.totalDays} days expired on ${alloc.validityEnd}`);
      continue;
    }

    totalAllocated += parseFloat(alloc.totalDays.toString());
  }

  // 2. Fetch existing leave requests for this leave type and year
  const allRequests = await db.query.leaveRequests.findMany({
    where: and(
      eq(leaveRequests.employeeId, employeeId),
      eq(leaveRequests.leaveTypeId, leaveTypeId)
    ),
  });

  // Filter requests for the current year
  const yearRequests = allRequests.filter((r) => {
    const startYear = new Date(r.startDate).getFullYear();
    return startYear === year && r.status !== 'rejected' && r.status !== 'draft';
  });

  const takenDays = yearRequests
    .filter((r) => r.status === 'approved')
    .reduce((sum, r) => sum + parseFloat(r.numberOfDays.toString()), 0);

  const pendingDays = yearRequests
    .filter((r) => r.status === 'pending')
    .reduce((sum, r) => sum + parseFloat(r.numberOfDays.toString()), 0);

  const remainingDays = Math.max(0, Math.round((totalAllocated - (takenDays + pendingDays)) * 100) / 100);

  return {
    allocatedDays: Math.round(totalAllocated * 100) / 100,
    takenDays: Math.round(takenDays * 100) / 100,
    pendingDays: Math.round(pendingDays * 100) / 100,
    remainingDays,
    isEligible: remainingDays > 0,
    notes,
  };
}
