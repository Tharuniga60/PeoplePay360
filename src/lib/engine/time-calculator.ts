import { addDays, eachDayOfInterval, format, getDay, parseISO } from 'date-fns';
import type { ScheduleLine, Attendance, LeaveRequest } from '@/db/schema';

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

export interface TimeMetrics {
  plannedDays: number;
  plannedHours: number;
  workedDays: number;
  workedHours: number;
  overtimeHours: number;
  lopDays: number;
}

interface DailySchedule {
  dayOfWeek: string;
  isWorkingDay: boolean;
  dailyHours: number; // gross hours minus break
}

// ─────────────────────────────────────────────
// DAY-OF-WEEK MAPPING
// ─────────────────────────────────────────────

const DAY_NAME_MAP: Record<number, string> = {
  0: 'sunday',
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday',
};

// ─────────────────────────────────────────────
// BUILD DAILY SCHEDULE MAP FROM SCHEDULE LINES
// ─────────────────────────────────────────────

function buildScheduleMap(scheduleLines: ScheduleLine[]): Map<string, DailySchedule> {
  const map = new Map<string, DailySchedule>();
  for (const line of scheduleLines) {
    // Parse "09:00:00" strings
    const [fromH, fromM] = line.workFrom.split(':').map(Number);
    const [toH, toM] = line.workTo.split(':').map(Number);
    const grossMinutes = (toH * 60 + toM) - (fromH * 60 + fromM);
    const netMinutes = Math.max(0, grossMinutes - line.breakDurationMinutes);
    map.set(line.dayOfWeek, {
      dayOfWeek: line.dayOfWeek,
      isWorkingDay: line.isWorkingDay,
      dailyHours: netMinutes / 60,
    });
  }
  return map;
}

// ─────────────────────────────────────────────
// CALCULATE PLANNED HOURS IN DATE RANGE
// ─────────────────────────────────────────────

export function calculatePlannedHours(
  scheduleLines: ScheduleLine[],
  startDate: string | Date,
  endDate: string | Date
): { plannedDays: number; plannedHours: number } {
  const start = typeof startDate === 'string' ? parseISO(startDate) : startDate;
  const end = typeof endDate === 'string' ? parseISO(endDate) : endDate;

  const scheduleMap = buildScheduleMap(scheduleLines);
  const days = eachDayOfInterval({ start, end });

  let plannedDays = 0;
  let plannedHours = 0;

  for (const day of days) {
    const dayName = DAY_NAME_MAP[getDay(day)];
    const schedule = scheduleMap.get(dayName);
    if (schedule?.isWorkingDay) {
      plannedDays += 1;
      plannedHours += schedule.dailyHours;
    }
  }

  return { plannedDays, plannedHours };
}

// ─────────────────────────────────────────────
// DERIVE WORKED METRICS
// Compares attendances + leaves against scheduled lines
// ─────────────────────────────────────────────

export function deriveWorkedMetrics(
  scheduleLines: ScheduleLine[],
  attendances: Attendance[],
  leaveRequests: LeaveRequest[],
  startDate: string | Date,
  endDate: string | Date
): TimeMetrics {
  const start = typeof startDate === 'string' ? parseISO(startDate) : startDate;
  const end = typeof endDate === 'string' ? parseISO(endDate) : endDate;

  const scheduleMap = buildScheduleMap(scheduleLines);
  const days = eachDayOfInterval({ start, end });

  // Build lookup maps
  const attendanceMap = new Map<string, Attendance>();
  for (const att of attendances) {
    attendanceMap.set(att.attendanceDate, att);
  }

  // Expand leave requests into individual date sets
  const approvedLeaveDates = new Set<string>();
  const unpaidLeaveDates = new Set<string>();

  for (const req of leaveRequests) {
    if (req.status !== 'approved') continue;
    const leaveStart = parseISO(req.startDate);
    const leaveEnd = parseISO(req.endDate);
    const leaveDays = eachDayOfInterval({ start: leaveStart, end: leaveEnd });
    for (const d of leaveDays) {
      const key = format(d, 'yyyy-MM-dd');
      approvedLeaveDates.add(key);
      // We'd need leaveType.isPaid here — for simplicity we track unpaid via attendance status
    }
  }

  let plannedDays = 0;
  let plannedHours = 0;
  let workedDays = 0;
  let workedHours = 0;
  let overtimeHours = 0;
  let lopDays = 0;

  for (const day of days) {
    const dayName = DAY_NAME_MAP[getDay(day)];
    const schedule = scheduleMap.get(dayName);

    // Skip non-working days (weekends with no schedule)
    if (!schedule?.isWorkingDay) continue;

    const dateKey = format(day, 'yyyy-MM-dd');
    plannedDays += 1;
    plannedHours += schedule.dailyHours;

    const attendance = attendanceMap.get(dateKey);
    const isOnApprovedLeave = approvedLeaveDates.has(dateKey);

    if (isOnApprovedLeave) {
      // Approved paid leave — counts as worked for payroll purposes
      workedDays += 1;
      workedHours += schedule.dailyHours;
    } else if (attendance) {
      const status = attendance.status;
      if (status === 'present') {
        const ah = parseFloat(attendance.workedHours?.toString() ?? '0') || schedule.dailyHours;
        const ot = parseFloat(attendance.overtimeHours?.toString() ?? '0') || 0;
        workedDays += 1;
        workedHours += ah;
        overtimeHours += ot;
      } else if (status === 'half_day') {
        workedDays += 0.5;
        workedHours += schedule.dailyHours / 2;
        lopDays += 0.5;
      } else if (status === 'absent' || status === 'on_leave') {
        // Absent / unapproved leave = LOP
        lopDays += 1;
      }
      // 'holiday' and 'weekend' are already excluded by isWorkingDay check
    } else {
      // If employee has attendance records for this period, unlogged working day is considered absent (LOP)
      // Otherwise (no attendance tracking yet), default to worked day
      if (attendances.length > 0) {
        lopDays += 1;
      } else {
        workedDays += 1;
        workedHours += schedule.dailyHours;
      }
    }
  }

  return {
    plannedDays,
    plannedHours,
    workedDays,
    workedHours,
    overtimeHours,
    lopDays,
  };
}
