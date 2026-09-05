'use client';

import { useState } from 'react';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface LeaveActionsClientProps {
  leaveId: string;
}

export function LeaveActionsClient({ leaveId }: LeaveActionsClientProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleAction(status: 'approved' | 'rejected') {
    setLoading(true);
    try {
      const res = await fetch(`/api/leaves?id=${leaveId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Failed to update leave request');
      } else {
        router.refresh();
      }
    } catch (error) {
      alert('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        disabled={loading}
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-800/40 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
        onClick={() => handleAction('approved')}
      >
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
        Approve
      </button>
      <button
        disabled={loading}
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-red-500/10 text-red-400 border border-red-800/40 hover:bg-red-500/20 transition-colors disabled:opacity-50"
        onClick={() => handleAction('rejected')}
      >
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
        Reject
      </button>
    </div>
  );
}
