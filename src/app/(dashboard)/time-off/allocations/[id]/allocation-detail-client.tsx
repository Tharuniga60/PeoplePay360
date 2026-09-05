'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Calendar,
  Layers,
  Save,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Check,
  X,
  RotateCcw,
  Building2,
} from 'lucide-react';
import { formatDate, cn, snakeToTitle } from '@/lib/utils';

interface AllocationDetailProps {
  allocation: any;
  canManage: boolean;
}

export function AllocationDetailClient({
  allocation: initialAllocation,
  canManage,
}: AllocationDetailProps) {
  const router = useRouter();
  const [allocation, setAllocation] = useState(initialAllocation);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form states
  const [totalDays, setTotalDays] = useState(allocation.totalDays);
  const [validityStart, setValidityStart] = useState(allocation.validityStart || '');
  const [validityEnd, setValidityEnd] = useState(allocation.validityEnd || '');
  const [notes, setNotes] = useState(allocation.notes || '');

  const total = parseFloat(totalDays || '0');
  const used = parseFloat(allocation.usedDays || '0');
  const remaining = Math.max(0, total - used);

  async function handleStatusTransition(targetStatus: string) {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/leave-allocations/${allocation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: targetStatus }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update allocation status');

      setAllocation(data.data);
      setSuccess(`Allocation marked as ${targetStatus.toUpperCase()}`);
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
      const res = await fetch(`/api/leave-allocations/${allocation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          totalDays: parseFloat(totalDays),
          validityStart: validityStart || null,
          validityEnd: validityEnd || null,
          notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save changes');

      setAllocation(data.data);
      setSuccess('Allocation details saved successfully.');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this allocation?')) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/leave-allocations/${allocation.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete allocation');

      router.push('/time-off/allocations');
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  }

  const currentStatus = allocation.status || 'approved';

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Link
            href="/time-off/allocations"
            className="p-2 rounded-xl bg-[#1e2235] hover:bg-[#2a2d3e] text-[#a0aec0] hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white tracking-tight">Leave Allocation</h1>
              <span
                className={cn(
                  'status-pill',
                  currentStatus === 'approved'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-800/40'
                    : currentStatus === 'refused'
                    ? 'bg-red-500/10 text-red-400 border border-red-800/40'
                    : 'bg-yellow-500/10 text-yellow-400 border border-yellow-800/40'
                )}
              >
                {snakeToTitle(currentStatus)}
              </span>
            </div>
            <p className="text-xs text-[#6b7280] mt-0.5">
              Year {allocation.year} Allocation · {allocation.leaveType?.name}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        {canManage && (
          <div className="flex items-center gap-2">
            {currentStatus !== 'approved' && (
              <button
                type="button"
                disabled={loading}
                onClick={() => handleStatusTransition('approved')}
                className="btn-primary inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white"
              >
                <Check className="w-4 h-4" />
                Approve Allocation
              </button>
            )}

            {currentStatus !== 'refused' && (
              <button
                type="button"
                disabled={loading}
                onClick={() => handleStatusTransition('refused')}
                className="btn-secondary text-red-400 hover:text-red-300 inline-flex items-center gap-1.5"
              >
                <X className="w-4 h-4" />
                Refuse
              </button>
            )}

            {currentStatus !== 'to_approve' && (
              <button
                type="button"
                disabled={loading}
                onClick={() => handleStatusTransition('to_approve')}
                className="btn-secondary inline-flex items-center gap-1.5 text-blue-400"
              >
                <RotateCcw className="w-4 h-4" />
                Reset to To Approve
              </button>
            )}

            {used === 0 && (
              <button
                type="button"
                disabled={loading}
                onClick={handleDelete}
                className="p-2 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors"
                title="Delete Allocation"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
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

      {/* Employee Info */}
      <div className="section-card p-5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-base font-bold">
            {allocation.employee?.firstName?.[0]}
            {allocation.employee?.lastName?.[0]}
          </div>
          <div>
            <h3 className="font-semibold text-white">
              {allocation.employee?.firstName} {allocation.employee?.lastName}
            </h3>
            <p className="text-xs text-[#6b7280]">
              {allocation.employee?.employeeCode} · {allocation.employee?.department?.name || 'No Dept'} ·{' '}
              {allocation.employee?.jobPosition?.name || 'No Position'}
            </p>
          </div>
        </div>
      </div>

      {/* Balance Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="section-card p-5">
          <p className="text-xs text-[#6b7280]">Total Allocated</p>
          <p className="text-2xl font-bold text-white font-mono mt-1">{total.toFixed(1)}d</p>
          <p className="text-[11px] text-[#4b5563]">Granted for year {allocation.year}</p>
        </div>

        <div className="section-card p-5">
          <p className="text-xs text-[#6b7280]">Used / Consumed</p>
          <p className="text-2xl font-bold text-amber-400 font-mono mt-1">{used.toFixed(1)}d</p>
          <p className="text-[11px] text-[#4b5563]">Approved leave requests</p>
        </div>

        <div className="section-card p-5">
          <p className="text-xs text-[#6b7280]">Available Remaining</p>
          <p className="text-2xl font-bold text-emerald-400 font-mono mt-1">{remaining.toFixed(1)}d</p>
          <p className="text-[11px] text-[#4b5563]">Usable balance</p>
        </div>
      </div>

      {/* Edit Form */}
      <form onSubmit={handleSaveDetails} className="section-card p-6 space-y-5">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2 border-b border-[#2a2d3e] pb-3">
          <Layers className="w-4 h-4 text-indigo-400" />
          Allocation Parameters
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="form-label">Total Days Allocated</label>
            <input
              type="number"
              step="0.5"
              min="0"
              disabled={!canManage}
              value={totalDays}
              onChange={(e) => setTotalDays(e.target.value)}
              className="form-input w-full font-mono"
              required
            />
          </div>

          <div>
            <label className="form-label">Validity Start Date</label>
            <input
              type="date"
              disabled={!canManage}
              value={validityStart}
              onChange={(e) => setValidityStart(e.target.value)}
              className="form-input w-full"
            />
          </div>

          <div>
            <label className="form-label">Validity End Date</label>
            <input
              type="date"
              disabled={!canManage}
              value={validityEnd}
              onChange={(e) => setValidityEnd(e.target.value)}
              className="form-input w-full"
            />
          </div>
        </div>

        <div>
          <label className="form-label">Allocation Notes / Policy Basis</label>
          <textarea
            rows={3}
            disabled={!canManage}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Annual policy grant / Rollover credit / Compensatory time granted"
            className="form-input w-full text-xs"
          />
        </div>

        {canManage && (
          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="btn-primary inline-flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Save Allocation
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
