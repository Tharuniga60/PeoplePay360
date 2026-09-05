'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Settings,
  Save,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Calendar,
  Layers,
} from 'lucide-react';

interface LeaveTypeFormClientProps {
  initialData?: any;
  companyId: string;
  isNew?: boolean;
}

export function LeaveTypeFormClient({
  initialData,
  companyId,
  isNew = false,
}: LeaveTypeFormClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState(initialData?.name || '');
  const [code, setCode] = useState(initialData?.code || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [unit, setUnit] = useState<'days' | 'hours'>(initialData?.unit || 'days');
  const [isPaid, setIsPaid] = useState<boolean>(initialData?.isPaid ?? true);
  const [requiresAllocation, setRequiresAllocation] = useState<boolean>(
    initialData?.requiresAllocation ?? true
  );
  const [approvalWorkflow, setApprovalWorkflow] = useState(
    initialData?.approvalWorkflow || 'manager'
  );
  const [maxDaysPerYear, setMaxDaysPerYear] = useState(
    initialData?.maxDaysPerYear !== undefined ? initialData.maxDaysPerYear : 15
  );
  const [color, setColor] = useState(initialData?.color || '#3b6ef0');
  const [isActive, setIsActive] = useState<boolean>(initialData?.isActive ?? true);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const payload = {
      companyId,
      name,
      code: code.toUpperCase(),
      description,
      unit,
      isPaid,
      requiresAllocation,
      approvalWorkflow,
      maxDaysPerYear: parseInt(maxDaysPerYear.toString(), 10) || 0,
      color,
      isActive,
    };

    try {
      const url = isNew ? '/api/leave-types' : `/api/leave-types/${initialData.id}`;
      const method = isNew ? 'POST' : 'PATCH';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save time off type');

      setSuccess('Time off type saved successfully.');
      setTimeout(() => {
        router.push('/time-off/types');
      }, 700);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this time off type?')) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/leave-types/${initialData.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete leave type');

      router.push('/time-off/types');
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Link
            href="/time-off/types"
            className="p-2 rounded-xl bg-[#1e2235] hover:bg-[#2a2d3e] text-[#a0aec0] hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <div
                className="w-4 h-4 rounded-full border border-white/20"
                style={{ backgroundColor: color }}
              />
              <h1 className="text-2xl font-bold text-white tracking-tight">
                {isNew ? 'New Time Off Type' : name}
              </h1>
            </div>
            <p className="text-xs text-[#6b7280] mt-0.5">
              {isNew ? 'Create a configurable leave policy' : `Policy Code: ${code}`}
            </p>
          </div>
        </div>

        {!isNew && (
          <button
            type="button"
            disabled={loading}
            onClick={handleDelete}
            className="p-2 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors"
            title="Delete Type"
          >
            <Trash2 className="w-4 h-4" />
          </button>
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

      {/* Form */}
      <form onSubmit={handleSubmit} className="section-card p-6 space-y-6">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2 border-b border-[#2a2d3e] pb-3">
          <Settings className="w-4 h-4 text-blue-400" />
          General Policy Configuration
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="form-label">Type / Policy Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Paid Time Off (PTO)"
              className="form-input w-full"
            />
          </div>

          <div>
            <label className="form-label">Policy Code *</label>
            <input
              type="text"
              required
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. PTO, SICK, CASUAL"
              className="form-input w-full font-mono uppercase"
            />
          </div>

          <div>
            <label className="form-label">Measurement Unit *</label>
            <select
              value={unit}
              onChange={(e: any) => setUnit(e.target.value)}
              className="form-input w-full"
            >
              <option value="days">Days (Standard Full/Half Day)</option>
              <option value="hours">Hours (Hourly Time Off)</option>
            </select>
          </div>

          <div>
            <label className="form-label">Max Allowed Days / Year</label>
            <input
              type="number"
              min="0"
              value={maxDaysPerYear}
              onChange={(e) => setMaxDaysPerYear(e.target.value)}
              placeholder="0 for unlimited"
              className="form-input w-full font-mono"
            />
            <p className="text-[10px] text-[#4b5563] mt-1">Set to 0 if unlimited or discretionary</p>
          </div>

          <div>
            <label className="form-label">Approval Workflow</label>
            <select
              value={approvalWorkflow}
              onChange={(e) => setApprovalWorkflow(e.target.value)}
              className="form-input w-full"
            >
              <option value="manager">By HR Manager / Approver</option>
              <option value="both">By Direct Manager and HR</option>
              <option value="no_validation">No Validation (Auto-approved)</option>
            </select>
          </div>

          <div>
            <label className="form-label">Color Theme</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border border-[#2a2d3e]"
              />
              <input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="form-input flex-1 font-mono text-xs"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="form-label">Description / Policy Details</label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe eligibility criteria, accrual rules, or restrictions..."
            className="form-input w-full text-xs"
          />
        </div>

        {/* Toggles */}
        <div className="pt-2 border-t border-[#2a2d3e] grid grid-cols-1 md:grid-cols-3 gap-4">
          <label className="flex items-center gap-2.5 cursor-pointer p-3 rounded-xl bg-[#111318] border border-[#2a2d3e]">
            <input
              type="checkbox"
              checked={isPaid}
              onChange={(e) => setIsPaid(e.target.checked)}
              className="w-4 h-4 rounded border-[#374151] text-[#3b6ef0] bg-[#1e2235]"
            />
            <div>
              <p className="text-xs font-semibold text-white">Paid Leave</p>
              <p className="text-[10px] text-[#6b7280]">Does not deduct wage during payrun</p>
            </div>
          </label>

          <label className="flex items-center gap-2.5 cursor-pointer p-3 rounded-xl bg-[#111318] border border-[#2a2d3e]">
            <input
              type="checkbox"
              checked={requiresAllocation}
              onChange={(e) => setRequiresAllocation(e.target.checked)}
              className="w-4 h-4 rounded border-[#374151] text-[#3b6ef0] bg-[#1e2235]"
            />
            <div>
              <p className="text-xs font-semibold text-white">Requires Allocation</p>
              <p className="text-[10px] text-[#6b7280]">Employee must be granted days first</p>
            </div>
          </label>

          <label className="flex items-center gap-2.5 cursor-pointer p-3 rounded-xl bg-[#111318] border border-[#2a2d3e]">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 rounded border-[#374151] text-[#3b6ef0] bg-[#1e2235]"
            />
            <div>
              <p className="text-xs font-semibold text-white">Active Status</p>
              <p className="text-[10px] text-[#6b7280]">Available for employees to request</p>
            </div>
          </label>
        </div>

        <div className="pt-3 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => router.push('/time-off/types')}
            className="btn-secondary text-xs"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary inline-flex items-center gap-2 text-xs"
          >
            <Save className="w-4 h-4" />
            {isNew ? 'Create Time Off Type' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
