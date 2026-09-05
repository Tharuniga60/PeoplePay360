'use client';

import { Document, Page, View, Text, StyleSheet, Font } from '@react-pdf/renderer';

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

interface PayslipPDFData {
  payrun: {
    name: string;
    periodStart: string;
    periodEnd: string;
    status: string;
  };
  employee: {
    employeeCode: string;
    firstName: string;
    lastName: string;
    email: string;
    bankName?: string | null;
    bankAccountNumber?: string | null;
    bankIfscCode?: string | null;
    department?: { name: string } | null;
    jobPosition?: { title: string } | null;
    branch?: { name: string } | null;
  };
  contract: {
    name: string;
    wage: string;
    salaryStructure?: { name: string } | null;
  } | null;
  metrics: {
    plannedDays: string;
    workedDays: string;
    lopDays: string;
    overtimeHours: string;
  };
  lines: Array<{
    sequence: number;
    code: string;
    name: string;
    category: string;
    amount: string;
    calculationTrace: { skipped: boolean };
  }>;
  totals: {
    gross: string;
    deductions: string;
    net: string;
  };
}

// ─────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#1a1a1a',
    backgroundColor: '#ffffff',
    padding: 36,
  },
  // Header
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottom: '2px solid #3b6ef0',
  },
  companyName: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: '#3b6ef0',
  },
  companySubtitle: {
    fontSize: 8,
    color: '#6b7280',
    marginTop: 2,
  },
  payslipTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#111318',
    textAlign: 'right',
  },
  payslipPeriod: {
    fontSize: 8,
    color: '#6b7280',
    textAlign: 'right',
    marginTop: 2,
  },
  // Section
  sectionTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
    marginTop: 14,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  infoCell: {
    width: '33.33%',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 7,
    color: '#9ca3af',
    marginBottom: 1,
  },
  infoValue: {
    fontSize: 9,
    color: '#111318',
    fontFamily: 'Helvetica-Bold',
  },
  // Earnings/Deductions Table
  table: {
    marginTop: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderBottom: '1px solid #e2e8f0',
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  tableHeaderText: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#6b7280',
    textTransform: 'uppercase',
    flex: 1,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderBottom: '1px solid #f1f5f9',
  },
  tableRowAlt: {
    backgroundColor: '#fafafa',
  },
  tableCell: {
    flex: 1,
    fontSize: 9,
    color: '#374151',
  },
  tableCellAmount: {
    flex: 1,
    fontSize: 9,
    color: '#374151',
    textAlign: 'right',
    fontFamily: 'Helvetica-Bold',
  },
  // Totals
  totalsBox: {
    marginTop: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 4,
    padding: 10,
    borderTop: '2px solid #3b6ef0',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  totalLabel: {
    fontSize: 9,
    color: '#6b7280',
  },
  totalValue: {
    fontSize: 9,
    color: '#374151',
    fontFamily: 'Helvetica-Bold',
    textAlign: 'right',
  },
  netPayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingTop: 6,
    borderTop: '1px solid #e2e8f0',
  },
  netPayLabel: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#111318',
  },
  netPayValue: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#10b981',
    textAlign: 'right',
  },
  // Footer
  footer: {
    marginTop: 20,
    paddingTop: 10,
    borderTop: '1px solid #e2e8f0',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: {
    fontSize: 7,
    color: '#9ca3af',
  },
  watermark: {
    fontSize: 7,
    color: '#d1d5db',
    textAlign: 'right',
  },
});

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function formatINR(amount: string | number): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ─────────────────────────────────────────────
// PDF DOCUMENT COMPONENT
// ─────────────────────────────────────────────

