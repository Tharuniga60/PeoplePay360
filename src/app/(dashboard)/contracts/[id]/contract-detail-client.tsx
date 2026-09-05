'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Calendar,
  Clock,
  DollarSign,
  Building2,
  FileText,
  CheckCircle2,
  AlertCircle,
  Play,
  StopCircle,
  RotateCcw,
  Ban,
  Save,
  Trash2,
} from 'lucide-react';
import { formatCurrency, formatDate, CONTRACT_STATUS_COLORS, cn, snakeToTitle } from '@/lib/utils';

interface ContractDetailProps {
  contract: any;
  salaryStructures: any[];
  schedules: any[];
  canEdit: boolean;
}

export function ContractDetailClient({
  contract: initialContract,
  salaryStructures,
  schedules,
  canEdit,
}: ContractDetailProps) {
  const router = useRouter();
  const [contract, setContract] = useState(initialContract);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState(contract.name);
  const [wage, setWage] = useState(contract.wage);
  const [startDate, setStartDate] = useState(contract.startDate);
  const [endDate, setEndDate] = useState(contract.endDate || '');
  const [salaryStructureId, setSalaryStructureId] = useState(contract.salaryStructureId);
  const [scheduleId, setScheduleId] = useState(contract.scheduleId || '');
  const [notes, setNotes] = useState(contract.notes || '');

  async function handleStatusTransition(targetStatus: string) {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/contracts/${contract.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: targetStatus }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update contract status');
      }

      setContract(data.data);
      setSuccess(`Contract status updated to ${targetStatus.toUpperCase()}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveDetails(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/contracts/${contract.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          wage: parseFloat(wage),
          startDate,
          endDate: endDate ? endDate : null,
          salaryStructureId,
          scheduleId: scheduleId ? scheduleId : null,
          notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save contract changes');
      }

      setContract(data.data);
      setSuccess('Contract details saved successfully.');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Are you sure you want to permanently delete this contract?')) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/contracts/${contract.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete contract');
      }

      router.push('/contracts');
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  }

  const steps = [
    { key: 'active', label: 'Running' },
    { key: 'expired', label: 'Expired' },
    { key: 'cancelled', label: 'Cancelled' },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Link
            href="/contracts"
            className="p-2 rounded-xl bg-[#1e2235] hover:bg-[#2a2d3e] text-[#a0aec0] hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white tracking-tight">{contract.name}</h1>
              <span className={cn('status-pill', CONTRACT_STATUS_COLORS[contract.status])}>
                {contract.status === 'active' ? 'Running' : snakeToTitle(contract.status)}
              </span>
            </div>
            <p className="text-xs text-[#6b7280] mt-0.5">
              Employee: {contract.employee?.firstName} {contract.employee?.lastName} ({contract.employee?.employeeCode})
            </p>
          </div>
        </div>

        {/* Workflow Action Buttons */}
        {canEdit && (
          <div className="flex items-center gap-2">
            {contract.status === 'active' && (
              <>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleStatusTransition('expired')}
                  className="btn-secondary text-amber-400 hover:text-amber-300 inline-flex items-center gap-1.5"
                >
                  <StopCircle className="w-4 h-4" />
                  Expire
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleStatusTransition('cancelled')}
                  className="btn-secondary text-red-400 hover:text-red-300 inline-flex items-center gap-1.5"
                >
                  <Ban className="w-4 h-4" />
                  Cancel
                </button>
              </>
            )}

            {(contract.status === 'expired' || contract.status === 'cancelled') && (
              <button
                type="button"
                disabled={loading}
                onClick={() => handleStatusTransition('active')}
                className="btn-secondary inline-flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300"
              >
                <Play className="w-4 h-4" />
                Reactivate Contract
              </button>
            )}

            {contract.status !== 'active' && (
              <button
                type="button"
                disabled={loading}
                onClick={handleDelete}
                className="p-2 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors"
                title="Delete Contract"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Pipeline Status Indicator */}
      <div className="section-card p-4">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          {steps.map((s, idx) => {
            const isActive = contract.status === s.key;
            return (
              <div key={s.key} className="flex items-center gap-3">
                <div
                  className={cn(
                    'flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-all',
                    isActive
                      ? 'bg-blue-600 text-white ring-4 ring-blue-500/20 shadow-lg'
                      : 'bg-[#1e2235] text-[#6b7280]'
                  )}
                >
                  {idx + 1}
                </div>
                <span
                  className={cn(
                    'text-xs font-medium',
                    isActive ? 'text-white font-semibold' : 'text-[#6b7280]'
                  )}
                >
                  {s.label}
                </span>
                {idx < steps.length - 1 && (
                  <div className="w-8 md:w-16 h-[1px] bg-[#2a2d3e] ml-2" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3 text-red-400 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3 text-emerald-400 text-sm">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Main Details Form */}
      <form onSubmit={handleSaveDetails} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Contract Specs */}
        <div className="lg:col-span-2 space-y-6">
          <div className="section-card p-6 space-y-5">
            <h2 className="text-base font-semibold text-white flex items-center gap-2 border-b border-[#2a2d3e] pb-3">
              <FileText className="w-4 h-4 text-blue-400" />
              Contract Terms & Details
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="form-label">Contract Name / Title</label>
                <input
                  type="text"
                  disabled={!canEdit}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="form-input w-full"
                  required
                />
              </div>

              <div>
                <label className="form-label">Base Salary (Monthly)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#6b7280]">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    disabled={!canEdit}
                    value={wage}
                    onChange={(e) => setWage(e.target.value)}
                    className="form-input pl-7 w-full font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="form-label">Start Date</label>
                <input
                  type="date"
                  disabled={!canEdit}
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="form-input w-full"
                  required
                />
              </div>

              <div>
                <label className="form-label">End Date (Optional for Ongoing)</label>
                <input
                  type="date"
                  disabled={!canEdit}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="form-input w-full"
                />
              </div>

              <div>
                <label className="form-label">Salary Structure</label>
                <select
                  disabled={!canEdit}
                  value={salaryStructureId}
                  onChange={(e) => setSalaryStructureId(e.target.value)}
                  className="form-input w-full"
                  required
                >
                  {salaryStructures.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">Working Schedule</label>
                <select
                  disabled={!canEdit}
                  value={scheduleId}
                  onChange={(e) => setScheduleId(e.target.value)}
                  className="form-input w-full"
                >
                  <option value="">-- None (Company Default) --</option>
                  {schedules.map((sch) => (
                    <option key={sch.id} value={sch.id}>
                      {sch.name} ({sch.hoursPerWeek}h/week)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="form-label">Notes & Provisions</label>
              <textarea
                disabled={!canEdit}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Additional contractual terms, probation period clauses, etc."
                className="form-input w-full"
              />
            </div>

            {canEdit && (
              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary inline-flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Save Changes
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Associated Employee & Summary */}
        <div className="space-y-6">
          <div className="section-card p-6 space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2 border-b border-[#2a2d3e] pb-3">
              <Building2 className="w-4 h-4 text-blue-400" />
              Employee Information
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[#6b7280]">Full Name:</span>
                <p className="font-semibold text-white text-sm">
                  {contract.employee?.firstName} {contract.employee?.lastName}
                </p>
              </div>
              <div>
                <span className="text-[#6b7280]">Employee Code:</span>
                <p className="font-mono text-[#a0aec0]">{contract.employee?.employeeCode}</p>
              </div>
              <div>
                <span className="text-[#6b7280]">Department:</span>
                <p className="text-white">{contract.employee?.department?.name || 'Unassigned'}</p>
              </div>
              <div>
                <span className="text-[#6b7280]">Job Position:</span>
                <p className="text-white">{contract.employee?.jobPosition?.name || 'Unassigned'}</p>
              </div>
              <div>
                <span className="text-[#6b7280]">Work Email:</span>
                <p className="text-[#a0aec0]">{contract.employee?.workEmail || '—'}</p>
              </div>

              <div className="pt-2">
                <Link
                  href={`/employees/${contract.employee?.id}`}
                  className="inline-flex items-center text-xs text-blue-400 hover:text-blue-300 font-medium"
                >
                  View Full Employee 360 Profile →
                </Link>
              </div>
            </div>
          </div>

          <div className="section-card p-6 space-y-3">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2 border-b border-[#2a2d3e] pb-3">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              Salary & Schedule Snapshot
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-[#1e2235]">
                <span className="text-[#6b7280]">Base Salary</span>
                <span className="font-mono font-bold text-white">
                  {formatCurrency(parseFloat(contract.wage))}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#1e2235]">
                <span className="text-[#6b7280]">Structure</span>
                <span className="text-white">{contract.salaryStructure?.name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#1e2235]">
                <span className="text-[#6b7280]">Schedule</span>
                <span className="text-white">{contract.schedule?.name || 'Standard 40h'}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[#6b7280]">Effective From</span>
                <span className="text-white">{formatDate(contract.startDate)}</span>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
