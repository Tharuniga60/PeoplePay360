'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Clock,
  Users,
  Save,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  Search,
  Check,
  Building2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

interface ScheduleLine {
  id?: string;
  dayOfWeek: typeof DAYS[number];
  workFrom: string;
  workTo: string;
  breakDurationMinutes: number;
  isWorkingDay: boolean;
}

interface ScheduleDetailProps {
  schedule: any;
  allEmployees: any[];
  canManage: boolean;
}

export function ScheduleDetailClient({
  schedule: initialSchedule,
  allEmployees,
  canManage,
}: ScheduleDetailProps) {
  const router = useRouter();
  const [schedule, setSchedule] = useState(initialSchedule);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState(schedule.name);
  const [timezone, setTimezone] = useState(schedule.timezone);
  const [isActive, setIsActive] = useState(schedule.isActive);

  // Reconcile lines with all 7 days
  const existingLines = schedule.scheduleLines || [];
  const initialLines: ScheduleLine[] = DAYS.map((day) => {
    const found = existingLines.find((l: any) => l.dayOfWeek === day);
    if (found) {
      return {
        id: found.id,
        dayOfWeek: day,
        workFrom: found.workFrom ? found.workFrom.slice(0, 5) : '09:00',
        workTo: found.workTo ? found.workTo.slice(0, 5) : '18:00',
        breakDurationMinutes: found.breakDurationMinutes ?? 60,
        isWorkingDay: found.isWorkingDay ?? true,
      };
    }
    return {
      dayOfWeek: day,
      workFrom: '09:00',
      workTo: '18:00',
      breakDurationMinutes: 60,
      isWorkingDay: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].includes(day),
    };
  });

  const [lines, setLines] = useState<ScheduleLine[]>(initialLines);

  // Assign modal state
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [selectedEmpIds, setSelectedEmpIds] = useState<string[]>([]);
  const [assigning, setAssigning] = useState(false);

  function updateLine(idx: number, field: keyof ScheduleLine, value: any) {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, [field]: value } : l)));
  }

  function calcHours(line: ScheduleLine): number {
    if (!line.isWorkingDay) return 0;
    const [fh, fm] = line.workFrom.split(':').map(Number);
    const [th, tm] = line.workTo.split(':').map(Number);
    const total = th * 60 + tm - (fh * 60 + fm) - line.breakDurationMinutes;
    return Math.max(0, total / 60);
  }

  const computedWeeklyHours = lines.reduce((sum, l) => sum + calcHours(l), 0);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/working-schedules/${schedule.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          timezone,
          isActive,
          hoursPerWeek: parseFloat(computedWeeklyHours.toFixed(2)),
          lines,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update schedule');

      setSchedule(data.data);
      setSuccess('Working schedule saved successfully.');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this working schedule?')) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/working-schedules/${schedule.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete schedule');

      router.push('/working-schedules');
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  }

  async function handleMassAssign() {
    if (selectedEmpIds.length === 0) return;
    setAssigning(true);
    setError(null);

    try {
      const res = await fetch(`/api/working-schedules/${schedule.id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeIds: selectedEmpIds }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to assign schedule');

      setSuccess(data.message);
      setIsAssignModalOpen(false);
      setSelectedEmpIds([]);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAssigning(false);
    }
  }

  const filteredEmployees = allEmployees.filter((emp) => {
    const fullName = `${emp.firstName} ${emp.lastName}`.toLowerCase();
    const code = emp.employeeCode.toLowerCase();
    const dept = emp.department?.name?.toLowerCase() || '';
    const q = employeeSearch.toLowerCase();
    return fullName.includes(q) || code.includes(q) || dept.includes(q);
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Link
            href="/working-schedules"
            className="p-2 rounded-xl bg-[#1e2235] hover:bg-[#2a2d3e] text-[#a0aec0] hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white tracking-tight">{schedule.name}</h1>
              <span
                className={cn(
                  'status-pill',
                  schedule.isActive
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-800/40'
                    : 'bg-red-500/10 text-red-400 border border-red-800/40'
                )}
              >
                {schedule.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <p className="text-xs text-[#6b7280] mt-0.5">
              {computedWeeklyHours.toFixed(1)} hrs/week · Timezone: {schedule.timezone}
            </p>
          </div>
        </div>

        {canManage && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsAssignModalOpen(true)}
              className="btn-primary inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white"
            >
              <Users className="w-4 h-4" />
              Assign to Employees
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={handleDelete}
              className="p-2 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors"
              title="Delete Schedule"
            >
              <Trash2 className="w-4 h-4" />
            </button>
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

      {/* Schedule Form */}
      <form onSubmit={handleSave} className="space-y-6">
        <div className="section-card p-6 space-y-4">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2 border-b border-[#2a2d3e] pb-3">
            <Clock className="w-4 h-4 text-blue-400" />
            Schedule Configuration
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="form-label">Schedule Name</label>
              <input
                type="text"
                disabled={!canManage}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="form-input w-full"
                required
              />
            </div>
            <div>
              <label className="form-label">Timezone</label>
              <input
                type="text"
                disabled={!canManage}
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="form-input w-full"
                required
              />
            </div>
            <div>
              <label className="form-label">Active Status</label>
              <div className="flex items-center h-10">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={!canManage}
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-4 h-4 rounded border-[#374151] text-[#3b6ef0] bg-[#1e2235]"
                  />
                  <span className="text-sm text-[#e2e8f0]">Active for contract assignment</span>
                </label>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-[#2a2d3e]">
            <p className="text-xs text-[#6b7280]">Computed Weekly Worked Hours:</p>
            <p className="text-xl font-bold text-blue-400 font-mono">
              {computedWeeklyHours.toFixed(2)}h / week
            </p>
          </div>
        </div>

        {/* Daily Schedule Table */}
        <div className="section-card overflow-hidden">
          <div className="px-6 py-4 border-b border-[#2a2d3e] flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-white">Daily Working Hours</h2>
              <p className="text-xs text-[#6b7280] mt-0.5">
                Check-in, check-out, and lunch/break allowance for each day of the week
              </p>
            </div>
          </div>

          <div className="divide-y divide-[#1e2235]">
            {lines.map((line, idx) => (
              <div
                key={line.dayOfWeek}
                className={cn(
                  'flex items-center gap-4 px-6 py-3.5 transition-colors',
                  !line.isWorkingDay ? 'opacity-40 bg-[#12141c]' : 'bg-[#1a1d26]'
                )}
              >
                <input
                  type="checkbox"
                  disabled={!canManage}
                  checked={line.isWorkingDay}
                  onChange={(e) => updateLine(idx, 'isWorkingDay', e.target.checked)}
                  className="w-4 h-4 rounded border-[#374151] text-[#3b6ef0] bg-[#1e2235]"
                />
                <span className="w-28 text-sm font-semibold text-white capitalize">
                  {line.dayOfWeek}
                </span>

                <div className="flex items-center gap-3 flex-1 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-[#6b7280]">Work:</span>
                    <input
                      type="time"
                      disabled={!line.isWorkingDay || !canManage}
                      value={line.workFrom}
                      onChange={(e) => updateLine(idx, 'workFrom', e.target.value)}
                      className="form-input py-1.5 text-xs w-28"
                    />
                    <span className="text-xs text-[#6b7280]">to</span>
                    <input
                      type="time"
                      disabled={!line.isWorkingDay || !canManage}
                      value={line.workTo}
                      onChange={(e) => updateLine(idx, 'workTo', e.target.value)}
                      className="form-input py-1.5 text-xs w-28"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 ml-4">
                    <span className="text-xs text-[#6b7280]">Break:</span>
                    <input
                      type="number"
                      disabled={!line.isWorkingDay || !canManage}
                      value={line.breakDurationMinutes}
                      onChange={(e) =>
                        updateLine(idx, 'breakDurationMinutes', parseInt(e.target.value) || 0)
                      }
                      className="form-input py-1.5 text-xs w-20 text-center"
                      min="0"
                      max="180"
                    />
                    <span className="text-xs text-[#6b7280]">min</span>
                  </div>
                </div>

                <div className="w-24 text-right">
                  {line.isWorkingDay ? (
                    <span className="text-sm font-mono font-bold text-blue-400">
                      {calcHours(line).toFixed(1)}h
                    </span>
                  ) : (
                    <span className="text-xs text-[#4b5563]">Off Day</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {canManage && (
          <div className="flex justify-end">
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
      </form>

      {/* Mass Assign Modal */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="section-card w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl border border-[#2a2d3e]">
            {/* Modal Header */}
            <div className="p-5 border-b border-[#2a2d3e] flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-400" />
                  Assign Working Schedule to Employees
                </h3>
                <p className="text-xs text-[#6b7280] mt-0.5">
                  Selected employees will have their default schedule and active contracts updated to {schedule.name}.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAssignModalOpen(false)}
                className="p-1 rounded-lg text-[#6b7280] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search & Select All */}
            <div className="p-4 border-b border-[#2a2d3e] flex items-center justify-between gap-4">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[#6b7280] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by name, employee code, or department..."
                  value={employeeSearch}
                  onChange={(e) => setEmployeeSearch(e.target.value)}
                  className="form-input pl-9 py-2 text-xs w-full"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  if (selectedEmpIds.length === filteredEmployees.length) {
                    setSelectedEmpIds([]);
                  } else {
                    setSelectedEmpIds(filteredEmployees.map((e) => e.id));
                  }
                }}
                className="btn-secondary text-xs"
              >
                {selectedEmpIds.length === filteredEmployees.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            {/* Employee List */}
            <div className="flex-1 overflow-y-auto p-4 divide-y divide-[#1e2235]">
              {filteredEmployees.length === 0 ? (
                <p className="text-center py-8 text-xs text-[#6b7280]">No matching employees found.</p>
              ) : (
                filteredEmployees.map((emp) => {
                  const isSelected = selectedEmpIds.includes(emp.id);
                  return (
                    <label
                      key={emp.id}
                      className={cn(
                        'flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors',
                        isSelected ? 'bg-indigo-500/10 border border-indigo-500/30' : 'hover:bg-[#1e2235]'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedEmpIds((prev) => [...prev, emp.id]);
                            } else {
                              setSelectedEmpIds((prev) => prev.filter((id) => id !== emp.id));
                            }
                          }}
                          className="w-4 h-4 rounded border-[#374151] text-indigo-500 bg-[#1e2235]"
                        />
                        <div>
                          <p className="text-xs font-semibold text-white">
                            {emp.firstName} {emp.lastName}
                          </p>
                          <p className="text-[11px] text-[#6b7280]">
                            {emp.employeeCode} · {emp.department?.name || 'No Dept'} ·{' '}
                            {emp.jobPosition?.name || 'No Position'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-[#4b5563]">
                          Current: {emp.defaultSchedule?.name || 'None'}
                        </span>
                      </div>
                    </label>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#2a2d3e] flex items-center justify-between">
              <span className="text-xs text-[#a0aec0]">
                {selectedEmpIds.length} employee(s) selected
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={selectedEmpIds.length === 0 || assigning}
                  onClick={handleMassAssign}
                  className="btn-primary text-xs bg-indigo-600 hover:bg-indigo-500 text-white"
                >
                  {assigning ? 'Assigning...' : `Assign to ${selectedEmpIds.length} Employee(s)`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
