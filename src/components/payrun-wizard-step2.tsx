'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, CheckSquare, Square, AlertTriangle, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CandidateResult } from './payrun-wizard-step1';

interface PayrunWizardStep2Props {
  periodStart: string;
  periodEnd: string;
  salaryStructureId: string;
  candidates: CandidateResult[];
  companyId: string;
  onBack: () => void;
}

export function PayrunWizardStep2({
  periodStart,
  periodEnd,
  salaryStructureId,
  candidates,
  companyId,
  onBack,
}: PayrunWizardStep2Props) {
  const router = useRouter();
  const readyCandidates = candidates.filter((c) => c.isReady);

  const [selected, setSelected] = useState<Set<string>>(
    new Set(readyCandidates.map((c) => c.employeeId))
  );
  const [payrunName, setPayrunName] = useState(
    `Payroll ${periodStart?.slice(0, 7).replace('-', '/')} – ${periodEnd?.slice(0, 7).replace('-', '/')}`
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function toggleAll() {
    if (selected.size === readyCandidates.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(readyCandidates.map((c) => c.employeeId)));
    }
  }

  function toggleOne(id: string) {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  }

  const totalWage = candidates
    .filter((c) => selected.has(c.employeeId))
    .reduce((s, c) => s + c.wage, 0);

  async function handleCreate() {
    if (selected.size === 0) {
      setError('Select at least one employee.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/payruns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          salaryStructureId,
          name: payrunName,
          periodStart,
          periodEnd,
          employeeIds: Array.from(selected),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to create payrun');
      router.push(`/payruns/${json.data.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Payrun Name */}
      <div className="section-card p-6">
        <h2 className="text-sm font-semibold text-white mb-5 pb-3 border-b border-[#2a2d3e]">
          Step 2 — Select Employees & Confirm
        </h2>
        <div>
          <label className="block text-xs font-medium text-[#e2e8f0] mb-1.5">Payrun Name</label>
          <input
            type="text"
            value={payrunName}
            onChange={(e) => setPayrunName(e.target.value)}
            className="form-input max-w-lg"
          />
        </div>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Selected', value: `${selected.size} employees`, color: 'text-blue-400' },
          { label: 'Estimated Gross', value: `₹${totalWage.toLocaleString('en-IN')}`, color: 'text-emerald-400' },
          { label: 'Period', value: `${periodStart} – ${periodEnd}`, color: 'text-white' },
        ].map((s) => (
          <div key={s.label} className="kpi-card">
            <p className="text-xs text-[#4b5563] mb-1">{s.label}</p>
            <p className={cn('text-lg font-bold', s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Employee Selection */}
      <div className="section-card">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a2d3e]">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#3b6ef0]" />
            <span className="text-sm font-semibold text-white">Employee Selection</span>
          </div>
          <button onClick={toggleAll} className="text-xs text-[#3b6ef0] hover:text-blue-300">
            {selected.size === readyCandidates.length ? 'Deselect All' : 'Select All Ready'}
          </button>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th className="w-10" />
              <th>Employee</th>
              <th>Code</th>
              <th>Wage</th>
              <th>Warnings</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {candidates.map((c) => {
              const isChecked = selected.has(c.employeeId);
              const isDisabled = !c.isReady;
              return (
                <tr
                  key={c.employeeId}
                  onClick={() => !isDisabled && toggleOne(c.employeeId)}
                  className={cn(!isDisabled && 'cursor-pointer', isDisabled && 'opacity-40')}
                >
                  <td>
                    {isChecked
                      ? <CheckSquare className="w-4 h-4 text-[#3b6ef0]" />
                      : <Square className="w-4 h-4 text-[#374151]" />}
                  </td>
                  <td className="font-medium text-white">{c.fullName}</td>
                  <td><span className="font-mono text-xs text-[#4b5563]">{c.employeeCode}</span></td>
                  <td className="font-mono">₹{c.wage.toLocaleString('en-IN')}</td>
                  <td>
                    {c.warnings.length > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs text-yellow-400">
                        <AlertTriangle className="w-3 h-3" />
                        {c.warnings.length} warning(s)
                      </span>
                    )}
                  </td>
                  <td>
                    <span className={cn('status-pill', c.isReady
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-800/40'
                      : 'bg-red-500/10 text-red-400 border border-red-800/40')}>
                      {c.isReady ? 'Ready' : 'Blocked'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {error && (
        <p className="text-sm text-red-400 bg-red-500/10 border border-red-800/40 rounded-lg px-4 py-2.5">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between">
        <button onClick={onBack} className="btn-secondary">
          ← Back
        </button>
        <button onClick={handleCreate} disabled={loading || selected.size === 0} className="btn-primary">
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Creating...</> : `Create Draft Payrun (${selected.size} employees)`}
        </button>
      </div>
    </div>
  );
}
