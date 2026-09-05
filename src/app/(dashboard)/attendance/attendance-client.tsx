'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Clock,
  LogIn,
  LogOut,
  AlertTriangle,
  CheckCircle,
  X,
  Edit2,
  Loader2,
  Calendar,
  ShieldCheck,
  Zap,
  ChevronRight,
} from 'lucide-react';
import { formatDate, cn, snakeToTitle } from '@/lib/utils';
import { format } from 'date-fns';

interface AttendanceRow {
  id: string;
  attendanceDate: string;
  checkIn: string | Date | null;
  checkOut: string | Date | null;
  workedHours: string | null;
  overtimeHours: string | null;
  status: string;
  notes: string | null;
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    employeeCode: string;
  };
}

interface AttendanceClientProps {
  records: AttendanceRow[];
  currentEmployeeId: string | null;
  isManager: boolean;
  todayRecord: AttendanceRow | null;
}

export function AttendanceClient({
  records,
  currentEmployeeId,
  isManager,
  todayRecord,
}: AttendanceClientProps) {
  const router = useRouter();
  const [checking, setChecking] = useState(false);
  const [checkMsg, setCheckMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Correction Drawer state
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRow | null>(null);
  const [savingCorrection, setSavingCorrection] = useState(false);
  const [correctionError, setCorrectionError] = useState('');
  const [correctedCheckIn, setCorrectedCheckIn] = useState('');
  const [correctedCheckOut, setCorrectedCheckOut] = useState('');
  const [correctedHours, setCorrectedHours] = useState('');
  const [correctionReason, setCorrectionReason] = useState('');

  // Sync Working Schedule Modal state
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncStartDate, setSyncStartDate] = useState(format(new Date(), 'yyyy-MM-01'));
  const [syncEndDate, setSyncEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [syncing, setSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<{ message: string; isError: boolean } | null>(null);

  async function handleSyncSchedule(e: React.FormEvent) {
    e.preventDefault();
    setSyncing(true);
    setSyncFeedback(null);
    try {
      const res = await fetch('/api/attendance/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate: syncStartDate, endDate: syncEndDate }),
      });
      const json = await res.json();
      if (!res.ok) {
        setSyncFeedback({ message: json.error || 'Failed to sync schedule attendance', isError: true });
      } else {
        setSyncFeedback({ message: json.message || 'Attendance synchronized successfully', isError: false });
        router.refresh();
      }
    } catch {
      setSyncFeedback({ message: 'Network error while syncing attendance', isError: true });
    } finally {
      setSyncing(false);
    }
  }

  async function handleCheckInOut() {
    setChecking(true);
    setCheckMsg(null);
    try {
      const res = await fetch('/api/attendance/check-in', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) {
        setCheckMsg({ text: json.error || 'Failed to check in/out', type: 'error' });
      } else {
        setCheckMsg({ text: json.message, type: 'success' });
        router.refresh();
      }
    } catch {
      setCheckMsg({ text: 'Unexpected network error', type: 'error' });
    } finally {
      setChecking(false);
    }
  }

  function openCorrectionDrawer(record: AttendanceRow) {
    setSelectedRecord(record);
    setCorrectionError('');
    setCorrectionReason('');
    // Format checkIn and checkOut for datetime-local
    setCorrectedCheckIn(
      record.checkIn ? format(new Date(record.checkIn), "yyyy-MM-dd'T'HH:mm") : ''
    );
    setCorrectedCheckOut(
      record.checkOut ? format(new Date(record.checkOut), "yyyy-MM-dd'T'HH:mm") : ''
    );
    setCorrectedHours(record.workedHours ? record.workedHours.toString() : '8');
  }

  async function handleSaveCorrection(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedRecord) return;
    if (!correctionReason.trim()) {
      setCorrectionError('A correction reason note is strictly required');
      return;
    }

    setSavingCorrection(true);
    setCorrectionError('');
    try {
      const res = await fetch(`/api/attendance/${selectedRecord.id}/correct`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checkIn: correctedCheckIn ? new Date(correctedCheckIn).toISOString() : null,
          checkOut: correctedCheckOut ? new Date(correctedCheckOut).toISOString() : null,
          workedHours: parseFloat(correctedHours) || 0,
          reason: correctionReason,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setCorrectionError(json.error || 'Failed to correct record');
      } else {
        setSelectedRecord(null);
        router.refresh();
      }
    } catch {
      setCorrectionError('Failed to save correction');
    } finally {
      setSavingCorrection(false);
    }
  }

  const isCheckedIn = Boolean(todayRecord?.checkIn && !todayRecord?.checkOut);
  const isCheckedOut = Boolean(todayRecord?.checkIn && todayRecord?.checkOut);

  return (
    <div className="space-y-6">
      {/* Employee Daily Check-In/Check-Out Bar */}
      {currentEmployeeId && (
        <div className="section-card p-5 flex items-center justify-between gap-4 flex-wrap bg-gradient-to-r from-[#111318] to-[#181b24] border border-[#2a2d3e]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#3b6ef0]/15 flex items-center justify-center text-[#3b6ef0]">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Daily Time Tracking</p>
              <p className="text-xs text-[#6b7280]">
                {isCheckedOut
                  ? `Completed for today: ${todayRecord?.workedHours ?? '8'}h logged`
                  : isCheckedIn
                  ? `Checked in at ${format(new Date(todayRecord!.checkIn!), 'HH:mm:ss')}`
                  : 'You have not checked in today yet.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {checkMsg && (
              <span
                className={cn(
                  'text-xs px-3 py-1 rounded-lg font-medium',
                  checkMsg.type === 'success'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-800/40'
                    : 'bg-red-500/10 text-red-400 border border-red-800/40'
                )}
              >
                {checkMsg.text}
              </span>
            )}

            {!isCheckedOut ? (
              <button
                onClick={handleCheckInOut}
                disabled={checking}
                className={cn(
                  'btn-primary flex items-center gap-2',
                  isCheckedIn ? 'bg-amber-600 hover:bg-amber-500 text-white' : 'bg-[#3b6ef0]'
                )}
              >
                {checking ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isCheckedIn ? (
                  <>
                    <LogOut className="w-4 h-4" />
                    Check-Out Now
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    Check-In Now
                  </>
                )}
              </button>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-800/30">
                <CheckCircle className="w-4 h-4" />
                Checked Out ({format(new Date(todayRecord!.checkOut!), 'HH:mm')})
              </div>
            )}
          </div>
        </div>
      )}

      {/* Attendance Records Table */}
      <div className="section-card">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a2d3e] flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#3b6ef0]" />
            <h2 className="text-sm font-semibold text-white">Daily Attendance Log</h2>
          </div>
          <div className="flex items-center gap-3">
            {isManager && (
              <button
                type="button"
                onClick={() => {
                  setShowSyncModal(true);
                  setSyncFeedback(null);
                }}
                className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5 text-yellow-400" />
                Sync Working Schedule
              </button>
            )}
            <p className="text-xs text-[#4b5563]">{records.length} records</p>
          </div>
        </div>

        {records.length === 0 ? (
          <div className="py-16 text-center">
            <Clock className="w-10 h-10 text-[#2a2d3e] mx-auto mb-3" />
            <p className="text-[#4b5563] text-sm">No attendance records found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Date</th>
                  <th>Check-In</th>
                  <th>Check-Out</th>
                  <th>Worked Hours</th>
                  <th>Exceptions</th>
                  <th>Status</th>
                  {isManager && <th className="text-right">Action</th>}
                </tr>
              </thead>
              <tbody>
                {records.map((r) => {
                  const checkInTime = r.checkIn ? new Date(r.checkIn) : null;
                  const checkOutTime = r.checkOut ? new Date(r.checkOut) : null;

                  // Exception detection
                  const isLate = checkInTime && (checkInTime.getHours() > 9 || (checkInTime.getHours() === 9 && checkInTime.getMinutes() > 15));
                  const isMissingCheckOut = checkInTime && !checkOutTime && r.status === 'present';
                  const isManuallyAdjusted = r.notes?.includes('Manually adjusted');

                  return (
                    <tr
                      key={r.id}
                      onClick={() => router.push(`/attendance/${r.id}`)}
                      className="hover:bg-[#1f2438]/50 transition-colors cursor-pointer group"
                    >
                      <td>
                        <p className="font-medium text-white group-hover:text-[#3b6ef0] transition-colors">
                          {r.employee.firstName} {r.employee.lastName}
                        </p>
                        <p className="text-xs text-[#4b5563]">{r.employee.employeeCode}</p>
                      </td>
                      <td className="text-xs text-[#6b7280] font-mono">{formatDate(r.attendanceDate)}</td>
                      <td className="text-xs text-white font-mono">
                        {checkInTime ? format(checkInTime, 'HH:mm') : '—'}
                      </td>
                      <td className="text-xs text-white font-mono">
                        {checkOutTime ? format(checkOutTime, 'HH:mm') : '—'}
                      </td>
                      <td className="font-mono text-xs text-white font-bold">
                        {parseFloat(r.workedHours?.toString() ?? '0')}h
                      </td>
                      <td>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {isMissingCheckOut && (
                            <span className="status-pill bg-red-500/10 text-red-400 border border-red-800/40">
                              Missing Check-Out
                            </span>
                          )}
                          {isLate && (
                            <span className="status-pill bg-yellow-500/10 text-yellow-400 border border-yellow-800/40">
                              Late Arrival
                            </span>
                          )}
                          {isManuallyAdjusted && (
                            <span className="status-pill bg-blue-500/10 text-blue-400 border border-blue-800/40 flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3" />
                              Adjusted
                            </span>
                          )}
                          {!isMissingCheckOut && !isLate && !isManuallyAdjusted && (
                            <span className="text-xs text-[#4b5563]">Normal</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span
                          className={cn(
                            'status-pill',
                            r.status === 'present'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-800/40'
                              : r.status === 'half_day'
                              ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-800/40'
                              : 'bg-red-500/10 text-red-400 border border-red-800/40'
                          )}
                        >
                          {snakeToTitle(r.status)}
                        </span>
                      </td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isManager && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openCorrectionDrawer(r);
                              }}
                              className="inline-flex items-center gap-1 text-xs text-[#3b6ef0] hover:text-[#5887ff] font-medium transition-colors px-2 py-1 rounded hover:bg-[#3b6ef0]/10"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              Correct
                            </button>
                          )}
                          <Link
                            href={`/attendance/${r.id}`}
                            className="p-1 rounded text-[#6b7280] hover:text-white transition-colors"
                            title="View Attendance Details"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Attendance Correction Drawer Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex justify-end animate-fade-in">
          <div className="w-full max-w-md bg-[#0d0f14] border-l border-[#1e2235] h-full overflow-y-auto p-6 flex flex-col justify-between shadow-2xl">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-[#1e2235] mb-5">
                <div>
                  <h3 className="text-base font-bold text-white">Attendance Correction</h3>
                  <p className="text-xs text-[#6b7280] mt-0.5">
                    {selectedRecord.employee.firstName} {selectedRecord.employee.lastName} ·{' '}
                    {formatDate(selectedRecord.attendanceDate)}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedRecord(null)}
                  className="p-1 rounded-lg text-[#6b7280] hover:text-white hover:bg-[#1e2235]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {correctionError && (
                <div className="p-3 bg-red-500/10 border border-red-800/40 text-red-400 text-xs rounded-xl mb-4">
                  {correctionError}
                </div>
              )}

              {/* Original Values Box */}
              <div className="bg-[#111318] p-3.5 rounded-xl border border-[#2a2d3e] space-y-2 text-xs mb-5">
                <p className="font-semibold text-[#9ca3af] uppercase tracking-wider text-[10px]">
                  Current Recorded Values
                </p>
                <div className="grid grid-cols-3 gap-2 pt-1 text-white">
                  <div>
                    <span className="text-[#4b5563] block">In:</span>
                    {selectedRecord.checkIn ? format(new Date(selectedRecord.checkIn), 'HH:mm') : 'None'}
                  </div>
                  <div>
                    <span className="text-[#4b5563] block">Out:</span>
                    {selectedRecord.checkOut ? format(new Date(selectedRecord.checkOut), 'HH:mm') : 'None'}
                  </div>
                  <div>
                    <span className="text-[#4b5563] block">Worked:</span>
                    {selectedRecord.workedHours ? `${selectedRecord.workedHours}h` : '0h'}
                  </div>
                </div>
              </div>

              {/* Form */}
              <form id="correction-form" onSubmit={handleSaveCorrection} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-[#9ca3af] mb-1">Corrected Check-In</label>
                  <input
                    type="datetime-local"
                    value={correctedCheckIn}
                    onChange={(e) => setCorrectedCheckIn(e.target.value)}
                    className="form-input text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#9ca3af] mb-1">Corrected Check-Out</label>
                  <input
                    type="datetime-local"
                    value={correctedCheckOut}
                    onChange={(e) => setCorrectedCheckOut(e.target.value)}
                    className="form-input text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#9ca3af] mb-1">Corrected Worked Hours *</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="24"
                    required
                    value={correctedHours}
                    onChange={(e) => setCorrectedHours(e.target.value)}
                    className="form-input text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#9ca3af] mb-1">
                    Correction Reason (Required) *
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder="e.g. System login issue / Card reader offline / Authorized remote work"
                    value={correctionReason}
                    onChange={(e) => setCorrectionReason(e.target.value)}
                    className="form-input text-xs resize-none"
                  />
                </div>
              </form>
            </div>

            <div className="pt-4 border-t border-[#1e2235] flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="px-4 py-2 text-xs text-[#9ca3af] hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="correction-form"
                disabled={savingCorrection}
                className="btn-primary text-xs"
              >
                {savingCorrection ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Saving Audit...
                  </>
                ) : (
                  'Save & Apply Audit'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sync Working Schedule Modal */}
      {showSyncModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-[#181b24] border border-[#2a2d3e] rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-[#2a2d3e] pb-3">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-400" />
                <h3 className="font-semibold text-white text-base">Sync Schedule Attendance</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSyncModal(false)}
                className="text-[#9ca3af] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[#9ca3af] leading-relaxed">
              Auto-generate standard schedule logs (Mon–Fri 8h or employee custom schedule lines)
              for all active employees in this period, preserving approved leaves and existing manual logs.
            </p>

            <form id="sync-schedule-form" onSubmit={handleSyncSchedule} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#e2e8f0] mb-1.5">From Date</label>
                <input
                  type="date"
                  required
                  value={syncStartDate}
                  onChange={(e) => setSyncStartDate(e.target.value)}
                  className="form-input text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#e2e8f0] mb-1.5">To Date</label>
                <input
                  type="date"
                  required
                  value={syncEndDate}
                  onChange={(e) => setSyncEndDate(e.target.value)}
                  className="form-input text-xs"
                />
              </div>

              {syncFeedback && (
                <div
                  className={cn(
                    'text-xs px-3 py-2 rounded-lg border',
                    syncFeedback.isError
                      ? 'bg-red-500/10 border-red-800/40 text-red-400'
                      : 'bg-emerald-500/10 border-emerald-800/40 text-emerald-400'
                  )}
                >
                  {syncFeedback.message}
                </div>
              )}
            </form>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#2a2d3e]">
              <button
                type="button"
                onClick={() => setShowSyncModal(false)}
                className="px-4 py-2 text-xs text-[#9ca3af] hover:text-white"
              >
                Close
              </button>
              <button
                type="submit"
                form="sync-schedule-form"
                disabled={syncing}
                className="btn-primary text-xs"
              >
                {syncing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Synchronizing...
                  </>
                ) : (
                  'Run Synchronization'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
