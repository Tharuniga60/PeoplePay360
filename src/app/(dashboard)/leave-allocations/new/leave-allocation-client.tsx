'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

interface Employee { id: string; firstName: string; lastName: string; employeeCode: string; }
interface LeaveType { id: string; name: string; isPaid: boolean; }

interface LeaveAllocationClientProps {
  employees: Employee[];
  leaveTypes: LeaveType[];
}

export function LeaveAllocationClient({ employees, leaveTypes }: LeaveAllocationClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const currentYear = new Date().getFullYear();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    const data = {
      employeeId: formData.get('employeeId'),
      leaveTypeId: formData.get('leaveTypeId'),
      year: parseInt(formData.get('year') as string),
      totalDays: parseFloat(formData.get('totalDays') as string),
    };

    try {
      const res = await fetch('/api/leave-allocations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const j = await res.json();
        setError(j.error || 'Failed to create allocation');
      } else {
        router.push('/leave-allocations');
        router.refresh();
      }
    } catch {
      setError('Unexpected error');
    } finally {
      setLoading(false);
    }
  }

  const labelClass = 'block text-xs font-medium text-[#9ca3af] mb-1.5 uppercase tracking-wide';

  return (
    <form onSubmit={handleSubmit} className="section-card p-6 space-y-5 max-w-xl">
      {error && <div className="p-3 bg-red-500/10 border border-red-800/40 text-red-400 rounded-lg text-sm">{error}</div>}

      <div>
        <label className={labelClass}>Employee *</label>
        <select name="employeeId" required className="form-input">
          <option value="">Select employee...</option>
          {employees.map((e) => (
            <option key={e.id} value={e.id}>{e.firstName} {e.lastName} ({e.employeeCode})</option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelClass}>Leave Type *</label>
        <select name="leaveTypeId" required className="form-input">
          <option value="">Select leave type...</option>
          {leaveTypes.map((lt) => (
            <option key={lt.id} value={lt.id}>{lt.name} {lt.isPaid ? '(Paid)' : '(Unpaid)'}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Year *</label>
          <input
            type="number"
            name="year"
            required
            defaultValue={currentYear}
            min={currentYear - 1}
            max={currentYear + 1}
            className="form-input"
          />
        </div>
        <div>
          <label className={labelClass}>Total Days *</label>
          <input
            type="number"
            name="totalDays"
            required
            min="0.5"
            step="0.5"
            className="form-input"
            placeholder="e.g. 21"
          />
        </div>
      </div>

      <p className="text-xs text-[#4b5563] bg-[#1e2235] border border-[#2a2d3e] rounded-lg px-3 py-2">
        💡 Once approved leaves are applied, <strong className="text-[#6b7280]">Used Days</strong> will automatically update. Balance = Total − Used.
      </p>

      <div className="flex justify-end gap-3 pt-3 border-t border-[#2a2d3e]">
        <button type="button" onClick={() => router.back()} className="px-4 py-2 text-sm text-[#9ca3af] hover:text-white">Cancel</button>
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Allocating...</> : 'Create Allocation'}
        </button>
      </div>
    </form>
  );
}
