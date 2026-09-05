import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import {
  contracts,
  employees,
  attendances,
  leaveRequests,
  salaryRules,
  workingSchedules,
  scheduleLines,
} from '@/db/schema';
import { and, eq, gte, lte, isNotNull } from 'drizzle-orm';
import { auth } from '@/auth';
import { wizardStep1Schema } from '@/lib/validations';
import { parseISO } from 'date-fns';

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

  const { periodStart, periodEnd, salaryStructureId, companyId } = parsed.data;

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

  // 2. Fetch all active contracts for this structure in this company
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

  const start = parseISO(periodStart);
  const end = parseISO(periodEnd);

  const candidates: WizardCandidate[] = [];

  for (const contract of activeContracts) {
    const emp = contract.employee;
    if (emp.companyId !== companyId) continue;

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

    // Check: attendance coverage for the period
    const attendanceCount = await db
      .select({ id: attendances.id })
      .from(attendances)
      .where(
        and(
          eq(attendances.employeeId, emp.id),
          gte(attendances.attendanceDate, periodStart),
          lte(attendances.attendanceDate, periodEnd)
        )
      );

    if (attendanceCount.length === 0) {
      warnings.push({ code: 'NO_ATTENDANCE', message: `No attendance records found for ${periodStart} – ${periodEnd}.`, severity: 'warning' });
    }

    candidates.push({
      employeeId: emp.id,
      employeeCode: emp.employeeCode,
      fullName: `${emp.firstName} ${emp.lastName}`,
      contractId: contract.id,
      wage: parseFloat(contract.wage.toString()),
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
