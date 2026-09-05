'use client';

import { useState } from 'react';
import { AlertTriangle, Loader2, ChevronRight, Calendar, Info, Zap, Check, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SalaryStructure {
  id: string;
  name: string;
  code: string;
}

interface WizardStep1Props {
  salaryStructures: SalaryStructure[];
  onNext: (data: {
    periodStart: string;
    periodEnd: string;
    salaryStructureId: string;
    candidates: CandidateResult[];
  }) => void;
  companyId: string;
}

interface CandidateWarning {
  code: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
}

export interface CandidateResult {
  employeeId: string;
  employeeCode: string;
  fullName: string;
  contractId: string;
  wage: number;
  attendanceDays?: number;
  warnings: CandidateWarning[];
  isReady: boolean;
}

const SEVERITY_CONFIG = {
  critical: { color: 'text-red-400', bg: 'bg-red-500/10 border-red-800/40', icon: AlertTriangle },
  warning: { color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-800/40', icon: AlertTriangle },
  info: { color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-800/40', icon: Info },
};

export function PayrunWizardStep1({ salaryStructures, onNext, companyId }: WizardStep1Props) {
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [salaryStructureId, setSalaryStructureId] = useState('');
  const [autoSyncAttendance, setAutoSyncAttendance] = useState(true);
  const [loading, setLoading] = useState(false);
  const [syncingAttendance, setSyncingAttendance] = useState(false);
  const [syncSuccessMessage, setSyncSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [candidates, setCandidates] = useState<CandidateResult[] | null>(null);

  async function handleCheck(shouldSync?: boolean) {
    if (!periodStart || !periodEnd || !salaryStructureId) {
      setError('Please fill in all period and structure fields.');
      return;
    }
    setError('');
    setLoading(true);
    setCandidates(null);
    setSyncSuccessMessage(null);

    try {
      const res = await fetch('/api/payruns/wizard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          periodStart,
          periodEnd,
          salaryStructureId,
          companyId,
          autoSyncAttendance: shouldSync ?? autoSyncAttendance,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Eligibility check failed');
      setCandidates(json.data.candidates);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  async function handleDirectSync() {
    if (!periodStart || !periodEnd) {
      setError('Please specify Period Start and Period End first.');
      return;
    }
    setError('');
    setSyncingAttendance(true);
    setSyncSuccessMessage(null);

    try {
      const res = await fetch('/api/attendance/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate: periodStart, endDate: periodEnd }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Attendance sync failed');
      setSyncSuccessMessage(json.message ?? 'Attendance synchronized successfully.');
      // Auto re-check eligibility with freshly synced data without duplicate sync
      await handleCheck(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown sync error');
    } finally {
      setSyncingAttendance(false);
    }
  }

  const readyCount = candidates?.filter((c) => c.isReady).length ?? 0;
  const warningCount = candidates?.filter((c) => c.warnings.length > 0).length ?? 0;
  const hasNoAttendanceWarning = candidates?.some((c) =>
    c.warnings.some((w) => w.code === 'NO_ATTENDANCE')
  );

  return (
    <div className="space-y-6">
      {/* Form */}
      <div className="section-card p-6">
        <h2 className="text-sm font-semibold text-white mb-5 pb-3 border-b border-[#2a2d3e]">
          Step 1 — Payroll Scope & Period
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div>
            <label className="block text-xs font-medium text-[#e2e8f0] mb-1.5">Period Start</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4b5563]" />
              <input
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                className="form-input pl-10"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#e2e8f0] mb-1.5">Period End</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4b5563]" />
              <input
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                className="form-input pl-10"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#e2e8f0] mb-1.5">Salary Structure</label>
            <select
              value={salaryStructureId}
              onChange={(e) => setSalaryStructureId(e.target.value)}
              className="form-input"
            >
              <option value="">Select structure...</option>
              {salaryStructures.map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
              ))}
            </select>
          </div>
        </div>

        {/* Attendance Integration Options */}
        <div className="mt-5 pt-4 border-t border-[#2a2d3e] flex items-center justify-between flex-wrap gap-3">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoSyncAttendance}
              onChange={(e) => setAutoSyncAttendance(e.target.checked)}
              className="rounded border-[#2a2d3e] bg-[#111318] text-[#3b6ef0] focus:ring-0 focus:ring-offset-0 w-4 h-4"
            />
            <span className="text-xs text-[#cbd5e1]">
              Auto-connect &amp; sync schedule attendance for period if records are missing
            </span>
          </label>

          <button
            type="button"
            onClick={handleDirectSync}
            disabled={syncingAttendance || !periodStart || !periodEnd}
            className="btn-secondary text-xs py-1.5 px-3 inline-flex items-center gap-1.5"
            title="Pre-populate attendance records according to assigned working schedules"
          >
            {syncingAttendance ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Zap className="w-3.5 h-3.5 text-yellow-400" />
            )}
            Sync Schedule Attendance
          </button>
        </div>

        {syncSuccessMessage && (
          <div className="mt-4 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-800/40 rounded-lg px-4 py-2.5 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{syncSuccessMessage}</span>
          </div>
        )}

        {error && (
          <p className="mt-4 text-sm text-red-400 bg-red-500/10 border border-red-800/40 rounded-lg px-4 py-2.5">
            {error}
          </p>
        )}

        <div className="mt-5 flex justify-end">
          <button onClick={() => handleCheck()} disabled={loading} className="btn-primary">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Checking...</> : 'Check Eligibility'}
          </button>
        </div>
      </div>

      {/* Candidates */}
      {candidates !== null && (
        <div className="section-card animate-fade-in">
          {/* Missing attendance warning banner with one-click fix */}
          {hasNoAttendanceWarning && (
            <div className="mx-5 mt-4 p-3 bg-yellow-500/10 border border-yellow-800/40 rounded-lg flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                <span className="text-xs text-yellow-300">
                  Some employees do not have attendance logged for this date range.
                </span>
              </div>
              <button
                type="button"
                onClick={handleDirectSync}
                disabled={syncingAttendance}
                className="btn-primary text-xs py-1 px-2.5 bg-yellow-600 hover:bg-yellow-500 text-white"
              >
                {syncingAttendance ? 'Syncing...' : '⚡ Generate Schedule Attendance Now'}
              </button>
            </div>
          )}

          <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a2d3e]">
            <div>
              <h2 className="text-sm font-semibold text-white">Eligibility Results</h2>
              <p className="text-xs text-[#4b5563] mt-0.5">
                {readyCount} of {candidates.length} employees ready · {warningCount} with warnings
              </p>
            </div>
            <button
              onClick={() => onNext({ periodStart, periodEnd, salaryStructureId, candidates })}
              disabled={readyCount === 0}
              className="btn-primary"
            >
              Proceed to Selection
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {candidates.length === 0 ? (
            <div className="py-12 text-center text-[#4b5563] text-sm">
              No eligible employees found for this salary structure and period.
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Code</th>
                  <th>Monthly Wage</th>
                  <th>Attendance Coverage</th>
                  <th>Diagnostics &amp; Warnings</th>
                  <th>Readiness</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((c) => (
                  <tr key={c.employeeId}>
                    <td className="font-medium text-white">{c.fullName}</td>
                    <td><span className="font-mono text-xs text-[#4b5563]">{c.employeeCode}</span></td>
                    <td className="font-mono">₹{c.wage.toLocaleString('en-IN')}</td>
                    <td>
                      {c.attendanceDays !== undefined && c.attendanceDays > 0 ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <Check className="w-3 h-3 text-emerald-400" />
                          {c.attendanceDays} days logged
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                          0 days recorded
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="space-y-1">
                        {c.warnings.length === 0 ? (
                          <span className="text-xs text-emerald-400 flex items-center gap-1">
                            <Check className="w-3 h-3" /> All checks passed
                          </span>
                        ) : (
                          c.warnings.map((w, i) => {
                            const cfg = SEVERITY_CONFIG[w.severity];
                            return (
                              <div key={i} className={cn('text-xs px-2 py-1 rounded border flex items-start gap-1.5', cfg.bg)}>
                                <cfg.icon className={cn('w-3 h-3 mt-0.5 flex-shrink-0', cfg.color)} />
                                <span className={cfg.color}>{w.message}</span>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={cn('status-pill', c.isReady
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-800/40'
                        : 'bg-red-500/10 text-red-400 border border-red-800/40')}>
                        {c.isReady ? '✓ Ready' : '✗ Blocked'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
