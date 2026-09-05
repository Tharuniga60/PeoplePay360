'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, AlertCircle, Info, Calendar } from 'lucide-react';
import { differenceInBusinessDays, parseISO } from 'date-fns';

interface EmployeeOption {
  id: string;
  firstName: string;
  lastName: string;
  employeeCode: string;
}

interface LeaveTypeOption {
  id: string;
  name: string;
  isPaid: boolean;
}

interface AllocationRecord {
  employeeId: string;
  leaveTypeId: string;
  year: number;
  totalDays: string | number;
  usedDays: string | number;
}

interface LeaveRequestClientProps {
  initialEmployeeId?: string | null;
  leaveTypes: LeaveTypeOption[];
  employees?: EmployeeOption[];
  isManager?: boolean;
  allocations?: AllocationRecord[];
  redirectPath?: string;
}

export function LeaveRequestClient({
  initialEmployeeId,
  leaveTypes,
  employees = [],
  isManager = false,
  allocations = [],
  redirectPath = '/time-off/requests',
}: LeaveRequestClientProps) {
  const router = useRouter();
  const [selectedEmpId, setSelectedEmpId] = useState<string>(
    initialEmployeeId || (employees[0]?.id ?? '')
  );
  const [selectedTypeId, setSelectedTypeId] = useState<string>(leaveTypes[0]?.id ?? '');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [days, setDays] = useState<string>('1');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Auto-calculate working days when start & end dates change
  function handleDateChange(newStart: string, newEnd: string) {
    if (newStart && newEnd) {
      try {
        const start = parseISO(newStart);
        const end = parseISO(newEnd);
        if (end >= start) {
          // business days inclusive
          const diff = differenceInBusinessDays(end, start) + 1;
          setDays(Math.max(1, diff).toString());
        }
      } catch {
        // ignore parse errors
      }
    }
  }

  // Calculate remaining balance for selected employee & leave type in current year
  const currentYear = new Date().getFullYear();
  const allocation = useMemo(() => {
    return allocations.find(
      (a) =>
        a.employeeId === selectedEmpId &&
        a.leaveTypeId === selectedTypeId &&
        a.year === currentYear
    );
  }, [allocations, selectedEmpId, selectedTypeId, currentYear]);

  const remainingBalance = useMemo(() => {
    if (!allocation) return null;
    const total = parseFloat(allocation.totalDays.toString());
    const used = parseFloat(allocation.usedDays.toString());
    return Math.max(0, total - used);
  }, [allocation]);

  const requestedDays = parseFloat(days) || 0;
  const isInsufficient = remainingBalance !== null && requestedDays > remainingBalance;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedEmpId) {
      setError('Please select an employee');
      return;
    }
    if (isInsufficient) {
      setError('Insufficient leave balance.');
      return;
    }

    setLoading(true);
    setError('');

    const data = {
      employeeId: selectedEmpId,
      leaveTypeId: selectedTypeId,
      startDate,
      endDate,
      numberOfDays: requestedDays,
      reason: reason || undefined,
    };

    try {
      const res = await fetch('/api/leaves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const result = await res.json();
        setError(result.error || 'Failed to submit leave request');
      } else {
        router.push(redirectPath);
        router.refresh();
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="section-card p-6 space-y-6 max-w-2xl">
      {error && (
        <div className="p-3.5 bg-red-500/10 border border-red-800/40 text-red-400 rounded-xl text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Employee Selector (visible for HR/Admin, hidden or readonly for employee) */}
      {isManager && employees.length > 0 ? (
        <div>
          <label className="block text-xs font-semibold text-[#6b7280] uppercase tracking-wider mb-1.5">
            Employee *
          </label>
          <select
            value={selectedEmpId}
            onChange={(e) => setSelectedEmpId(e.target.value)}
            required
            className="form-input text-sm"
          >
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.firstName} {emp.lastName} ({emp.employeeCode})
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div>
        <label className="block text-xs font-semibold text-[#6b7280] uppercase tracking-wider mb-1.5">
          Leave Type *
        </label>
        <select
          value={selectedTypeId}
          onChange={(e) => setSelectedTypeId(e.target.value)}
          required
          className="form-input text-sm"
        >
          {leaveTypes.map((lt) => (
            <option key={lt.id} value={lt.id}>
              {lt.name} {lt.isPaid ? '(Paid)' : '(Unpaid)'}
            </option>
          ))}
        </select>
      </div>

      {/* Real-time Balance Banner */}
      {remainingBalance !== null ? (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs ${
            isInsufficient
              ? 'bg-red-500/10 border-red-800/40 text-red-400'
              : 'bg-blue-500/10 border-blue-800/40 text-blue-400'
          }`}
        >
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4" />
            <span>
              Available Balance ({currentYear}): <strong>{remainingBalance} days</strong>
            </span>
          </div>
          {isInsufficient && (
            <span className="font-semibold text-red-400">
              Exceeds available balance by {(requestedDays - remainingBalance).toFixed(1)} days
            </span>
          )}
        </div>
      ) : (
        <div className="p-3 bg-[#111318] rounded-xl border border-[#2a2d3e] text-xs text-[#6b7280]">
          No pre-allocated balance cap for this type (or balance unallocated).
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-[#6b7280] uppercase tracking-wider mb-1.5">
            Start Date *
          </label>
          <input
            type="date"
            required
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              handleDateChange(e.target.value, endDate);
            }}
            className="form-input text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#6b7280] uppercase tracking-wider mb-1.5">
            End Date *
          </label>
          <input
            type="date"
            required
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              handleDateChange(startDate, e.target.value);
            }}
            className="form-input text-sm"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-[#6b7280] uppercase tracking-wider mb-1.5">
          Duration (Days) *
        </label>
        <input
          type="number"
          step="0.5"
          min="0.5"
          required
          value={days}
          onChange={(e) => setDays(e.target.value)}
          className="form-input text-sm font-mono"
        />
        <p className="text-[11px] text-[#6b7280] mt-1">
          Auto-calculated business days (excluding weekends). You can adjust for half-days.
        </p>
      </div>

      <div>
        <label className="block text-xs font-semibold text-[#6b7280] uppercase tracking-wider mb-1.5">
          Reason
        </label>
        <textarea
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Brief description / notes for the approval manager..."
          className="form-input text-sm resize-none"
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
        <button
          type="submit"
          disabled={loading || isInsufficient}
          className={`btn-primary ${
            isInsufficient ? 'opacity-50 cursor-not-allowed bg-red-800/50 hover:bg-red-800/50' : ''
          }`}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Submitting...
            </>
          ) : isInsufficient ? (
            'Insufficient leave balance'
          ) : (
            'Submit Request'
          )}
        </button>
      </div>
    </form>
  );
}
