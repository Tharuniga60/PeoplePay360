import { db } from '@/db';
import {
  attendances,
  employees,
  contracts,
  workingSchedules,
  scheduleLines,
  leaveRequests,
} from '@/db/schema';
import { and, eq, gte, lte, inArray } from 'drizzle-orm';
import { eachDayOfInterval, format, parseISO, getDay } from 'date-fns';

const DAY_MAP: Record<number, string> = {
  0: 'sunday',
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday',
};

export interface SyncScheduleAttendanceOptions {
  companyId: string;
  startDate: string;
  endDate: string;
  employeeIds?: string[];
}

/**
 * Synchronizes attendance records based on employee working schedules (or Mon-Fri 8h default)
 * and approved leave requests for a given date range.
 * Preserves existing attendance entries via ON CONFLICT DO NOTHING.
 * Optimized with pre-fetched leave data and bulk multi-row insert batching.
 */
export async function syncScheduleAttendance({
  companyId,
  startDate,
  endDate,
  employeeIds,
}: SyncScheduleAttendanceOptions): Promise<{ generatedCount: number; employeesProcessed: number }> {
  const start = parseISO(startDate);
  const end = parseISO(endDate);

  if (end < start) {
    throw new Error('endDate must be after startDate');
  }

  // 1. Fetch employees with their contract schedules and default schedules (Single query)
  const empList = await db.query.employees.findMany({
    where: eq(employees.companyId, companyId),
    with: {
      defaultSchedule: { with: { scheduleLines: true } },
      contracts: {
        where: eq(contracts.status, 'active'),
        with: { schedule: { with: { scheduleLines: true } } },
        limit: 1,
      },
    },
  });

  const targetEmployees = employeeIds && Array.isArray(employeeIds) && employeeIds.length > 0
    ? empList.filter((e) => employeeIds.includes(e.id))
    : empList;

  if (targetEmployees.length === 0) {
    return { generatedCount: 0, employeesProcessed: 0 };
  }

  const targetEmpIds = targetEmployees.map((e) => e.id);

  // 2. Fetch ALL approved leaves for all target employees in a SINGLE query!
  const approvedLeaves = await db.query.leaveRequests.findMany({
    where: and(
      inArray(leaveRequests.employeeId, targetEmpIds),
      eq(leaveRequests.status, 'approved'),
      lte(leaveRequests.startDate, endDate),
      gte(leaveRequests.endDate, startDate)
    ),
  });

  // Map employeeId -> Set of leave date strings (YYYY-MM-DD)
  const leavesByEmp = new Map<string, Set<string>>();
  for (const req of approvedLeaves) {
    let leaveDates = leavesByEmp.get(req.employeeId);
    if (!leaveDates) {
      leaveDates = new Set<string>();
      leavesByEmp.set(req.employeeId, leaveDates);
    }
    const lStart = parseISO(req.startDate);
    const lEnd = parseISO(req.endDate);
    const lDays = eachDayOfInterval({ start: lStart, end: lEnd });
    for (const d of lDays) {
      leaveDates.add(format(d, 'yyyy-MM-dd'));
    }
  }

  const days = eachDayOfInterval({ start, end });
  const recordsToInsert: Array<typeof attendances.$inferInsert> = [];

  for (const emp of targetEmployees) {
    const activeContract = emp.contracts[0];
    const lines = activeContract?.schedule?.scheduleLines ?? emp.defaultSchedule?.scheduleLines ?? [];

    const scheduleMap = new Map<string, typeof lines[0]>();
    for (const l of lines) {
      scheduleMap.set(l.dayOfWeek, l);
    }

    const empLeaveDates = leavesByEmp.get(emp.id);

    for (const day of days) {
      const dayName = DAY_MAP[getDay(day)];
      const line = scheduleMap.get(dayName);

      // Default Mon-Fri if no explicit schedule line
      const isWorking = line ? line.isWorkingDay : (getDay(day) >= 1 && getDay(day) <= 5);
      if (!isWorking) continue;

      const dateStr = format(day, 'yyyy-MM-dd');
      const isOnLeave = empLeaveDates ? empLeaveDates.has(dateStr) : false;

      const workFrom = line?.workFrom ? line.workFrom.substring(0, 5) : '09:00';
      const workTo = line?.workTo ? line.workTo.substring(0, 5) : '18:00';

      recordsToInsert.push({
        employeeId: emp.id,
        attendanceDate: dateStr,
        status: (isOnLeave ? 'on_leave' : 'present') as 'present' | 'absent' | 'half_day' | 'on_leave' | 'holiday' | 'weekend',
        checkIn: isOnLeave ? null : new Date(`${dateStr}T${workFrom}:00.000Z`),
        checkOut: isOnLeave ? null : new Date(`${dateStr}T${workTo}:00.000Z`),
        workedHours: isOnLeave ? '0' : '8',
        overtimeHours: '0',
        notes: isOnLeave ? 'Approved Leave' : 'Auto-synced from working schedule',
      });
    }
  }

  // 3. Batch insert in chunks of 250 with ON CONFLICT DO NOTHING
  let generatedCount = 0;
  const BATCH_SIZE = 250;

  for (let i = 0; i < recordsToInsert.length; i += BATCH_SIZE) {
    const batch = recordsToInsert.slice(i, i + BATCH_SIZE);
    try {
      const inserted = await db
        .insert(attendances)
        .values(batch)
        .onConflictDoNothing({ target: [attendances.employeeId, attendances.attendanceDate] })
        .returning({ id: attendances.id });
      generatedCount += inserted.length;
    } catch (e) {
      console.error('Batch insert attendance error:', e);
    }
  }

  return {
    generatedCount,
    employeesProcessed: targetEmployees.length,
  };
}
