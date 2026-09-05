'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Archive, RotateCcw, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmployeeArchiveButtonProps {
  employeeId: string;
  isActive: boolean;
}

export function EmployeeArchiveButton({ employeeId, isActive }: EmployeeArchiveButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleToggle() {
    const action = isActive ? 'archive' : 'reactivate';
    if (!confirm(`Are you sure you want to ${action} this employee record?`)) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/employees/${employeeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || `Failed to ${action} employee`);
        return;
      }

      router.refresh();
    } catch (err: any) {
      alert(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      disabled={loading}
      onClick={handleToggle}
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
        isActive
          ? 'bg-red-500/10 text-red-400 border-red-800/40 hover:bg-red-500/20'
          : 'bg-emerald-500/10 text-emerald-400 border-emerald-800/40 hover:bg-emerald-500/20'
      )}
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : isActive ? (
        <Archive className="w-3.5 h-3.5" />
      ) : (
        <RotateCcw className="w-3.5 h-3.5" />
      )}
      {isActive ? 'Archive Employee' : 'Reactivate Employee'}
    </button>
  );
}
