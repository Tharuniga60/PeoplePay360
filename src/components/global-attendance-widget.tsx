'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Clock, Play, StopCircle, CheckCircle2, ChevronDown, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export function GlobalAttendanceWidget() {
  const { data: session } = useSession();
  const router = useRouter();
  const [attendance, setAttendance] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [showPopup, setShowPopup] = useState(false);

  const employeeId = session?.user?.employeeId;

  // Fetch today's attendance status
  async function fetchStatus() {
    if (!employeeId) {
      setFetching(false);
      return;
    }
    try {
      const res = await fetch('/api/attendance/check-in');
      if (res.ok) {
        const j = await res.json();
        setAttendance(j.data);
      }
    } catch (e) {
      console.error('Failed to fetch attendance status', e);
    } finally {
      setFetching(false);
    }
  }

  useEffect(() => {
    fetchStatus();
  }, [employeeId]);

  // Live timer tick
  useEffect(() => {
    if (!attendance?.checkIn || attendance?.checkOut) {
      setElapsedSeconds(0);
      return;
    }

    const checkInTime = new Date(attendance.checkIn).getTime();

    function tick() {
      const now = Date.now();
      const diffSec = Math.max(0, Math.floor((now - checkInTime) / 1000));
      setElapsedSeconds(diffSec);
    }

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [attendance]);

  // Format elapsed seconds as HH:MM:SS
  function formatElapsed(sec: number) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  async function handleToggleAttendance() {
    if (!employeeId) return;
    setLoading(true);

    try {
      const res = await fetch('/api/attendance/check-in', {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to update attendance');
        return;
      }
      setAttendance(data.data);
      router.refresh();
    } catch (err: any) {
      alert(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  if (!employeeId || fetching) return null;

  const isCheckedIn = Boolean(attendance?.checkIn && !attendance?.checkOut);
  const isCompleted = Boolean(attendance?.checkIn && attendance?.checkOut);

  return (
    <div className="relative flex items-center gap-2">
      {/* Elapsed Timer when active */}
      {isCheckedIn && (
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>{formatElapsed(elapsedSeconds)}</span>
        </div>
      )}

      {/* Main Action Button */}
      {!isCompleted ? (
        <button
          type="button"
          disabled={loading}
          onClick={handleToggleAttendance}
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-sm',
            isCheckedIn
              ? 'bg-amber-600 hover:bg-amber-500 text-white'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white'
          )}
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : isCheckedIn ? (
            <>
              <StopCircle className="w-3.5 h-3.5" />
              <span>Check Out</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5" />
              <span>Check In</span>
            </>
          )}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setShowPopup(!showPopup)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[#1e2235] text-[#a0aec0] border border-[#2a2d3e] hover:text-white"
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
          <span>Worked {attendance.workedHours || '8'}h</span>
          <ChevronDown className="w-3 h-3 text-[#6b7280]" />
        </button>
      )}

      {/* Popover Card */}
      {showPopup && (
        <div className="absolute right-0 top-full mt-2 w-64 p-4 rounded-xl bg-[#141720] border border-[#2a2d3e] shadow-2xl z-50 animate-fade-in text-xs space-y-2.5">
          <div className="flex items-center justify-between border-b border-[#2a2d3e] pb-2">
            <span className="font-semibold text-white">Today's Attendance</span>
            <span className="text-[#6b7280]">{format(new Date(), 'MMM dd, yyyy')}</span>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between">
              <span className="text-[#6b7280]">Check In:</span>
              <span className="font-mono text-white">
                {attendance?.checkIn ? format(new Date(attendance.checkIn), 'hh:mm:ss a') : '—'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6b7280]">Check Out:</span>
              <span className="font-mono text-white">
                {attendance?.checkOut ? format(new Date(attendance.checkOut), 'hh:mm:ss a') : isCheckedIn ? 'In Progress' : '—'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6b7280]">Status:</span>
              <span className="capitalize font-medium text-emerald-400">{attendance?.status || 'Present'}</span>
            </div>
            {attendance?.workedHours && (
              <div className="flex justify-between pt-1 border-t border-[#1e2235]">
                <span className="text-[#6b7280]">Total Worked:</span>
                <span className="font-mono font-bold text-white">{attendance.workedHours} hrs</span>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              setShowPopup(false);
              router.push('/attendance');
            }}
            className="w-full text-center py-1.5 rounded-lg bg-[#1e2235] hover:bg-[#2a2d3e] text-blue-400 font-medium transition-colors"
          >
            View Full Attendance Log →
          </button>
        </div>
      )}
    </div>
  );
}