export function PayslipPDFDocument({ data }: { data: PayslipPDFData }) {
  const earnings = data.lines.filter((l) =>
    ['BASIC', 'ALW', 'GROSS'].includes(l.category) && !l.calculationTrace.skipped
  );
  const deductions = data.lines.filter((l) =>
    l.category === 'DED' && !l.calculationTrace.skipped
  );

  return (
    <Document
      title={`Payslip — ${data.employee.firstName} ${data.employee.lastName} — ${data.payrun.periodStart}`}
      author="PeoplePay360"
    >
      <Page size="A4" style={styles.page}>
        {/* ── Header ─────────────────────────────── */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.companyName}>PeoplePay360</Text>
            <Text style={styles.companySubtitle}>Acme Corporation Pvt. Ltd.</Text>
          </View>
          <View>
            <Text style={styles.payslipTitle}>PAYSLIP</Text>
            <Text style={styles.payslipPeriod}>
              {data.payrun.periodStart} to {data.payrun.periodEnd}
            </Text>
          </View>
        </View>

        {/* ── Employee Info ───────────────────────── */}
        <Text style={styles.sectionTitle}>Employee Details</Text>
        <View style={styles.infoGrid}>
          {[
            { label: 'Employee Name', value: `${data.employee.firstName} ${data.employee.lastName}` },
            { label: 'Employee Code', value: data.employee.employeeCode },
            { label: 'Email', value: data.employee.email },
            { label: 'Department', value: data.employee.department?.name ?? '—' },
            { label: 'Designation', value: data.employee.jobPosition?.title ?? '—' },
            { label: 'Branch', value: data.employee.branch?.name ?? '—' },
            { label: 'Contract', value: data.contract?.name ?? '—' },
            { label: 'Salary Structure', value: data.contract?.salaryStructure?.name ?? '—' },
            { label: 'Pay Status', value: data.payrun.status.toUpperCase() },
          ].map((info) => (
            <View key={info.label} style={styles.infoCell}>
              <Text style={styles.infoLabel}>{info.label}</Text>
              <Text style={styles.infoValue}>{info.value}</Text>
            </View>
          ))}
        </View>

        {/* ── Attendance Summary ──────────────────── */}
        <Text style={styles.sectionTitle}>Attendance Summary</Text>
        <View style={styles.infoGrid}>
          {[
            { label: 'Planned Days', value: parseFloat(data.metrics.plannedDays).toString() },
            { label: 'Worked Days', value: parseFloat(data.metrics.workedDays).toString() },
            { label: 'LOP Days', value: parseFloat(data.metrics.lopDays).toString() },
            { label: 'Overtime Hours', value: parseFloat(data.metrics.overtimeHours).toFixed(1) },
          ].map((m) => (
            <View key={m.label} style={styles.infoCell}>
              <Text style={styles.infoLabel}>{m.label}</Text>
              <Text style={styles.infoValue}>{m.value}</Text>
            </View>
          ))}
        </View>

        {/* ── Earnings ───────────────────────────── */}
        <Text style={styles.sectionTitle}>Earnings</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, { flex: 0.5 }]}>Code</Text>
            <Text style={styles.tableHeaderText}>Description</Text>
            <Text style={[styles.tableHeaderText, { textAlign: 'right' }]}>Amount</Text>
          </View>
          {earnings.map((line, i) => (
            <View key={line.code} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}>
              <Text style={[styles.tableCell, { flex: 0.5, color: '#6b7280', fontSize: 7 }]}>{line.code}</Text>
              <Text style={styles.tableCell}>{line.name}</Text>
              <Text style={styles.tableCellAmount}>{formatINR(line.amount)}</Text>
            </View>
          ))}
        </View>

        {/* ── Deductions ─────────────────────────── */}
        {deductions.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Deductions</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderText, { flex: 0.5 }]}>Code</Text>
                <Text style={styles.tableHeaderText}>Description</Text>
                <Text style={[styles.tableHeaderText, { textAlign: 'right' }]}>Amount</Text>
              </View>
              {deductions.map((line, i) => (
                <View key={line.code} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}>
                  <Text style={[styles.tableCell, { flex: 0.5, color: '#6b7280', fontSize: 7 }]}>{line.code}</Text>
                  <Text style={styles.tableCell}>{line.name}</Text>
                  <Text style={[styles.tableCellAmount, { color: '#ef4444' }]}>({formatINR(line.amount)})</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* ── Totals ─────────────────────────────── */}
        <View style={styles.totalsBox}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Gross Pay</Text>
            <Text style={styles.totalValue}>{formatINR(data.totals.gross)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Deductions</Text>
            <Text style={[styles.totalValue, { color: '#ef4444' }]}>({formatINR(data.totals.deductions)})</Text>
          </View>
          <View style={styles.netPayRow}>
            <Text style={styles.netPayLabel}>Net Pay</Text>
            <Text style={styles.netPayValue}>{formatINR(data.totals.net)}</Text>
          </View>
        </View>

        {/* ── Bank Details ────────────────────────── */}
        {data.employee.bankAccountNumber && (
          <>
            <Text style={styles.sectionTitle}>Payment Details</Text>
            <View style={styles.infoGrid}>
              {[
                { label: 'Bank Name', value: data.employee.bankName ?? '—' },
                { label: 'Account Number', value: data.employee.bankAccountNumber },
                { label: 'IFSC Code', value: data.employee.bankIfscCode ?? '—' },
              ].map((b) => (
                <View key={b.label} style={styles.infoCell}>
                  <Text style={styles.infoLabel}>{b.label}</Text>
                  <Text style={styles.infoValue}>{b.value}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* ── Footer ─────────────────────────────── */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            This is a computer-generated payslip and does not require a signature.
          </Text>
          <Text style={styles.watermark}>Generated by PeoplePay360 · Zero-Storage PDF</Text>
        </View>
      </Page>
    </Document>
  );
}
