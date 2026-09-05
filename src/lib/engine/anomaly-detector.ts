import type { Payslip, PayslipLine, Employee } from '@/db/schema';

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

export interface AnomalyInput {
  payslip: Payslip;
  lines: PayslipLine[];
  employee: Employee;
  previousNetPay?: number; // Optional: previous period net for drift detection
}

export interface DetectedAnomaly {
  payslipId: string;
  employeeId: string;
  severity: 'info' | 'warning' | 'critical';
  anomalyType: string;
  message: string;
  details: Record<string, unknown>;
}

// ─────────────────────────────────────────────
// ANOMALY DETECTION RULES
// ─────────────────────────────────────────────

export function detectAnomalies(inputs: AnomalyInput[]): DetectedAnomaly[] {
  const anomalies: DetectedAnomaly[] = [];

  for (const { payslip, lines: _lines, employee, previousNetPay } of inputs) {
    const netPay = parseFloat(payslip.netTotal?.toString() ?? '0');
    const grossPay = parseFloat(payslip.grossTotal?.toString() ?? '0');
    const plannedHours = parseFloat(payslip.plannedHours?.toString() ?? '0');
    const overtimeHours = parseFloat(payslip.overtimeHours?.toString() ?? '0');
    const lopDays = parseFloat(payslip.lopDays?.toString() ?? '0');
    const plannedDays = parseFloat(payslip.plannedDays?.toString() ?? '0');
    const employeeName = `${employee.firstName} ${employee.lastName}`;

    // ─── RULE 1: Negative Net Pay ───────────────────────
    if (netPay < 0) {
      anomalies.push({
        payslipId: payslip.id,
        employeeId: employee.id,
        severity: 'critical',
        anomalyType: 'NEGATIVE_NET_PAY',
        message: `${employeeName} has negative net pay of ₹${netPay.toFixed(2)}.`,
        details: { netPay, grossPay, employeeCode: employee.employeeCode },
      });
    }

    // ─── RULE 2: Zero Net Pay (non-negative) ────────────
    if (netPay === 0 && grossPay > 0) {
      anomalies.push({
        payslipId: payslip.id,
        employeeId: employee.id,
        severity: 'warning',
        anomalyType: 'ZERO_NET_PAY',
        message: `${employeeName} has zero net pay despite gross of ₹${grossPay.toFixed(2)}.`,
        details: { netPay, grossPay },
      });
    }

    // ─── RULE 3: Overtime exceeds 30% of planned hours ──
    if (plannedHours > 0 && overtimeHours > 0) {
      const overtimeRatio = overtimeHours / plannedHours;
      if (overtimeRatio > 0.3) {
        anomalies.push({
          payslipId: payslip.id,
          employeeId: employee.id,
          severity: 'warning',
          anomalyType: 'EXCESSIVE_OVERTIME',
          message: `${employeeName} overtime (${overtimeHours}h) exceeds 30% of planned hours (${plannedHours}h). Ratio: ${(overtimeRatio * 100).toFixed(1)}%.`,
          details: {
            overtimeHours,
            plannedHours,
            overtimeRatio: parseFloat(overtimeRatio.toFixed(4)),
          },
        });
      }
    }

    // ─── RULE 4: LOP > 20% of planned days ──────────────
    if (plannedDays > 0 && lopDays > 0) {
      const lopRatio = lopDays / plannedDays;
      if (lopRatio > 0.2) {
        anomalies.push({
          payslipId: payslip.id,
          employeeId: employee.id,
          severity: 'warning',
          anomalyType: 'HIGH_LOP_RATIO',
          message: `${employeeName} has ${lopDays} LOP days (${(lopRatio * 100).toFixed(1)}% of planned ${plannedDays} days). Verify attendance records.`,
          details: {
            lopDays,
            plannedDays,
            lopRatio: parseFloat(lopRatio.toFixed(4)),
          },
        });
      }
    }

    // ─── RULE 5: Sudden salary drop vs. previous period ─
    if (previousNetPay !== undefined && previousNetPay > 0 && netPay > 0) {
      const dropRatio = (previousNetPay - netPay) / previousNetPay;
      if (dropRatio > 0.2) {
        anomalies.push({
          payslipId: payslip.id,
          employeeId: employee.id,
          severity: 'warning',
          anomalyType: 'SALARY_DROP_ANOMALY',
          message: `${employeeName} salary dropped by ${(dropRatio * 100).toFixed(1)}% compared to previous period (₹${previousNetPay.toFixed(2)} → ₹${netPay.toFixed(2)}).`,
          details: {
            previousNetPay,
            currentNetPay: netPay,
            dropRatio: parseFloat(dropRatio.toFixed(4)),
          },
        });
      }
    }

    // ─── RULE 6: Missing bank details ───────────────────
    if (!employee.bankAccountNumber || !employee.bankIfscCode) {
      anomalies.push({
        payslipId: payslip.id,
        employeeId: employee.id,
        severity: 'info',
        anomalyType: 'MISSING_BANK_DETAILS',
        message: `${employeeName} is missing bank account details. Payment cannot be processed.`,
        details: {
          hasBankAccount: Boolean(employee.bankAccountNumber),
          hasIfsc: Boolean(employee.bankIfscCode),
        },
      });
    }
  }

  return anomalies;
}
