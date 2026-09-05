import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import {
  payruns,
  payslips,
  payslipLines,
  payrunAnomalies,
  contracts,
  attendances,
  leaveRequests,
  salaryRules,
  scheduleLines,
} from '@/db/schema';
import { and, eq, gte, lte } from 'drizzle-orm';
import { auth } from '@/auth';
import { canComputePayrun } from '@/lib/rbac';
import { logAuditEvent } from '@/lib/audit';
import { deriveWorkedMetrics, calculatePlannedHours } from '@/lib/engine/time-calculator';
import { evaluateRules, computeCategoryTotals, type EvaluationContext } from '@/lib/engine/rule-evaluator';
import { detectAnomalies } from '@/lib/engine/anomaly-detector';
import { syncScheduleAttendance } from '@/lib/attendance';

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!canComputePayrun(session.user.role)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  // ── 1. Load Payrun ──────────────────────────────────────────────
  const payrun = await db.query.payruns.findFirst({
    where: eq(payruns.id, params.id),
    with: { salaryStructure: true },
  });
  if (!payrun) return NextResponse.json({ error: 'Payrun not found' }, { status: 404 });
  if (payrun.status !== 'draft') {
    return NextResponse.json({ error: `Cannot compute payrun in status: ${payrun.status}` }, { status: 400 });
  }

  // ── 2. Load salary rules (sorted by sequence) ───────────────────
  const rules = await db
    .select()
    .from(salaryRules)
    .where(and(eq(salaryRules.salaryStructureId, payrun.salaryStructureId), eq(salaryRules.isActive, true)))
    .orderBy(salaryRules.sequence);

  // ── 3. Load payslip stubs ────────────────────────────────────────
  const payslipStubs = await db.query.payslips.findMany({
    where: eq(payslips.payrunId, payrun.id),
    with: {
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
    },
  });

  // Clear old lines and anomalies
  for (const ps of payslipStubs) {
    await db.delete(payslipLines).where(eq(payslipLines.payslipId, ps.id));
  }
  await db.delete(payrunAnomalies).where(eq(payrunAnomalies.payrunId, payrun.id));

  const anomalyInputs: Parameters<typeof detectAnomalies>[0] = [];

  let totalGross = 0;
  let totalDeductions = 0;
  let totalNet = 0;

  // ── 4. Compute each payslip ──────────────────────────────────────
  for (const stub of payslipStubs) {
    const emp = stub.employee;
    const activeContract = emp.contracts[0];

    if (!activeContract) {
      // No active contract — skip
      continue;
    }

    // Resolve schedule: contract schedule > employee default schedule
    const resolvedScheduleLines =
      (activeContract.schedule?.scheduleLines ?? emp.defaultSchedule?.scheduleLines ?? []) as typeof scheduleLines.$inferSelect[];

    // Fetch attendance for the period
    let empAttendances = await db
      .select()
      .from(attendances)
      .where(
        and(
          eq(attendances.employeeId, emp.id),
          gte(attendances.attendanceDate, payrun.periodStart),
          lte(attendances.attendanceDate, payrun.periodEnd)
        )
      );

    // If no attendance records exist for this period, auto-sync from schedule
    if (empAttendances.length === 0) {
      try {
        await syncScheduleAttendance({
          companyId: payrun.companyId,
          startDate: payrun.periodStart,
          endDate: payrun.periodEnd,
          employeeIds: [emp.id],
        });
        empAttendances = await db
          .select()
          .from(attendances)
          .where(
            and(
              eq(attendances.employeeId, emp.id),
              gte(attendances.attendanceDate, payrun.periodStart),
              lte(attendances.attendanceDate, payrun.periodEnd)
            )
          );
      } catch {
        // Continue with available records
      }
    }

    // Fetch approved leaves for the period
    const empLeaves = await db
      .select()
      .from(leaveRequests)
      .where(
        and(
          eq(leaveRequests.employeeId, emp.id),
          eq(leaveRequests.status, 'approved'),
          gte(leaveRequests.startDate, payrun.periodStart),
          lte(leaveRequests.endDate, payrun.periodEnd)
        )
      );

    // Calculate time metrics
    const metrics = resolvedScheduleLines.length > 0
      ? deriveWorkedMetrics(
          resolvedScheduleLines,
          empAttendances,
          empLeaves,
          payrun.periodStart,
          payrun.periodEnd
        )
      : {
          plannedDays: 0,
          plannedHours: 0,
          workedDays: empAttendances.filter((a) => a.status === 'present').length,
          workedHours: empAttendances.reduce((s, a) => s + parseFloat(a.workedHours?.toString() ?? '0'), 0),
          overtimeHours: empAttendances.reduce((s, a) => s + parseFloat(a.overtimeHours?.toString() ?? '0'), 0),
          lopDays: 0,
        };

    // Build evaluation context
    const context: EvaluationContext = {
      contract: { wage: parseFloat(activeContract.wage.toString()) },
      worked_days: metrics.workedDays,
      planned_days: metrics.plannedDays,
      worked_hours: metrics.workedHours,
      planned_hours: metrics.plannedHours,
      overtime_hours: metrics.overtimeHours,
      loss_of_pay_days: metrics.lopDays,
      categories: { BASIC: 0, ALW: 0, GROSS: 0, DED: 0, NET: 0, OTHER: 0 },
    };

    // Evaluate salary rules
    const evaluatedLines = evaluateRules(rules, context);
    const categoryTotals = computeCategoryTotals(evaluatedLines);

    // Update payslip
    const [updatedPayslip] = await db
      .update(payslips)
      .set({
        contractId: activeContract.id,
        plannedDays: metrics.plannedDays.toString(),
        plannedHours: metrics.plannedHours.toString(),
        workedDays: metrics.workedDays.toString(),
        workedHours: metrics.workedHours.toString(),
        overtimeHours: metrics.overtimeHours.toString(),
        lopDays: metrics.lopDays.toString(),
        basicTotal: categoryTotals.BASIC.toString(),
        allowancesTotal: categoryTotals.ALW.toString(),
        grossTotal: categoryTotals.GROSS.toString(),
        deductionsTotal: categoryTotals.DED.toString(),
        netTotal: categoryTotals.NET.toString(),
        employeeSnapshot: {
          id: emp.id,
          employeeCode: emp.employeeCode,
          firstName: emp.firstName,
          lastName: emp.lastName,
          email: emp.email,
          bankName: emp.bankName,
          bankAccountNumber: emp.bankAccountNumber,
          bankIfscCode: emp.bankIfscCode,
        },
        contractSnapshot: {
          id: activeContract.id,
          name: activeContract.name,
          wage: activeContract.wage,
          startDate: activeContract.startDate,
        },
        status: 'computed',
        updatedAt: new Date(),
      })
      .where(eq(payslips.id, stub.id))
      .returning();

    // Insert payslip lines
    if (evaluatedLines.length > 0) {
      await db.insert(payslipLines).values(
        evaluatedLines.map((line) => ({
          payslipId: stub.id,
          salaryRuleId: line.salaryRuleId,
          sequence: line.sequence,
          code: line.code,
          name: line.name,
          category: line.category as typeof payslipLines.$inferInsert['category'],
          amount: line.amount.toString(),
          calculationTrace: line.calculationTrace,
        }))
      );
    }

    totalGross += categoryTotals.GROSS;
    totalDeductions += categoryTotals.DED;
    totalNet += categoryTotals.NET;

    anomalyInputs.push({
      payslip: updatedPayslip,
      lines: [],
      employee: emp,
    });
  }

  // ── 5. Detect anomalies ──────────────────────────────────────────
  const anomalies = detectAnomalies(anomalyInputs);
  if (anomalies.length > 0) {
    await db.insert(payrunAnomalies).values(
      anomalies.map((a) => ({
        payrunId: payrun.id,
        payslipId: a.payslipId,
        employeeId: a.employeeId,
        severity: a.severity,
        anomalyType: a.anomalyType,
        message: a.message,
        details: a.details,
      }))
    );
  }

  // ── 6. Update payrun status ──────────────────────────────────────
  const [updatedPayrun] = await db
    .update(payruns)
    .set({
      status: 'computed',
      totalGross: totalGross.toString(),
      totalDeductions: totalDeductions.toString(),
      totalNet: totalNet.toString(),
      computedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(payruns.id, payrun.id))
    .returning();

  await logAuditEvent({
    companyId: session.user.companyId,
    actorId: session.user.id,
    entityName: 'payruns',
    entityId: payrun.id,
    action: 'EXECUTE_PAYRUN',
    changes: { totalNet, anomalyCount: anomalies.length },
  });

  return NextResponse.json({
    data: updatedPayrun,
    meta: { anomalyCount: anomalies.length, employeesProcessed: payslipStubs.length },
  });
}
