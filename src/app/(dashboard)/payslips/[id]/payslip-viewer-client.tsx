'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ArrowLeft, Download, FileText, Loader2 } from 'lucide-react';
import { formatDate, formatCurrency, PAYRUN_STATUS_COLORS, cn, snakeToTitle } from '@/lib/utils';

// Dynamically import PDF utilities — client-side only
const PDFDownloadLink = dynamic(
  () => import('@react-pdf/renderer').then((mod) => mod.PDFDownloadLink),
  { ssr: false, loading: () => <span className="btn-secondary opacity-50">Loading PDF...</span> }
);

// Import PDF document — also client only
const PayslipPDFDocument = dynamic(
  () => import('@/components/payslip-pdf-document').then((mod) => mod.PayslipPDFDocument),
  { ssr: false }
);

// ─────────────────────────────────────────────
// TYPE (mirrors the DB query result)
// ─────────────────────────────────────────────

type PayslipWithRelations = {
  id: string;
  status: string;
  plannedDays: string | null;
  plannedHours: string | null;
  workedDays: string | null;
  workedHours: string | null;
  overtimeHours: string | null;
  lopDays: string | null;
  basicTotal: string | null;
  allowancesTotal: string | null;
  grossTotal: string | null;
  deductionsTotal: string | null;
  netTotal: string | null;
  employee: {
    id: string;
    employeeCode: string;
    firstName: string;
    lastName: string;
    email: string;
    bankName: string | null;
    bankAccountNumber: string | null;
    bankIfscCode: string | null;
    department: { name: string } | null;
    jobPosition: { title: string } | null;
    branch: { name: string } | null;
  };
  contract: {
    name: string;
    wage: string;
    startDate: string;
    salaryStructure: { name: string } | null;
  } | null;
  payrun: {
    id: string;
    name: string;
    periodStart: string;
    periodEnd: string;
    status: string;
  };
  lines: Array<{
    id: string;
    sequence: number;
    code: string;
    name: string;
    category: string;
    amount: string;
    calculationTrace: { skipped: boolean; formula: string };
  }>;
};

interface PayslipViewerClientProps {
  payslip: PayslipWithRelations;
}

const CATEGORY_LABEL: Record<string, string> = {
  BASIC: 'Basic',
  ALW: 'Allowance',
  GROSS: 'Gross',
  DED: 'Deduction',
  NET: 'Net',
  OTHER: 'Other',
};

const CATEGORY_COLORS: Record<string, string> = {
  BASIC: 'text-blue-400',
  ALW: 'text-purple-400',
  GROSS: 'text-emerald-400',
  DED: 'text-red-400',
  NET: 'text-yellow-400',
};

