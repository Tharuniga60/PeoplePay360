'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

interface Employee { id: string; firstName: string; lastName: string; employeeCode: string; }

export function AttendanceLogClient({ employees }: { employees: Employee[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    const formData = new FormData(e.currentTarget);
    const checkIn = formData.get('checkIn') as string;
    const checkOut = formData.get('checkOut') as string;
    const workedHours = formData.get('workedHours') as string;
    const overtimeHours = formData.get('overtimeHours') as string;

    const data: Record<string, unknown> = {
      employeeId: formData.get('employeeId'),
      attendanceDate: formData.get('attendanceDate'),
      status: formData.get('status'),
      checkIn: checkIn || undefined,
      checkOut: checkOut || undefined,
      workedHours: workedHours ? parseFloat(workedHours) : undefined,
      overtimeHours: overtimeHours ? parseFloat(overtimeHours) : 0,
      notes: formData.get('notes') || undefined,
    };

    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const result = await res.json();
        setError(result.error || 'Failed to log attendance');
      } else {
        setSuccess('Attendance logged successfully!');
        (e.target as HTMLFormElement).reset();
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }

  const labelClass = 'block text-xs font-medium text-[#9ca3af] mb-1.5 uppercase tracking-wide';

  return (
    <form onSubmit={handleSubmit} className="section-card p-6 space-y-5 max-w-2xl">
      {error && <div className="p-3 bg-red-500/10 border border-red-800/40 text-red-400 rounded-lg text-sm">{error}</div>}
      {success && <div className="p-3 bg-emerald-500/10 border border-emerald-800/40 text-emerald-400 rounded-lg text-sm">{success}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          <label className={labelClass}>Date *</label>
          <input type="date" name="attendanceDate" required className="form-input" />
        </div>
        <div>
          <label className={labelClass}>Status *</label>
          <select name="status" required className="form-input">
            <option value="present">Present</option>
            <option value="absent">Absent</option>
            <option value="half_day">Half Day</option>
            <option value="holiday">Holiday</option>
            <option value="weekend">Weekend</option>
            <option value="on_leave">On Leave</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Worked Hours</label>
          <input type="number" name="workedHours" min="0" max="24" step="0.25" className="form-input" placeholder="8.5" />
        </div>
        <div>
          <label className={labelClass}>Check In (datetime-local)</label>
          <input type="datetime-local" name="checkIn" className="form-input" />
        </div>
        <div>
          <label className={labelClass}>Check Out (datetime-local)</label>
          <input type="datetime-local" name="checkOut" className="form-input" />
        </div>
        <div>
          <label className={labelClass}>Overtime Hours</label>
          <input type="number" name="overtimeHours" min="0" step="0.25" className="form-input" placeholder="0" />
        </div>
        <div>
          <label className={labelClass}>Notes</label>
          <input type="text" name="notes" className="form-input" placeholder="Optional..." />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-3 border-t border-[#2a2d3e]">
        <button type="button" onClick={() => router.back()} className="px-4 py-2 text-sm font-medium text-[#9ca3af] hover:text-white transition-colors">
          Cancel
        </button>
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Logging...</> : 'Log Attendance'}
        </button>
      </div>
    </form>
  );
}
