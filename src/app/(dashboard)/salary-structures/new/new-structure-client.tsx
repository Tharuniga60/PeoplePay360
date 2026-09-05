'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export function NewStructureClient({ companyId }: { companyId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    const data = {
      companyId,
      name: formData.get('name'),
      code: formData.get('code'),
      description: formData.get('description') || undefined,
    };

    try {
      const res = await fetch('/api/salary-structures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const j = await res.json();
        setError(j.error || 'Failed to create structure');
      } else {
        const j = await res.json();
        router.push(`/salary-structures/${j.data.id}`);
      }
    } catch {
      setError('Unexpected error');
    } finally {
      setLoading(false);
    }
  }

  const labelClass = 'block text-xs font-medium text-[#9ca3af] mb-1.5 uppercase tracking-wide';

  return (
    <form onSubmit={handleSubmit} className="section-card p-6 space-y-5 max-w-xl">
      {error && <div className="p-3 bg-red-500/10 border border-red-800/40 text-red-400 rounded-lg text-sm">{error}</div>}
      <div>
        <label className={labelClass}>Structure Name *</label>
        <input type="text" name="name" required className="form-input" placeholder="e.g. Standard Monthly" />
      </div>
      <div>
        <label className={labelClass}>Code * (unique short identifier)</label>
        <input type="text" name="code" required className="form-input" placeholder="e.g. STD-MONTHLY" />
      </div>
      <div>
        <label className={labelClass}>Description</label>
        <textarea name="description" rows={3} className="form-input resize-none" placeholder="Optional description..." />
      </div>
      <div className="flex justify-end gap-3 pt-3 border-t border-[#2a2d3e]">
        <button type="button" onClick={() => router.back()} className="px-4 py-2 text-sm text-[#9ca3af] hover:text-white">Cancel</button>
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Creating...</> : 'Create Structure'}
        </button>
      </div>
    </form>
  );
}
