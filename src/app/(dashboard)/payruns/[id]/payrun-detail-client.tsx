'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Play, CheckCircle, Receipt, AlertTriangle, Eye, Loader2, Calendar, ShieldCheck, Mail } from 'lucide-react';
import { formatDate, formatCurrency, PAYRUN_STATUS_COLORS, ANOMALY_SEVERITY_COLORS, cn, snakeToTitle } from '@/lib/utils';
import { AnomalyBanner } from '@/components/anomaly-banner';
import { ExplainSalaryModal } from '@/components/explain-salary-modal';

type PayrunWithRelations = {
  id: string;
  name: string;
  status: string;
  periodStart: string;
  periodEnd: string;
  totalEmployees: number | null;
  totalGross: string | null;
  totalDeductions: string | null;
  totalNet: string | null;
  computedAt: Date | null;
  approvedAt: Date | null;
  salaryStructure: { name: string; code: string } | null;
  payslips: Array<{
    id: string;
    employeeId: string;
    netTotal: string | null;
    grossTotal: string | null;
    deductionsTotal: string | null;
    workedDays: string | null;
    lopDays: string | null;
    employee: { id: string; firstName: string; lastName: string; employeeCode: string };
    lines: Array<{
      id: string;
      sequence: number;
      code: string;
      name: string;
      category: string;
      amount: string;
      calculationTrace: Record<string, unknown>;
    }>;
  }>;
  anomalies: Array<{
    id: string;
    severity: 'info' | 'warning' | 'critical';
    anomalyType: string;
    message: string;
    details?: Record<string, unknown>;
    isResolved: boolean;
    employee?: { firstName: string; lastName: string; employeeCode: string } | null;
  }>;
};

const STATUS_FLOW = ['draft', 'computed', 'validated', 'approved', 'paid'];

interface PayrunDetailClientProps {
  payrun: PayrunWithRelations;
  userRole: string;
}

