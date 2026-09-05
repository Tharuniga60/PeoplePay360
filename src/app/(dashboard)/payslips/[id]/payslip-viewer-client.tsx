'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Download, Loader2, RotateCcw, Mail, CheckCircle2, AlertCircle, X, Send } from 'lucide-react';
import { formatDate, formatCurrency, PAYRUN_STATUS_COLORS, cn, snakeToTitle } from '@/lib/utils';

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
  const [recomputing, setRecomputing] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState(payslip.employee?.email || '');
  const [emailStatusMessage, setEmailStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const emp = payslip.employee;
  const payrun = payslip.payrun;

  const earnings = payslip.lines.filter((l) => ['BASIC', 'ALW'].includes(l.category) && !l.calculationTrace.skipped);
  const grossLine = payslip.lines.find((l) => l.category === 'GROSS' && !l.calculationTrace.skipped);
  const deductions = payslip.lines.filter((l) => l.category === 'DED' && !l.calculationTrace.skipped);
  const netLine = payslip.lines.find((l) => l.category === 'NET' && !l.calculationTrace.skipped);

  async function handleRecompute() {
    if (!confirm('Recompute salary rules and update deductions/gross for this payslip?')) return;
    setRecomputing(true);
    try {
      const res = await fetch(`/api/payslips/${payslip.id}/recompute`, { method: 'POST' });
      const json = await res.json();
      if (res.ok) {
        window.location.reload();
      } else {
        alert(json.error || 'Recompute failed');
      }
    } catch {
      alert('Network error while recomputing');
    } finally {
      setRecomputing(false);
    }
  }

  function handleOpenEmailModal() {
    setEmailModalOpen(true);
    setEmailStatusMessage(null);
    if (!recipientEmail && emp.email) {
      setRecipientEmail(emp.email);
    }
  }

  async function handleSendEmailSubmit() {
    if (!recipientEmail || !recipientEmail.includes('@')) {
      setEmailStatusMessage({ type: 'error', text: 'Please enter a valid recipient email address.' });
      return;
    }
    setSendingEmail(true);
    setEmailStatusMessage(null);
    try {
      const res = await fetch(`/api/payslips/${payslip.id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientEmail: recipientEmail.trim() }),
      });
      const json = await res.json();
      if (res.ok) {
        setEmailStatusMessage({ type: 'success', text: json.message });
      } else {
        setEmailStatusMessage({ type: 'error', text: json.error || 'Failed to send payslip email' });
      }
    } catch {
      setEmailStatusMessage({ type: 'error', text: 'Network error connecting to email service.' });
    } finally {
      setSendingEmail(false);
    }
  }

  function handlePrint() {
    window.print();
  }

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
    <div className="space-y-6 animate-fade-in print:bg-white print:text-black">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 print:hidden">
        <div>
          <Link href={`/payruns/${payrun.id}`} className="inline-flex items-center gap-1.5 text-sm text-[#6b7280] hover:text-white transition-colors mb-3">
            <ArrowLeft className="w-4 h-4" />
            Back to {payrun.name}
          </Link>
          <h1 className="text-2xl font-bold text-white">Payslip</h1>
          <p className="text-sm text-[#6b7280]">
            {emp.firstName} {emp.lastName} &middot; {emp.employeeCode}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {payslip.status !== 'paid' && (
            <button
              onClick={handleRecompute}
              disabled={recomputing}
              className="btn-secondary inline-flex items-center gap-1.5 text-blue-400 hover:text-blue-300 text-xs"
            >
              {recomputing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
              Recompute
            </button>
          )}

          <button
            onClick={handleOpenEmailModal}
            disabled={sendingEmail}
            className="btn-secondary inline-flex items-center gap-1.5 text-purple-400 hover:text-purple-300 text-xs"
          >
            {sendingEmail ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
            Email Payslip
          </button>

          <button
            onClick={handlePrint}
            className="btn-primary text-xs inline-flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            Download Payslip
          </button>
        </div>
      </div>

      {/* Interactive Email Payslip Modal */}
      {emailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in print:hidden">
          <div className="bg-[#1a1d27] border border-[#2a2d3e] rounded-xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#2a2d3e]">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-purple-400" />
                <h3 className="text-base font-bold text-white">Email Salary Statement</h3>
              </div>
              <button
                onClick={() => setEmailModalOpen(false)}
                className="text-[#6b7280] hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#9ca3af] mb-1.5">
                Recipient Email Address
              </label>
              <input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="employee@example.com"
                className="w-full bg-[#111319] border border-[#2a2d3e] rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors"
              />
              <p className="text-[11px] text-[#6b7280] mt-1.5">
                Defaulted to employee profile. You can enter your personal email here to test receiving the payslip.
              </p>
            </div>

            <div className="p-3 bg-[#111319] border border-[#2a2d3e] rounded-lg text-xs space-y-1.5">
              <div className="flex justify-between text-[#9ca3af]">
                <span>Employee:</span>
                <span className="text-white font-medium">{emp.firstName} {emp.lastName} ({emp.employeeCode})</span>
              </div>
              <div className="flex justify-between text-[#9ca3af]">
                <span>Period:</span>
                <span className="text-white font-medium">{payrun.name}</span>
              </div>
              <div className="flex justify-between text-[#9ca3af]">
                <span>Gross Salary:</span>
                <span className="text-white font-mono font-medium">{formatCurrency(parseFloat(payslip.grossTotal ?? '0'))}</span>
              </div>
              <div className="flex justify-between text-[#9ca3af]">
                <span>Total Deductions:</span>
                <span className="text-red-400 font-mono font-medium">({formatCurrency(parseFloat(payslip.deductionsTotal ?? '0'))})</span>
              </div>
              <div className="flex justify-between text-[#9ca3af] pt-1 border-t border-[#2a2d3e]">
                <span className="font-semibold text-white">Net Take-Home:</span>
                <span className="text-emerald-400 font-mono font-bold text-sm">{formatCurrency(parseFloat(payslip.netTotal ?? '0'))}</span>
              </div>
            </div>

            {emailStatusMessage && (
              <div
                className={cn(
                  'p-3 rounded-lg text-xs flex items-start gap-2',
                  emailStatusMessage.type === 'success'
                    ? 'bg-emerald-500/10 border border-emerald-800/40 text-emerald-300'
                    : 'bg-red-500/10 border border-red-800/40 text-red-300'
                )}
              >
                {emailStatusMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400 mt-0.5" />
                )}
                <div className="leading-relaxed break-words">{emailStatusMessage.text}</div>
              </div>
            )}

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setEmailModalOpen(false)}
                className="btn-secondary text-xs px-3.5 py-2"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleSendEmailSubmit}
                disabled={sendingEmail}
                className="btn-primary text-xs px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white flex items-center gap-1.5"
              >
                {sendingEmail ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Sending via Brevo...
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    Send Payslip Now
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Screen View (Hidden when printing / downloading PDF) */}
      <div className="space-y-6 print:hidden">
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

      {/* ─────────────────────────────────────────────────────────────
          PRINTABLE DOCUMENT (Hidden on screen, full view on print/PDF)
          ───────────────────────────────────────────────────────────── */}
      <div className="hidden print:block w-full max-w-4xl mx-auto bg-white text-gray-900 font-sans p-6 text-xs">
        {/* Company Header */}
        <div className="border-b-2 border-[#3b6ef0] pb-4 mb-5 flex justify-between items-start">
          <div>
            <h1 className="text-xl font-black tracking-tight text-gray-900">PEOPLEPAY360</h1>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Human Resources &amp; Payroll Management</p>
            <p className="text-xs text-gray-600 mt-1">Acme Corporation HQ · Bengaluru, Karnataka</p>
          </div>
          <div className="text-right">
            <h2 className="text-lg font-bold text-[#3b6ef0] uppercase tracking-wide">Salary Statement</h2>
            <p className="text-xs font-semibold text-gray-800 mt-0.5">{payrun.name}</p>
            <p className="text-[11px] text-gray-500">Period: {formatDate(payrun.periodStart)} – {formatDate(payrun.periodEnd)}</p>
            <p className="text-[11px] text-gray-500 font-mono">Status: {snakeToTitle(payrun.status)}</p>
          </div>
        </div>

        {/* Employee & Employment Details (Boxed Grid) */}
        <div className="border border-gray-300 rounded-lg p-3.5 mb-5 bg-gray-50/50">
          <div className="grid grid-cols-4 gap-y-2.5 gap-x-4">
            <div>
              <span className="text-[10px] text-gray-500 block uppercase font-medium">Employee Name</span>
              <span className="font-bold text-gray-900 text-sm">{emp.firstName} {emp.lastName}</span>
            </div>
            <div>
              <span className="text-[10px] text-gray-500 block uppercase font-medium">Employee Code</span>
              <span className="font-mono font-bold text-gray-900">{emp.employeeCode}</span>
            </div>
            <div>
              <span className="text-[10px] text-gray-500 block uppercase font-medium">Department</span>
              <span className="font-medium text-gray-800">{emp.department?.name || '—'}</span>
            </div>
            <div>
              <span className="text-[10px] text-gray-500 block uppercase font-medium">Designation</span>
              <span className="font-medium text-gray-800">{emp.jobPosition?.title || '—'}</span>
            </div>

            <div>
              <span className="text-[10px] text-gray-500 block uppercase font-medium">Work Email</span>
              <span className="text-gray-700">{emp.email}</span>
            </div>
            <div>
              <span className="text-[10px] text-gray-500 block uppercase font-medium">Branch</span>
              <span className="text-gray-700">{emp.branch?.name || 'Main Branch'}</span>
            </div>
            <div>
              <span className="text-[10px] text-gray-500 block uppercase font-medium">Salary Structure</span>
              <span className="text-gray-700">{payslip.contract?.salaryStructure?.name || 'Standard Monthly'}</span>
            </div>
            <div>
              <span className="text-[10px] text-gray-500 block uppercase font-medium">Payment Mode</span>
              <span className="text-gray-700">Bank Transfer</span>
            </div>

            {/* Bank Details Row */}
            <div>
              <span className="text-[10px] text-gray-500 block uppercase font-medium">Bank Name</span>
              <span className="font-medium text-gray-800">{emp.bankName || 'HDFC Bank'}</span>
            </div>
            <div>
              <span className="text-[10px] text-gray-500 block uppercase font-medium">Bank Account No.</span>
              <span className="font-mono font-medium text-gray-800">{emp.bankAccountNumber || '—'}</span>
            </div>
            <div>
              <span className="text-[10px] text-gray-500 block uppercase font-medium">IFSC Code</span>
              <span className="font-mono font-medium text-gray-800">{emp.bankIfscCode || '—'}</span>
            </div>
            <div>
              <span className="text-[10px] text-gray-500 block uppercase font-medium">Pay Date</span>
              <span className="font-medium text-gray-800">{formatDate(payrun.periodEnd)}</span>
            </div>
          </div>
        </div>

        {/* Attendance Summary */}
        <div className="grid grid-cols-4 gap-3 mb-5">
          <div className="border border-gray-200 rounded p-2 text-center bg-gray-50">
            <span className="text-[10px] text-gray-500 block uppercase">Planned Days</span>
            <span className="text-base font-bold text-gray-900">{parseFloat(payslip.plannedDays ?? '0')}</span>
          </div>
          <div className="border border-gray-200 rounded p-2 text-center bg-gray-50">
            <span className="text-[10px] text-gray-500 block uppercase">Worked Days</span>
            <span className="text-base font-bold text-gray-900">{parseFloat(payslip.workedDays ?? '0')}</span>
          </div>
          <div className="border border-gray-200 rounded p-2 text-center bg-gray-50">
            <span className="text-[10px] text-gray-500 block uppercase">Loss of Pay (LOP)</span>
            <span className="text-base font-bold text-gray-900">{parseFloat(payslip.lopDays ?? '0')}</span>
          </div>
          <div className="border border-gray-200 rounded p-2 text-center bg-gray-50">
            <span className="text-[10px] text-gray-500 block uppercase">Overtime Hours</span>
            <span className="text-base font-bold text-gray-900">{parseFloat(payslip.overtimeHours ?? '0')} hrs</span>
          </div>
        </div>

        {/* Side-by-Side Earnings & Deductions Tables */}
        <div className="grid grid-cols-2 gap-4 mb-5">
          {/* Earnings */}
          <div className="border border-gray-300 rounded-lg overflow-hidden">
            <div className="bg-gray-100 px-3 py-2 border-b border-gray-300 flex justify-between items-center">
              <h3 className="font-bold text-gray-900 text-xs uppercase tracking-wider">Earnings</h3>
              <span className="text-[10px] text-gray-500 font-semibold">Amount (₹)</span>
            </div>
            <table className="w-full text-xs">
              <tbody>
                {earnings.map((line) => (
                  <tr key={line.id} className="border-b border-gray-200">
                    <td className="px-3 py-1.5 font-medium text-gray-800">
                      {line.name} <span className="text-[10px] text-gray-500 font-mono">({line.code})</span>
                    </td>
                    <td className="px-3 py-1.5 text-right font-mono font-semibold text-gray-900">
                      {formatCurrency(parseFloat(line.amount))}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-emerald-50 border-t-2 border-emerald-500 font-bold">
                  <td className="px-3 py-2 text-emerald-900">Gross Salary</td>
                  <td className="px-3 py-2 text-right font-mono text-emerald-900 text-sm">
                    {formatCurrency(parseFloat(payslip.grossTotal ?? '0'))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Deductions */}
          <div className="border border-gray-300 rounded-lg overflow-hidden">
            <div className="bg-gray-100 px-3 py-2 border-b border-gray-300 flex justify-between items-center">
              <h3 className="font-bold text-gray-900 text-xs uppercase tracking-wider">Deductions</h3>
              <span className="text-[10px] text-gray-500 font-semibold">Amount (₹)</span>
            </div>
            <table className="w-full text-xs">
              <tbody>
                {deductions.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="px-3 py-4 text-center text-gray-400 italic">No deductions</td>
                  </tr>
                ) : (
                  deductions.map((line) => (
                    <tr key={line.id} className="border-b border-gray-200">
                      <td className="px-3 py-1.5 font-medium text-gray-800">
                        {line.name} <span className="text-[10px] text-gray-500 font-mono">({line.code})</span>
                      </td>
                      <td className="px-3 py-1.5 text-right font-mono font-semibold text-red-700">
                        ({formatCurrency(parseFloat(line.amount))})
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr className="bg-red-50 border-t-2 border-red-500 font-bold">
                  <td className="px-3 py-2 text-red-900">Total Deductions</td>
                  <td className="px-3 py-2 text-right font-mono text-red-900 text-sm">
                    ({formatCurrency(parseFloat(payslip.deductionsTotal ?? '0'))})
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Net Take-Home Pay Box */}
        <div className="border-2 border-[#3b6ef0] rounded-lg p-4 mb-6 bg-blue-50/40 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-[#3b6ef0] uppercase tracking-wider block">Net Salary Payable</span>
            <span className="text-[11px] text-gray-600">Gross Earnings minus Total Deductions</span>
          </div>
          <div className="text-right">
            <span className="text-2xl font-black text-gray-900 font-mono">
              {formatCurrency(parseFloat(payslip.netTotal ?? '0'))}
            </span>
          </div>
        </div>

        {/* Signatures & Declarations */}
        <div className="pt-8 mt-6 border-t border-gray-300 grid grid-cols-2 gap-8 text-xs">
          <div className="text-left">
            <div className="w-48 border-b border-gray-400 mb-1" />
            <span className="text-[11px] font-semibold text-gray-700 uppercase">Employee Signature</span>
            <p className="text-[10px] text-gray-400">Acknowledged receipt of salary</p>
          </div>
          <div className="text-right flex flex-col items-end">
            <div className="w-48 border-b border-gray-400 mb-1" />
            <span className="text-[11px] font-semibold text-gray-700 uppercase">Authorized Signatory</span>
            <p className="text-[10px] text-gray-400">For PeoplePay360 Operations</p>
          </div>
        </div>

        <p className="text-center text-[10px] text-gray-400 mt-6 pt-3 border-t border-gray-100">
          This is a computer-generated document and requires no physical signature. All amounts are in Indian National Rupees (INR).
        </p>
      </div>

      <p className="text-center text-xs text-[#374151]">
        This is a system-generated payslip. All amounts are in Indian Rupees (INR). · PeoplePay360
      </p>
    </div>
  );
}
