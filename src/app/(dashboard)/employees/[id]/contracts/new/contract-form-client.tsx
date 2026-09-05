'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, FileText, Calendar, DollarSign, Clock } from 'lucide-react';

interface SalaryStructure { id: string; name: string; code: string; }
interface WorkingSchedule { id: string; name: string; hoursPerWeek: string; }

interface ContractFormClientProps {
  employeeId: string;
  salaryStructures: SalaryStructure[];
  workingSchedules: WorkingSchedule[];
}

export function ContractFormClient({ employeeId, salaryStructures, workingSchedules }: ContractFormClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    const endDate = formData.get('endDate') as string;
    const scheduleId = formData.get('scheduleId') as string;

    const data = {
      employeeId,
      salaryStructureId: formData.get('salaryStructureId'),
      scheduleId: scheduleId || undefined,
      name: formData.get('name'),
      startDate: formData.get('startDate'),
      endDate: endDate || undefined,
      wage: parseFloat(formData.get('wage') as string),
      status: formData.get('status') || 'active',
      notes: formData.get('notes') || undefined,
    };

    try {
      const res = await fetch('/api/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const result = await res.json();
        setError(result.error || 'Failed to create contract');
      } else {
        router.push(`/employees/${employeeId}`);
        router.refresh();
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }

  const labelClass = 'block text-xs font-medium text-[#9ca3af] mb-1.5 uppercase tracking-wide';
  const inputClass = 'form-input';

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-3xl">
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-800/40 text-red-400 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Contract Details */}
      <div className="section-card p-6 space-y-5">
        <div className="flex items-center gap-2 pb-3 border-b border-[#2a2d3e]">
          <FileText className="w-4 h-4 text-[#3b6ef0]" />
          <h2 className="text-sm font-semibold text-white">Contract Details</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className={labelClass}>Contract Name *</label>
            <input type="text" name="name" required className={inputClass} placeholder="e.g. Full-Time Employment 2025" />
          </div>
          <div>
            <label className={labelClass}>Salary Structure *</label>
            <select name="salaryStructureId" required className={inputClass}>
              <option value="">Select structure...</option>
              {salaryStructures.map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Working Schedule</label>
            <select name="scheduleId" className={inputClass}>
              <option value="">Use employee default</option>
              {workingSchedules.map((ws) => (
                <option key={ws.id} value={ws.id}>{ws.name} ({ws.hoursPerWeek}h/wk)</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Compensation */}
      <div className="section-card p-6 space-y-5">
        <div className="flex items-center gap-2 pb-3 border-b border-[#2a2d3e]">
          <DollarSign className="w-4 h-4 text-[#3b6ef0]" />
          <h2 className="text-sm font-semibold text-white">Compensation & Duration</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Monthly Salary (₹) *</label>
            <input type="number" name="wage" required min="0" step="100" className={inputClass} placeholder="50000" />
          </div>
          <div>
            <label className={labelClass}>Start Date *</label>
            <input type="date" name="startDate" required className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>End Date (leave blank for ongoing)</label>
            <input type="date" name="endDate" className={inputClass} />
          </div>
        </div>
        <div>
          <label className={labelClass}>Status</label>
          <select name="status" defaultValue="active" className={inputClass}>
            <option value="active">Active</option>
            <option value="expired">Expired</option>
          </select>
        </div>
      </div>

      {/* Notes */}
      <div className="section-card p-6 space-y-3">
        <label className={labelClass}>Notes</label>
        <textarea name="notes" rows={3} className="form-input resize-none" placeholder="Any additional notes about this contract..." />
      </div>

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 text-sm font-medium text-[#9ca3af] hover:text-white transition-colors"
        >
          Cancel
        </button>
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Creating...</> : 'Create Contract'}
        </button>
      </div>
    </form>
  );
}