export function PayslipViewerClient({ payslip }: PayslipViewerClientProps) {
  const emp = payslip.employee;
  const payrun = payslip.payrun;

  const earnings = payslip.lines.filter((l) => ['BASIC', 'ALW'].includes(l.category) && !l.calculationTrace.skipped);
  const grossLine = payslip.lines.find((l) => l.category === 'GROSS' && !l.calculationTrace.skipped);
  const deductions = payslip.lines.filter((l) => l.category === 'DED' && !l.calculationTrace.skipped);
  const netLine = payslip.lines.find((l) => l.category === 'NET' && !l.calculationTrace.skipped);

  // Build PDF data
  const pdfData = {
    payrun: {
      name: payrun.name,
      periodStart: payrun.periodStart,
      periodEnd: payrun.periodEnd,
      status: payrun.status,
    },
    employee: {
      employeeCode: emp.employeeCode,
      firstName: emp.firstName,
      lastName: emp.lastName,
      email: emp.email,
      bankName: emp.bankName,
      bankAccountNumber: emp.bankAccountNumber,
      bankIfscCode: emp.bankIfscCode,
      department: emp.department,
      jobPosition: emp.jobPosition,
      branch: emp.branch,
    },
    contract: payslip.contract ? {
      name: payslip.contract.name,
      wage: payslip.contract.wage,
      salaryStructure: payslip.contract.salaryStructure,
    } : null,
    metrics: {
      plannedDays: payslip.plannedDays ?? '0',
      workedDays: payslip.workedDays ?? '0',
      lopDays: payslip.lopDays ?? '0',
      overtimeHours: payslip.overtimeHours ?? '0',
    },
    lines: payslip.lines,
    totals: {
      gross: payslip.grossTotal ?? '0',
      deductions: payslip.deductionsTotal ?? '0',
      net: payslip.netTotal ?? '0',
    },
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <Link href={`/payruns/${payrun.id}`} className="inline-flex items-center gap-1.5 text-sm text-[#6b7280] hover:text-white transition-colors mb-3">
            <ArrowLeft className="w-4 h-4" />
            Back to {payrun.name}
          </Link>
          <h1 className="text-2xl font-bold text-white">Payslip</h1>
          <p className="text-[#6b7280] text-sm mt-0.5">
            {emp.firstName} {emp.lastName} · {formatDate(payrun.periodStart)} – {formatDate(payrun.periodEnd)}
          </p>
        </div>

        {/* Zero-Storage PDF Download */}
        {PayslipPDFDocument && (
          <PDFDownloadLink
            document={<PayslipPDFDocument data={pdfData} />}
            fileName={`payslip-${emp.employeeCode}-${payrun.periodStart}.pdf`}
          >
            {({ loading }) => (
              <button className="btn-primary" disabled={loading}>
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Generating PDF...</> : <><Download className="w-4 h-4" />Download PDF</>}
              </button>
            )}
          </PDFDownloadLink>
        )}
      </div>

      {/* Employee Info Card */}
      <div className="section-card p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-xl bg-[#3b6ef0]/20 flex items-center justify-center text-[#3b6ef0] text-lg font-bold">
                {emp.firstName.charAt(0)}{emp.lastName.charAt(0)}
              </div>
              <div>
                <p className="text-lg font-bold text-white">{emp.firstName} {emp.lastName}</p>
                <p className="text-xs text-[#4b5563]">{emp.employeeCode} · {emp.email}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-[#6b7280]">
              {emp.department && <span>{emp.department.name}</span>}
              {emp.jobPosition && <span>{emp.jobPosition.title}</span>}
              {emp.branch && <span>{emp.branch.name}</span>}
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-[#4b5563] mb-1">Pay Period</p>
            <p className="text-sm font-medium text-white">{formatDate(payrun.periodStart)} – {formatDate(payrun.periodEnd)}</p>
            <p className="text-xs text-[#4b5563] mt-2 mb-1">Pay Run Status</p>
            <span className={cn('status-pill', PAYRUN_STATUS_COLORS[payrun.status])}>
              {snakeToTitle(payrun.status)}
            </span>
          </div>
        </div>
      </div>

      {/* Attendance Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Planned Days', value: parseFloat(payslip.plannedDays ?? '0') },
          { label: 'Worked Days', value: parseFloat(payslip.workedDays ?? '0') },
          { label: 'LOP Days', value: parseFloat(payslip.lopDays ?? '0'), warn: parseFloat(payslip.lopDays ?? '0') > 0 },
          { label: 'Overtime Hours', value: parseFloat(payslip.overtimeHours ?? '0') },
        ].map((m) => (
          <div key={m.label} className="kpi-card">
            <p className="text-xs text-[#4b5563] mb-1">{m.label}</p>
            <p className={cn('text-2xl font-bold', m.warn ? 'text-yellow-400' : 'text-white')}>{m.value}</p>
          </div>
        ))}
      </div>

      {/* Earnings & Deductions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Earnings */}
        <div className="section-card">
          <div className="px-5 py-4 border-b border-[#2a2d3e]">
            <h2 className="text-sm font-semibold text-white">Earnings</h2>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Description</th>
                <th>Code</th>
                <th className="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {earnings.map((line) => (
                <tr key={line.id}>
                  <td className="font-medium text-white">{line.name}</td>
                  <td><span className={cn('text-xs font-mono font-medium', CATEGORY_COLORS[line.category])}>{line.code}</span></td>
                  <td className="text-right font-mono font-semibold text-emerald-400">
                    {formatCurrency(parseFloat(line.amount))}
                  </td>
                </tr>
              ))}
              {grossLine && (
                <tr className="border-t border-[#2a2d3e] bg-[#1e2235]">
                  <td className="font-bold text-white">{grossLine.name}</td>
                  <td><span className="text-xs font-mono font-medium text-emerald-400">{grossLine.code}</span></td>
                  <td className="text-right font-mono font-bold text-emerald-400">
                    {formatCurrency(parseFloat(grossLine.amount))}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Deductions */}
        <div className="section-card">
          <div className="px-5 py-4 border-b border-[#2a2d3e]">
            <h2 className="text-sm font-semibold text-white">Deductions</h2>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Description</th>
                <th>Code</th>
                <th className="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {deductions.length === 0 ? (
                <tr><td colSpan={3} className="text-center text-[#4b5563] py-6">No deductions</td></tr>
              ) : (
                deductions.map((line) => (
                  <tr key={line.id}>
                    <td className="font-medium text-white">{line.name}</td>
                    <td><span className="text-xs font-mono font-medium text-red-400">{line.code}</span></td>
                    <td className="text-right font-mono font-semibold text-red-400">
                      ({formatCurrency(parseFloat(line.amount))})
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Net Pay Summary */}
      <div className="section-card p-6">
        <div className="grid grid-cols-3 gap-4 mb-5">
          <div>
            <p className="text-xs text-[#4b5563] mb-1">Gross Pay</p>
            <p className="text-xl font-bold text-white">{formatCurrency(parseFloat(payslip.grossTotal ?? '0'))}</p>
          </div>
          <div>
            <p className="text-xs text-[#4b5563] mb-1">Total Deductions</p>
            <p className="text-xl font-bold text-red-400">({formatCurrency(parseFloat(payslip.deductionsTotal ?? '0'))})</p>
          </div>
          <div>
            <p className="text-xs text-[#4b5563] mb-1">Net Pay</p>
            <p className="text-3xl font-bold text-emerald-400">{formatCurrency(parseFloat(payslip.netTotal ?? '0'))}</p>
          </div>
        </div>
        {emp.bankAccountNumber && (
          <div className="pt-4 border-t border-[#2a2d3e] flex flex-wrap gap-6 text-sm">
            <div>
              <p className="text-xs text-[#4b5563] mb-0.5">Bank</p>
              <p className="text-white font-medium">{emp.bankName}</p>
            </div>
            <div>
              <p className="text-xs text-[#4b5563] mb-0.5">Account</p>
              <p className="text-white font-mono">{emp.bankAccountNumber}</p>
            </div>
            <div>
              <p className="text-xs text-[#4b5563] mb-0.5">IFSC</p>
              <p className="text-white font-mono">{emp.bankIfscCode}</p>
            </div>
          </div>
        )}
      </div>

      <p className="text-center text-xs text-[#374151]">
        This is a system-generated payslip. All amounts are in Indian Rupees (INR). · PeoplePay360
      </p>
    </div>
  );
}
