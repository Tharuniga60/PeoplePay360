'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, FileText, Calendar, DollarSign, Clock, AlertTriangle } from 'lucide-react';

interface EmployeeOption {
  id: string;
  firstName: string;
  lastName: string;
  employeeCode: string;
  department?: string;
  jobPosition?: string;
}

interface SalaryStructure {
  id: string;
  name: string;
  code: string;
}

interface WorkingSchedule {
  id: string;
  name: string;
  hoursPerWeek: string;
}

interface NewContractClientProps {
  employees: EmployeeOption[];
  salaryStructures: SalaryStructure[];
  workingSchedules: WorkingSchedule[];
  preselectedEmployeeId?: string;
}

export function NewContractClient({
  employees,
  salaryStructures,
  workingSchedules,
  preselectedEmployeeId,
}: NewContractClientProps) {
  const router = useRouter();
  const [selectedEmpId, setSelectedEmpId] = useState(preselectedEmployeeId || (employees[0]?.id ?? ''));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const selectedEmployee = employees.find((e) => e.id === selectedEmpId);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    const endDate = formData.get('endDate') as string;
    const scheduleId = formData.get('scheduleId') as string;

    const data = {
      employeeId: selectedEmpId,
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
        router.push('/contracts');
        router.refresh();
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="section-card p-6 space-y-6">
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-800/40 rounded-xl flex items-start gap-3 text-red-400 text-sm">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Contract Validation Failed</p>
            <p className="mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Employee Selector */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-[#6b7280] uppercase tracking-wider mb-1.5">
            Select Employee *
          </label>
          <select
            value={selectedEmpId}
            onChange={(e) => setSelectedEmpId(e.target.value)}
            required
            className="form-input"
          >
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.firstName} {emp.lastName} ({emp.employeeCode})
              </option>
            ))}
          </select>
        </div>

        {selectedEmployee && (
          <div className="bg-[#111318] p-3 rounded-xl border border-[#2a2d3e] flex items-center gap-4">
            <div>
              <p className="text-xs text-[#4b5563]">Department</p>
              <p className="text-xs font-medium text-white">{selectedEmployee.department ?? 'None'}</p>
            </div>
            <div>
              <p className="text-xs text-[#4b5563]">Position</p>
              <p className="text-xs font-medium text-white">{selectedEmployee.jobPosition ?? 'None'}</p>
            </div>
          </div>
        )}
      </div>

      {/* Contract Title */}
      <div>
        <label className="block text-xs font-semibold text-[#6b7280] uppercase tracking-wider mb-1.5">
          Contract Name / Reference *
        </label>
        <input
          type="text"
          name="name"
          required
          placeholder="e.g. Standard Employment Contract 2026"
          className="form-input"
        />
      </div>

      {/* Period */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-[#6b7280] uppercase tracking-wider mb-1.5">
            Start Date *
          </label>
          <input type="date" name="startDate" required className="form-input" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#6b7280] uppercase tracking-wider mb-1.5">
            End Date (Optional)
          </label>
          <input type="date" name="endDate" className="form-input" />
          <p className="text-[11px] text-[#4b5563] mt-1">Leave empty for permanent positions.</p>
        </div>
      </div>

      {/* Structure & Schedule */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-[#6b7280] uppercase tracking-wider mb-1.5">
            Salary Structure *
          </label>
          <select name="salaryStructureId" required className="form-input">
            <option value="">Select Salary Structure</option>
            {salaryStructures.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.code})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#6b7280] uppercase tracking-wider mb-1.5">
            Working Schedule
          </label>
          <select name="scheduleId" className="form-input">
            <option value="">Use Employee Default Schedule</option>
            {workingSchedules.map((ws) => (
              <option key={ws.id} value={ws.id}>
                {ws.name} ({ws.hoursPerWeek}h/wk)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Wage & Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-[#6b7280] uppercase tracking-wider mb-1.5">
            Base Wage (Monthly) *
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b7280] font-mono text-sm">$</span>
            <input
              type="number"
              name="wage"
              step="0.01"
              min="0"
              required
              placeholder="e.g. 5000"
              className="form-input pl-8 font-mono"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#6b7280] uppercase tracking-wider mb-1.5">
            Contract Status *
          </label>
          <select name="status" defaultValue="active" className="form-input">
            <option value="active">Active (Running)</option>
            <option value="draft">Draft</option>
            <option value="expired">Expired</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-[#6b7280] uppercase tracking-wider mb-1.5">
          Internal Notes
        </label>
        <textarea
          name="notes"
          rows={3}
          placeholder="Optional notes or contractual specifics..."
          className="form-input resize-none"
        />
      </div>

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#2a2d3e]">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 text-sm text-[#9ca3af] hover:text-white transition-colors"
        >
          Cancel
        </button>
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Validating & Saving...
            </>
          ) : (
            'Save Contract'
          )}
        </button>
      </div>
    </form>
  );
}
