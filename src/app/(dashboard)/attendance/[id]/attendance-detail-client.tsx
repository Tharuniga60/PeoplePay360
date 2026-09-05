'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Clock,
  User,
  Calendar,
  Save,
  Trash2,
  CheckCircle2,
  AlertCircle,
  FileText,
  Building2,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn, snakeToTitle } from '@/lib/utils';

interface AttendanceDetailProps {
  record: any;
  canManage: boolean;
}

export function AttendanceDetailClient({
  record: initialRecord,
  canManage,
}: AttendanceDetailProps) {
  const router = useRouter();
  const [record, setRecord] = useState(initialRecord);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [attendanceDate, setAttendanceDate] = useState(record.attendanceDate);
  const [checkIn, setCheckIn] = useState(
    record.checkIn ? format(new Date(record.checkIn), "yyyy-MM-dd'T'HH:mm") : ''
  );
  const [checkOut, setCheckOut] = useState(
    record.checkOut ? format(new Date(record.checkOut), "yyyy-MM-dd'T'HH:mm") : ''
  );
  const [status, setStatus] = useState(record.status || 'present');
  const [workedHours, setWorkedHours] = useState(record.workedHours || '');
  const [correctionReason, setCorrectionReason] = useState('');
  const [existingNotes, setExistingNotes] = useState(record.notes || '');

  // Real-time calculation helper
  function calculateWorkedHours() {
    if (!checkIn || !checkOut) return;
    const start = new Date(checkIn).getTime();
    const end = new Date(checkOut).getTime();
    if (end <= start) {
      setError('Check-out time must be after check-in time');
      return;
    }
    const grossMinutes = Math.max(0, Math.floor((end - start) / (1000 * 60)));
    const breakMinutes = 60; // 1 hour standard break
    const netHours = Math.max(0, (grossMinutes - breakMinutes) / 60);
    setWorkedHours(netHours.toFixed(2));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const bodyPayload: Record<string, any> = {
        checkIn: checkIn ? new Date(checkIn).toISOString() : null,
        checkOut: checkOut ? new Date(checkOut).toISOString() : null,
        workedHours: workedHours ? parseFloat(workedHours) : null,
        status,
        notes: correctionReason
          ? existingNotes
            ? `${existingNotes} | Correction: ${correctionReason}`
            : `Correction: ${correctionReason}`
          : existingNotes,
      };

      const res = await fetch(`/api/attendance/${record.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update attendance record');

      setRecord(data.data);
      setExistingNotes(data.data.notes || '');
      setCorrectionReason('');
      setSuccess('Attendance record updated successfully.');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this attendance record?')) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/attendance/${record.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete record');

      router.push('/attendance');
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
            href="/attendance"
            className="p-2 rounded-xl bg-[#1e2235] hover:bg-[#2a2d3e] text-[#a0aec0] hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white tracking-tight">Attendance Record</h1>
              <span
                className={cn(
                  'status-pill',
                  status === 'present'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-800/40'
                    : status === 'absent'
                    ? 'bg-red-500/10 text-red-400 border border-red-800/40'
                    : 'bg-amber-500/10 text-amber-400 border border-amber-800/40'
                )}
              >
                {snakeToTitle(status)}
              </span>
            </div>
            <p className="text-xs text-[#6b7280] mt-0.5">
              {format(new Date(record.attendanceDate), 'EEEE, MMMM dd, yyyy')}
            </p>
          </div>
        </div>

        {canManage && (
          <button
            type="button"
            disabled={loading}
            onClick={handleDelete}
            className="p-2 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors"
            title="Delete Record"
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

      {/* Employee Info Header */}
      <div className="section-card p-5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center text-base font-bold">
            {record.employee?.firstName?.[0]}
            {record.employee?.lastName?.[0]}
          </div>
          <div>
            <h3 className="font-semibold text-white">
              {record.employee?.firstName} {record.employee?.lastName}
            </h3>
            <p className="text-xs text-[#6b7280]">
              {record.employee?.employeeCode} · {record.employee?.department?.name || 'No Dept'} ·{' '}
              {record.employee?.jobPosition?.name || 'No Position'}
            </p>
          </div>
        </div>
      </div>

      {/* Main Details Form */}
      <form onSubmit={handleSave} className="section-card p-6 space-y-5">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2 border-b border-[#2a2d3e] pb-3">
          <Clock className="w-4 h-4 text-blue-400" />
          Timestamps & Hours Configuration
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="form-label">Attendance Date</label>
            <input
              type="date"
              disabled
              value={attendanceDate}
              className="form-input w-full bg-[#111318] text-[#6b7280]"
            />
          </div>

          <div>
            <label className="form-label">Attendance Status</label>
            <select
              disabled={!canManage}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="form-input w-full"
            >
              <option value="present">Present</option>
              <option value="half_day">Half Day</option>
              <option value="absent">Absent</option>
              <option value="holiday">Holiday</option>
              <option value="weekend">Weekend</option>
              <option value="on_leave">On Leave</option>
            </select>
          </div>

          <div>
            <label className="form-label">Check-In Timestamp</label>
            <input
              type="datetime-local"
              disabled={!canManage}
              value={checkIn}
              onChange={(e) => {
                setCheckIn(e.target.value);
              }}
              onBlur={calculateWorkedHours}
              className="form-input w-full font-mono text-xs"
            />
          </div>

          <div>
            <label className="form-label">Check-Out Timestamp</label>
            <input
              type="datetime-local"
              disabled={!canManage}
              value={checkOut}
              onChange={(e) => {
                setCheckOut(e.target.value);
              }}
              onBlur={calculateWorkedHours}
              className="form-input w-full font-mono text-xs"
            />
          </div>

          <div>
            <label className="form-label">Worked Hours (Computed Net)</label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                disabled={!canManage}
                value={workedHours}
                onChange={(e) => setWorkedHours(e.target.value)}
                className="form-input w-full font-mono"
                placeholder="e.g. 8.00"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#6b7280]">
                hrs
              </span>
            </div>
            <p className="text-[10px] text-[#4b5563] mt-1">
              Deducts 60min standard lunch/break interval from check-in to check-out span.
            </p>
          </div>

          <div>
            <label className="form-label">Correction Reason (Required for Auditing)</label>
            <input
              type="text"
              disabled={!canManage}
              value={correctionReason}
              onChange={(e) => setCorrectionReason(e.target.value)}
              placeholder="e.g. Employee forgot badge / Biometric device offline"
              className="form-input w-full text-xs"
            />
          </div>
        </div>

        {existingNotes && (
          <div className="p-3.5 rounded-xl bg-[#111318] border border-[#2a2d3e]">
            <p className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-wide mb-1">
              Historical Audit Notes
            </p>
            <p className="text-xs text-[#a0aec0] font-mono leading-relaxed">{existingNotes}</p>
          </div>
        )}

        {canManage && (
          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="btn-primary inline-flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Save Attendance Record
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
