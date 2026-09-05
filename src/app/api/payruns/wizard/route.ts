import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import {
  contracts,
  employees,
  attendances,
  salaryRules,
} from '@/db/schema';
import { and, eq, gte, lte, inArray } from 'drizzle-orm';
import { auth } from '@/auth';
import { wizardStep1Schema } from '@/lib/validations';
import { parseISO } from 'date-fns';
import { syncScheduleAttendance } from '@/lib/attendance';

interface CandidateWarning {
  code: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
}

interface WizardCandidate {
  employeeId: string;
  employeeCode: string;
  fullName: string;
  contractId: string;
  wage: number;
  attendanceDays: number;
  warnings: CandidateWarning[];
  isReady: boolean;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const parsed = wizardStep1Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation error', issues: parsed.error.issues }, { status: 400 });
  }

  const { periodStart, periodEnd, salaryStructureId, companyId, autoSyncAttendance = true } = parsed.data;

  // 1. Verify salary structure has rules
  const rules = await db
    .select({ id: salaryRules.id })
    .from(salaryRules)
    .where(and(eq(salaryRules.salaryStructureId, salaryStructureId), eq(salaryRules.isActive, true)));

  if (rules.length === 0) {
    return NextResponse.json(
      { error: 'Selected salary structure has no active rules. Please configure rules before running payroll.' },
      { status: 400 }
    );
  }

  // 2. If autoSyncAttendance is enabled, synchronize working schedule attendance for candidates
  if (autoSyncAttendance) {
    try {
      await syncScheduleAttendance({
        companyId,
        startDate: periodStart,
        endDate: periodEnd,
      });
    } catch {
      // Continue even if auto-sync encounters non-fatal condition
    }
  }

  // 3. Fetch all active contracts for this structure in this company
  const activeContracts = await db.query.contracts.findMany({
    where: and(
      eq(contracts.salaryStructureId, salaryStructureId),
      eq(contracts.status, 'active')
    ),
    with: {
      employee: {
        with: { defaultSchedule: { with: { scheduleLines: true } } },
      },
    },
  });

  const matchingContracts = activeContracts.filter((c) => c.employee.companyId === companyId);
  const targetEmpIds = matchingContracts.map((c) => c.employee.id);

  // Batch query all attendances for these employees in this period in ONE single query!
  const allAttendances = targetEmpIds.length > 0
    ? await db
        .select({
          id: attendances.id,
          employeeId: attendances.employeeId,
          status: attendances.status,
          checkIn: attendances.checkIn,
          checkOut: attendances.checkOut,
          workedHours: attendances.workedHours,
        })
        .from(attendances)
        .where(
          and(
            inArray(attendances.employeeId, targetEmpIds),
            gte(attendances.attendanceDate, periodStart),
            lte(attendances.attendanceDate, periodEnd)
          )
        )
    : [];

  const attendancesByEmp = new Map<string, typeof allAttendances>();
  for (const att of allAttendances) {
    let list = attendancesByEmp.get(att.employeeId);
    if (!list) {
      list = [];
      attendancesByEmp.set(att.employeeId, list);
    }
    list.push(att);
  }

  const candidates: WizardCandidate[] = [];

  for (const contract of matchingContracts) {
    const emp = contract.employee;
    const warnings: CandidateWarning[] = [];

    // Check: employee still active
    if (!emp.isActive) {
      warnings.push({ code: 'INACTIVE_EMPLOYEE', message: 'Employee is marked inactive.', severity: 'critical' });
    }

    // Check: missing bank info
    if (!emp.bankAccountNumber || !emp.bankIfscCode) {
      warnings.push({ code: 'MISSING_BANK', message: 'Bank account details are incomplete.', severity: 'warning' });
    }

    // Check: schedule assigned
    const hasSchedule = contract.scheduleId || emp.defaultScheduleId;
    if (!hasSchedule) {
      warnings.push({ code: 'NO_SCHEDULE', message: 'No working schedule assigned to employee or contract.', severity: 'warning' });
    }

    // Check: attendance coverage for the period from in-memory Map
    const empAttendances = attendancesByEmp.get(emp.id) || [];

    if (empAttendances.length === 0) {
      warnings.push({
        code: 'NO_ATTENDANCE',
        message: `No attendance records found for ${periodStart} – ${periodEnd}.`,
        severity: 'warning',
      });
    } else {
      // Check for notable attendance exceptions
      const unexcusedAbsences = empAttendances.filter((a) => a.status === 'absent').length;
      if (unexcusedAbsences > 0) {
        warnings.push({
          code: 'ABSENT_DAYS',
          message: `${unexcusedAbsences} day(s) marked absent (loss of pay deduction will apply).`,
          severity: 'warning',
        });
      }
      const missingCheckout = empAttendances.filter((a) => a.status === 'present' && !a.checkOut).length;
      if (missingCheckout > 0) {
        warnings.push({
          code: 'MISSING_CHECKOUT',
          message: `${missingCheckout} check-in(s) missing checkout timestamp.`,
          severity: 'info',
        });
      }
    }

    candidates.push({
      employeeId: emp.id,
      employeeCode: emp.employeeCode,
      fullName: `${emp.firstName} ${emp.lastName}`,
      contractId: contract.id,
      wage: parseFloat(contract.wage.toString()),
      attendanceDays: empAttendances.length,
      warnings,
      isReady: !warnings.some((w) => w.severity === 'critical'),
    });
  }

  return NextResponse.json({
    data: {
      candidates,
      periodStart,
      periodEnd,
      salaryStructureId,
      totalCandidates: candidates.length,
      readyCandidates: candidates.filter((c) => c.isReady).length,
    },
  });
}