export function PayrunDetailClient({ payrun, userRole }: PayrunDetailClientProps) {
  const [computing, setComputing] = useState(false);
  const [validating, setValidating] = useState(false);
  const [approving, setApproving] = useState(false);
  const [markingPaid, setMarkingPaid] = useState(false);
  const [sendingPayslips, setSendingPayslips] = useState(false);
  const [currentPayrun, setCurrentPayrun] = useState(payrun);
  const [explainModal, setExplainModal] = useState<{ open: boolean; employeeName: string; lines: typeof payrun.payslips[0]['lines'] }>({
    open: false,
    employeeName: '',
    lines: [],
  });

  const canCompute = ['admin', 'hr_payroll_manager', 'hr_payroll_user'].includes(userRole);
  const canApprove = ['admin', 'hr_payroll_manager'].includes(userRole);

  const statusIndex = STATUS_FLOW.indexOf(currentPayrun.status);

  async function handleCompute() {
    setComputing(true);
    try {
      const res = await fetch(`/api/payruns/${currentPayrun.id}/compute`, { method: 'POST' });
      const json = await res.json();
      if (res.ok) {
        window.location.reload();
      } else {
        alert(json.error ?? 'Compute failed');
      }
    } finally {
      setComputing(false);
    }
  }

  async function handleValidate() {
    setValidating(true);
    try {
      const res = await fetch(`/api/payruns/${currentPayrun.id}/validate`, { method: 'POST' });
      const json = await res.json();
      if (res.ok) {
        window.location.reload();
      } else {
        alert(json.error ?? 'Validation failed');
      }
    } finally {
      setValidating(false);
    }
  }

  async function handleApprove() {
    setApproving(true);
    try {
      const res = await fetch(`/api/payruns/${currentPayrun.id}/approve`, { method: 'POST' });
      const json = await res.json();
      if (res.ok) {
        window.location.reload();
      } else {
        alert(json.error ?? 'Approval failed');
      }
    } finally {
      setApproving(false);
    }
  }

  async function handleMarkPaid() {
    if (!confirm('Mark this payrun as PAID? This will lock the payrun and all payslips permanently.')) return;
    setMarkingPaid(true);
    try {
      const res = await fetch(`/api/payruns/${currentPayrun.id}/mark-paid`, { method: 'POST' });
      const json = await res.json();
      if (res.ok) {
        window.location.reload();
      } else {
        alert(json.error ?? 'Mark paid failed');
      }
    } finally {
      setMarkingPaid(false);
    }
  }

  async function handleSendPayslips() {
    if (!confirm('Send payslips via email to all employees in this payrun?')) return;
    setSendingPayslips(true);
    try {
      const res = await fetch(`/api/payruns/${currentPayrun.id}/send-payslips`, { method: 'POST' });
      const json = await res.json();
      if (res.ok) {
        alert(json.message);
      } else {
        alert(json.error ?? 'Failed to send payslips');
      }
    } finally {
      setSendingPayslips(false);
    }
  }

  async function handleRetryFailedPayslips() {
    if (!confirm('Retry sending payslips for failed recipients only?')) return;
    setSendingPayslips(true);
    try {
      const res = await fetch(`/api/payruns/${currentPayrun.id}/send-payslips?retry_failed_only=true`, { method: 'POST' });
      const json = await res.json();
      if (res.ok) {
        alert(json.message);
      } else {
        alert(json.error ?? 'Failed to retry payslips');
      }
    } finally {
      setSendingPayslips(false);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back */}
      <Link href="/payruns" className="inline-flex items-center gap-1.5 text-sm text-[#6b7280] hover:text-white transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to Pay Runs
      </Link>

      {/* Header */}
      <div className="section-card p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white tracking-tight">{currentPayrun.name}</h1>
            </div>
            <p className="text-[#6b7280] text-sm mt-1">
              Period: {formatDate(currentPayrun.periodStart)} – {formatDate(currentPayrun.periodEnd)} &middot; Structure:{' '}
              {currentPayrun.salaryStructure?.name}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={`/attendance`}
              className="btn-secondary text-xs flex items-center gap-1.5 py-2 px-3"
            >
              <Calendar className="w-3.5 h-3.5 text-[#3b6ef0]" />
              View Attendance
            </Link>
            <span className={cn('status-pill text-sm', PAYRUN_STATUS_COLORS[currentPayrun.status])}>
              {snakeToTitle(currentPayrun.status)}
            </span>
            {currentPayrun.status === 'draft' && canCompute && (
              <button onClick={handleCompute} disabled={computing} className="btn-primary">
                {computing ? <><Loader2 className="w-4 h-4 animate-spin" />Computing...</> : <><Play className="w-4 h-4" />Compute Payroll</>}
              </button>
            )}
            {currentPayrun.status === 'computed' && canCompute && (
              <button onClick={handleValidate} disabled={validating} className="btn-primary bg-indigo-600 hover:bg-indigo-500">
                {validating ? <><Loader2 className="w-4 h-4 animate-spin" />Validating...</> : <><ShieldCheck className="w-4 h-4" />Validate Payrun</>}
              </button>
            )}
            {['computed', 'validated'].includes(currentPayrun.status) && canApprove && (
              <button onClick={handleApprove} disabled={approving} className="btn-primary">
                {approving ? <><Loader2 className="w-4 h-4 animate-spin" />Approving...</> : <><CheckCircle className="w-4 h-4" />Approve</>}
              </button>
            )}
            {['validated', 'approved'].includes(currentPayrun.status) && canApprove && (
              <button onClick={handleMarkPaid} disabled={markingPaid} className="btn-primary bg-emerald-600 hover:bg-emerald-500">
                {markingPaid ? <><Loader2 className="w-4 h-4 animate-spin" />Marking Paid...</> : <><CheckCircle className="w-4 h-4" />Mark as Paid</>}
              </button>
            )}
            {['validated', 'approved', 'paid'].includes(currentPayrun.status) && canCompute && (
              <>
                <button onClick={handleSendPayslips} disabled={sendingPayslips} className="btn-secondary inline-flex items-center gap-1.5 text-blue-400 hover:text-blue-300">
                  {sendingPayslips ? <><Loader2 className="w-4 h-4 animate-spin" />Sending...</> : <><Mail className="w-4 h-4" />Send Payslips</>}
                </button>
                <button onClick={handleRetryFailedPayslips} disabled={sendingPayslips} className="btn-secondary inline-flex items-center gap-1.5 text-amber-400 hover:text-amber-300" title="Retry only failed or skipped recipient emails">
                  <Mail className="w-3.5 h-3.5" />
                  Retry Failed
                </button>
              </>
            )}
          </div>
        </div>

        {/* Status Progress */}
        <div className="flex items-center gap-1 mt-5">
          {STATUS_FLOW.map((s, i) => (
            <div key={s} className="flex items-center gap-1 flex-1">
              <div className={cn(
                'flex-1 h-1.5 rounded-full transition-colors',
                i <= statusIndex ? 'bg-[#3b6ef0]' : 'bg-[#2a2d3e]'
              )} />
              {i === STATUS_FLOW.length - 1 && (
                <div className={cn(
                  'w-3 h-3 rounded-full border-2 transition-colors',
                  statusIndex >= i ? 'border-[#3b6ef0] bg-[#3b6ef0]' : 'border-[#2a2d3e]'
                )} />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-1">
          {STATUS_FLOW.map((s, i) => (
            <span key={s} className={cn('text-[10px]', i <= statusIndex ? 'text-[#3b6ef0]' : 'text-[#374151]')}>
              {snakeToTitle(s)}
            </span>
          ))}
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5">
          {[
            { label: 'Employees', value: currentPayrun.totalEmployees ?? 0 },
            { label: 'Gross', value: formatCurrency(parseFloat(currentPayrun.totalGross?.toString() ?? '0')) },
            { label: 'Deductions', value: formatCurrency(parseFloat(currentPayrun.totalDeductions?.toString() ?? '0')) },
            { label: 'Net Pay', value: formatCurrency(parseFloat(currentPayrun.totalNet?.toString() ?? '0')), highlight: true },
          ].map((kpi) => (
            <div key={kpi.label} className="bg-[#111318] rounded-xl p-4 border border-[#2a2d3e]">
              <p className="text-xs text-[#4b5563] mb-1">{kpi.label}</p>
              <p className={cn('text-lg font-bold', kpi.highlight ? 'text-emerald-400' : 'text-white')}>{kpi.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Anomalies */}
      {currentPayrun.anomalies.length > 0 && (
        <AnomalyBanner anomalies={currentPayrun.anomalies as Parameters<typeof AnomalyBanner>[0]['anomalies']} />
      )}

      {/* Payslips Table */}
      <div className="section-card">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-[#2a2d3e]">
          <Receipt className="w-4 h-4 text-[#3b6ef0]" />
          <h2 className="text-sm font-semibold text-white">Payslips ({currentPayrun.payslips.length})</h2>
        </div>
        {currentPayrun.payslips.length === 0 ? (
          <div className="py-12 text-center text-[#4b5563] text-sm">
            No payslips yet. Compute the payroll to generate payslips.
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Worked Days</th>
                <th>LOP Days</th>
                <th>Gross</th>
                <th>Deductions</th>
                <th>Net Pay</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentPayrun.payslips.map((ps) => (
                <tr key={ps.id}>
                  <td>
                    <p className="font-medium text-white">{ps.employee.firstName} {ps.employee.lastName}</p>
                    <p className="text-xs text-[#4b5563]">{ps.employee.employeeCode}</p>
                  </td>
                  <td>
                    <Link
                      href={`/attendance?employee_id=${ps.employeeId}`}
                      className="text-white hover:text-blue-400 underline decoration-dotted underline-offset-2 transition-colors"
                      title="View daily attendance records for this employee"
                    >
                      {parseFloat(ps.workedDays?.toString() ?? '0')} days
                    </Link>
                  </td>
                  <td>
                    <span className={cn(parseFloat(ps.lopDays?.toString() ?? '0') > 0 ? 'text-yellow-400 font-medium' : '')}>
                      {parseFloat(ps.lopDays?.toString() ?? '0')}
                    </span>
                  </td>
                  <td className="font-mono">{formatCurrency(parseFloat(ps.grossTotal?.toString() ?? '0'))}</td>
                  <td className="font-mono text-red-400">{formatCurrency(parseFloat(ps.deductionsTotal?.toString() ?? '0'))}</td>
                  <td className="font-mono font-bold text-emerald-400">{formatCurrency(parseFloat(ps.netTotal?.toString() ?? '0'))}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setExplainModal({ open: true, employeeName: `${ps.employee.firstName} ${ps.employee.lastName}`, lines: ps.lines })}
                        className="inline-flex items-center gap-1 text-xs text-[#6b7280] hover:text-white transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Explain
                      </button>
                      <Link
                        href={`/payslips/${ps.id}`}
                        className="inline-flex items-center gap-1 text-xs text-[#3b6ef0] hover:text-blue-300"
                      >
                        <Receipt className="w-3.5 h-3.5" />
                        View
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Explain Salary Modal */}
      <ExplainSalaryModal
        isOpen={explainModal.open}
        onClose={() => setExplainModal({ open: false, employeeName: '', lines: [] })}
        employeeName={explainModal.employeeName}
        lines={explainModal.lines as unknown as Parameters<typeof ExplainSalaryModal>[0]['lines']}
      />
    </div>
  );
}
