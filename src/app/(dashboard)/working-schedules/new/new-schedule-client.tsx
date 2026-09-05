'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Plus, Trash2 } from 'lucide-react';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

interface ScheduleLine {
  dayOfWeek: typeof DAYS[number];
  workFrom: string;
  workTo: string;
  breakDurationMinutes: number;
  isWorkingDay: boolean;
}

const DEFAULT_LINES: ScheduleLine[] = [
  { dayOfWeek: 'monday', workFrom: '09:00', workTo: '18:00', breakDurationMinutes: 60, isWorkingDay: true },
  { dayOfWeek: 'tuesday', workFrom: '09:00', workTo: '18:00', breakDurationMinutes: 60, isWorkingDay: true },
  { dayOfWeek: 'wednesday', workFrom: '09:00', workTo: '18:00', breakDurationMinutes: 60, isWorkingDay: true },
  { dayOfWeek: 'thursday', workFrom: '09:00', workTo: '18:00', breakDurationMinutes: 60, isWorkingDay: true },
  { dayOfWeek: 'friday', workFrom: '09:00', workTo: '18:00', breakDurationMinutes: 60, isWorkingDay: true },
  { dayOfWeek: 'saturday', workFrom: '09:00', workTo: '13:00', breakDurationMinutes: 0, isWorkingDay: false },
  { dayOfWeek: 'sunday', workFrom: '09:00', workTo: '18:00', breakDurationMinutes: 60, isWorkingDay: false },
];

export function NewScheduleClient({ companyId }: { companyId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lines, setLines] = useState<ScheduleLine[]>(DEFAULT_LINES);

  function updateLine(idx: number, field: keyof ScheduleLine, value: string | number | boolean) {
    setLines((prev) => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l));
  }

  function calcHours(line: ScheduleLine): number {
    if (!line.isWorkingDay) return 0;
    const [fh, fm] = line.workFrom.split(':').map(Number);
    const [th, tm] = line.workTo.split(':').map(Number);
    const total = (th * 60 + tm) - (fh * 60 + fm) - line.breakDurationMinutes;
    return Math.max(0, total / 60);
  }

  const totalWeeklyHours = lines.reduce((sum, l) => sum + calcHours(l), 0);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const formData = new FormData(e.currentTarget);

    const schedData = {
      companyId,
      name: formData.get('name'),
      hoursPerWeek: parseFloat(totalWeeklyHours.toFixed(2)),
      timezone: formData.get('timezone') || 'Asia/Kolkata',
    };

    try {
      const res = await fetch('/api/working-schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(schedData),
      });
      if (!res.ok) {
        const j = await res.json();
        setError(j.error || 'Failed to create schedule');
        setLoading(false);
        return;
      }
      const { data: schedule } = await res.json();

      // Create schedule lines
      const workingLines = lines.filter((l) => l.isWorkingDay);
      if (workingLines.length > 0) {
        await fetch(`/api/working-schedules/${schedule.id}/lines`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(workingLines.map((l) => ({
            scheduleId: schedule.id,
            dayOfWeek: l.dayOfWeek,
            workFrom: l.workFrom,
            workTo: l.workTo,
            breakDurationMinutes: l.breakDurationMinutes,
            isWorkingDay: true,
          }))),
        });
      }

      router.push('/working-schedules');
    } catch {
      setError('Unexpected error');
    } finally {
      setLoading(false);
    }
  }

  const labelClass = 'block text-xs font-medium text-[#9ca3af] mb-1.5 uppercase tracking-wide';

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-3xl">
      {error && <div className="p-3 bg-red-500/10 border border-red-800/40 text-red-400 rounded-lg text-sm">{error}</div>}

      <div className="section-card p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Schedule Name *</label>
            <input type="text" name="name" required className="form-input" placeholder="e.g. Standard 40h/week" />
          </div>
          <div>
            <label className={labelClass}>Timezone</label>
            <input type="text" name="timezone" defaultValue="Asia/Kolkata" className="form-input" />
          </div>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-[#2a2d3e]">
          <p className="text-xs text-[#4b5563]">Auto-calculated weekly hours:</p>
          <p className="text-lg font-bold text-[#3b6ef0]">{totalWeeklyHours.toFixed(2)}h/week</p>
        </div>
      </div>

      {/* Day Lines */}
      <div className="section-card overflow-hidden">
        <div className="px-5 py-4 border-b border-[#2a2d3e]">
          <h2 className="text-sm font-semibold text-white">Daily Schedule</h2>
          <p className="text-xs text-[#4b5563] mt-0.5">Toggle days on/off and set work hours</p>
        </div>
        <div className="divide-y divide-[#1e2235]">
          {lines.map((line, idx) => (
            <div key={line.dayOfWeek} className={`flex items-center gap-4 px-5 py-3 ${!line.isWorkingDay ? 'opacity-50' : ''}`}>
              <input
                type="checkbox"
                checked={line.isWorkingDay}
                onChange={(e) => updateLine(idx, 'isWorkingDay', e.target.checked)}
                className="w-4 h-4 rounded border-[#374151] text-[#3b6ef0] bg-[#1e2235]"
              />
              <span className="w-24 text-sm font-medium text-white capitalize">{line.dayOfWeek}</span>
              <div className="flex items-center gap-2 flex-1">
                <input
                  type="time"
                  value={line.workFrom}
                  disabled={!line.isWorkingDay}
                  onChange={(e) => updateLine(idx, 'workFrom', e.target.value)}
                  className="form-input py-1.5 text-xs w-28"
                />
                <span className="text-[#374151] text-xs">to</span>
                <input
                  type="time"
                  value={line.workTo}
                  disabled={!line.isWorkingDay}
                  onChange={(e) => updateLine(idx, 'workTo', e.target.value)}
                  className="form-input py-1.5 text-xs w-28"
                />
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    value={line.breakDurationMinutes}
                    disabled={!line.isWorkingDay}
                    onChange={(e) => updateLine(idx, 'breakDurationMinutes', parseInt(e.target.value) || 0)}
                    className="form-input py-1.5 text-xs w-20 text-center"
                    min="0"
                    max="120"
                  />
                  <span className="text-xs text-[#4b5563]">min break</span>
                </div>
              </div>
              {line.isWorkingDay && (
                <span className="text-sm font-medium text-[#3b6ef0] w-12 text-right">
                  {calcHours(line).toFixed(1)}h
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <button type="button" onClick={() => router.back()} className="px-4 py-2 text-sm text-[#9ca3af] hover:text-white">Cancel</button>
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Creating...</> : 'Create Schedule'}
        </button>
      </div>
    </form>
  );
}
