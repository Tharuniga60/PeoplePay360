import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import {
  payslips,
  payslipLines,
  salaryRules,
  attendances,
  leaveRequests,
  contracts,
} from '@/db/schema';
import { eq, and, gte, lte } from 'drizzle-orm';
import { auth } from '@/auth';
import { canComputePayrun } from '@/lib/rbac';
import { deriveWorkedMetrics } from '@/lib/engine/time-calculator';
import { evaluateRules, computeCategoryTotals, type EvaluationContext } from '@/lib/engine/rule-evaluator';
import { logAuditEvent } from '@/lib/audit';

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!canComputePayrun(session.user.role || '')) {
    return NextResponse.json({ error: 'Forbidden: Payroll permissions required' }, { status: 403 });
  }

  const payslip = await db.query.payslips.findFirst({
    where: eq(payslips.id, params.id),
    with: {
      payrun: true,
      employee: {
        with: {
          defaultSchedule: { with: { scheduleLines: true } },
          contracts: {
            where: eq(contracts.status, 'active'),
            limit: 1,
            with: { schedule: { with: { scheduleLines: true } } },
          },
        },
      },
      contract: {
        with: { schedule: { with: { scheduleLines: true } } },
      },
    },
  });

  if (!payslip) {
    return NextResponse.json({ error: 'Payslip not found' }, { status: 404 });
  }

  if (payslip.status === 'paid') {
    return NextResponse.json({ error: 'Cannot recompute a finalized and paid payslip.' }, { status: 400 });
  }

  const structureId = payslip.contract?.salaryStructureId || payslip.payrun?.salaryStructureId;
  if (!structureId) {
    return NextResponse.json({ error: 'No salary structure assigned to payslip/contract' }, { status: 400 });
  }

  // Load rules
  const rules = await db
    .select()
    .from(salaryRules)
    .where(and(eq(salaryRules.salaryStructureId, structureId), eq(salaryRules.isActive, true)))
    .orderBy(salaryRules.sequence);

  if (rules.length === 0) {
    return NextResponse.json({ error: 'No active salary rules found in structure' }, { status: 400 });
  }

  const periodStart = payslip.payrun.periodStart;
  const periodEnd = payslip.payrun.periodEnd;
  const employeeId = payslip.employeeId;

  // Load attendance
  const attRecords = await db
    .select()
    .from(attendances)
    .where(
      and(
        eq(attendances.employeeId, employeeId),
        gte(attendances.attendanceDate, periodStart),
        lte(attendances.attendanceDate, periodEnd)
      )
    );

  // Load approved leaves
  const leaves = await db
    .select()
    .from(leaveRequests)
    .where(
      and(
        eq(leaveRequests.employeeId, employeeId),
        eq(leaveRequests.status, 'approved'),
        gte(leaveRequests.startDate, periodStart),
        lte(leaveRequests.endDate, periodEnd)
      )
    );

  const activeContract = payslip.contract || payslip.employee.contracts[0];
  const wage = activeContract ? parseFloat(activeContract.wage.toString()) : 0;
  const effectiveSchedule = activeContract?.schedule || payslip.employee.defaultSchedule;
  const scheduleLinesList = effectiveSchedule?.scheduleLines ?? [];

  const metrics = deriveWorkedMetrics(
    scheduleLinesList,
    attRecords,
    leaves,
    periodStart,
    periodEnd
  );

  const evalContext: EvaluationContext = {
    contract: { wage },
    worked_days: metrics.workedDays,
    planned_days: metrics.plannedDays,
    worked_hours: metrics.workedHours,
    planned_hours: metrics.plannedHours,
    overtime_hours: metrics.overtimeHours,
    loss_of_pay_days: metrics.lopDays,
    categories: {
      BASIC: 0,
      ALW: 0,
      GROSS: 0,
      DED: 0,
      NET: 0,
      OTHER: 0,
    },
  };

  const lineResults = evaluateRules(rules, evalContext);
  const categoryTotals = computeCategoryTotals(lineResults);

  const grossSalary = categoryTotals['GROSS'] || categoryTotals['BASIC'] || wage;
  const totalDeductions = categoryTotals['DED'] || 0;
  const netSalary = categoryTotals['NET'] || Math.max(0, grossSalary - totalDeductions);

  // Delete old lines
  await db.delete(payslipLines).where(eq(payslipLines.payslipId, payslip.id));

  // Insert fresh lines
  if (lineResults.length > 0) {
    await db.insert(payslipLines).values(
      lineResults.map((lr) => ({
        payslipId: payslip.id,
        salaryRuleId: lr.salaryRuleId,
        sequence: lr.sequence,
        code: lr.code,
        name: lr.name,
        category: lr.category as 'BASIC' | 'ALW' | 'GROSS' | 'DED' | 'NET' | 'OTHER',
        amount: lr.amount.toFixed(2),
        calculationTrace: lr.calculationTrace as unknown as Record<string, unknown>,
      }))
    );
  }

  // Update payslip
  const [updatedPayslip] = await db
    .update(payslips)
    .set({
      basicTotal: wage.toFixed(2),
      grossTotal: grossSalary.toFixed(2),
      deductionsTotal: totalDeductions.toFixed(2),
      netTotal: netSalary.toFixed(2),
      plannedDays: metrics.plannedDays.toFixed(1),
      plannedHours: metrics.plannedHours.toFixed(2),
      workedDays: metrics.workedDays.toFixed(1),
      workedHours: metrics.workedHours.toFixed(2),
      overtimeHours: metrics.overtimeHours.toFixed(2),
      lopDays: metrics.lopDays.toFixed(1),
      status: 'computed',
      updatedAt: new Date(),
    })
    .where(eq(payslips.id, payslip.id))
    .returning();

  await logAuditEvent({
    companyId: session.user.companyId,
    actorId: session.user.id,
    entityName: 'payslips',
    entityId: payslip.id,
    action: 'UPDATE',
    changes: { action: 'RECOMPUTE_PAYSLIP', grossSalary, netSalary, totalDeductions },
  });

  return NextResponse.json({
    message: 'Payslip recomputed successfully',
    data: updatedPayslip,
  });
}
